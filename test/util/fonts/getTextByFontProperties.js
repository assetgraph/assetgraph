var expect = require('../../unexpected-with-plugins').clone();
var AssetGraph = require('../../../lib');
var getTextByFontProp = require('../../../lib/util/fonts/getTextByFontProperties');

expect.addAssertion('<string> to [exhaustively] satisfy computed font properties <array>', function (expect, subject, result) {
    expect.subjectOutput = function (output) {
        output.code(subject, 'text/html');
    };
    return new AssetGraph({})
        .loadAssets(new AssetGraph.Html({
            text: subject
        }))
        .populate({ followRelations: { crossorigin: false } })
        .then(function (assetGraph) {
            expect(getTextByFontProp(assetGraph.findAssets({type: 'Html'})[0]), 'to [exhaustively] satisfy', result);
        });
});

describe('lib/util/fonts/getTextByFontProperties', function () {
    it('should strip empty text nodes', function () {
        var htmlText = [
            '  <div>div</div>   <span></span>  '
        ].join('\n');

        return expect(htmlText, 'to exhaustively satisfy computed font properties', [
            {
                text: 'div',
                props: {
                    'font-family': undefined,
                    'font-weight': 400,
                    'font-style': 'normal'
                }
            }
        ]);
    });

    it('should apply inline style attribute values', function () {
        var htmlText = [
            '<div style="font-weight: bold">div</div>'
        ].join('\n');

        return expect(htmlText, 'to exhaustively satisfy computed font properties', [
            {
                text: 'div',
                props: {
                    'font-family': undefined,
                    'font-weight': 700,
                    'font-style': 'normal'
                }
            }
        ]);
    });

    it('should apply stylesheet attribute values', function () {
        var htmlText = [
            '<style>div { font-weight: bold; }</style>',
            '<div>div</div>'
        ].join('\n');

        return expect(htmlText, 'to exhaustively satisfy computed font properties', [
            {
                text: 'div',
                props: {
                    'font-family': undefined,
                    'font-weight': 700,
                    'font-style': 'normal'
                }
            }
        ]);
    });

    it('should apply default browser styles', function () {
        var htmlText = [
            '<div>div</div><strong>strong</strong><em>em</em>'
        ].join('\n');

        return expect(htmlText, 'to exhaustively satisfy computed font properties', [
            {
                text: 'div',
                props: {
                    'font-family': undefined,
                    'font-weight': 400,
                    'font-style': 'normal'
                }
            },
            {
                text: 'strong',
                props: {
                    'font-family': undefined,
                    'font-weight': 700,
                    'font-style': 'normal'
                }
            },
            {
                text: 'em',
                props: {
                    'font-family': undefined,
                    'font-weight': 400,
                    'font-style': 'italic'
                }
            }
        ]);
    });

    it('should unquote single quoted font-family', function () {
        var htmlText = [
            '<style>body { font-family: \'font 1\'; }</style>',
            'text'
        ].join('\n');

        return expect(htmlText, 'to exhaustively satisfy computed font properties', [
            {
                text: 'text',
                props: {
                    'font-family': 'font 1',
                    'font-weight': 400,
                    'font-style': 'normal'
                }
            }
        ]);
    });

    it('should unquote double quoted font-family', function () {
        var htmlText = [
            '<style>body { font-family: "font 1"; }</style>',
            'text'
        ].join('\n');

        return expect(htmlText, 'to exhaustively satisfy computed font properties', [
            {
                text: 'text',
                props: {
                    'font-family': 'font 1',
                    'font-weight': 400,
                    'font-style': 'normal'
                }
            }
        ]);
    });


    it('should return font-weight as a number', function () {
        var htmlText = [
            '<style>body { font-weight: 500; }</style>',
            'text'
        ].join('\n');

        return expect(htmlText, 'to exhaustively satisfy computed font properties', [
            {
                text: 'text',
                props: {
                    'font-family': undefined,
                    'font-weight': 500,
                    'font-style': 'normal'
                }
            }
        ]);
    });

    describe('specificity', function () {
        it('stylesheets should override browser defaults', function () {
            var htmlText = [
                '<style>h1 { font-weight: normal; }</style>',
                '<h1>h1</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'h1',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('style attributes should override stylesheets', function () {
            var htmlText = [
                '<style>div { font-weight: bold; }</style>',
                '<div style="font-weight: normal">div</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'div',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('redefined properties in the same rule should override previous ones', function () {
            var htmlText = [
                '<style>div { font-weight: bold; font-weight: light }</style>',
                '<div>div</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'div',
                    props: {
                        'font-family': undefined,
                        'font-weight': 300,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('higher specificity selectors should override lower ones', function () {
            var htmlText = [
                '<style>.all {font-weight: light} div { font-weight: bold; }</style>',
                '<div class="all">div</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'div',
                    props: {
                        'font-family': undefined,
                        'font-weight': 300,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('last selector of equal specificity should override previous ones', function () {
            var htmlText = [
                '<style>div {font-weight: light} div { font-weight: bold; }</style>',
                '<div>div</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'div',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('!important should override specificity in stylesheets', function () {
            var htmlText = [
                '<style>.all {font-weight: light} div { font-weight: bold !important; }</style>',
                '<div class="all">div</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'div',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('!important in stylesheet should override style attribute', function () {
            var htmlText = [
                '<style>div { font-weight: bold !important; }</style>',
                '<div style="font-weight: light">div</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'div',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('!important in style attribute should override !important in stylesheet', function () {
            var htmlText = [
                '<style>div { font-weight: bold !important; }</style>',
                '<div style="font-weight: light !important">div</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'div',
                    props: {
                        'font-family': undefined,
                        'font-weight': 300,
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('inheritance', function () {
        it('should treat `inherit` values as undefined and traverse up to the parent', function () {
            var htmlText = [
                '<style>h1 { font-family: font1; } span { font-family: inherit; }</style>',
                '<h1>foo <span>bar</span></h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('default non-inheritance form elements should not inherit styles from parents', function () {
            var htmlText = [
                '<style>body { font-family: font1; }</style>',
                '<button>button</button>',
                '<option>option</option>',
                '<textarea>textarea</textarea>',
                '<input value="input">'
            ].join('\n');

            return expect(htmlText, 'to satisfy computed font properties', [
                { props: { 'font-family': undefined, 'font-weight': 400, 'font-style': 'normal' }, text: 'button' },
                { props: { 'font-family': undefined, 'font-weight': 400, 'font-style': 'normal' }, text: 'option' },
                { props: { 'font-family': undefined, 'font-weight': 400, 'font-style': 'normal' }, text: 'textarea' },
                { props: { 'font-family': undefined, 'font-weight': 400, 'font-style': 'normal' }, text: 'input' }
            ]);
        });

        it('default non-inheritance form elements should inherit styles for props with `inherit`-value', function () {
            var htmlText = [
                '<style>body { font-family: font1; font-style: italic } * { font-family: inherit } </style>',
                '<button>button</button>',
                '<select><option>option</option></select>',
                '<textarea>textarea</textarea>',
                '<input value="input">'
            ].join('\n');

            return expect(htmlText, 'to satisfy computed font properties', [
                { props: { 'font-family': 'font1', 'font-style': 'normal' }, text: 'button' },
                { props: { 'font-family': 'font1', 'font-style': 'normal' }, text: 'option' },
                { props: { 'font-family': 'font1', 'font-style': 'normal' }, text: 'textarea' },
                { props: { 'font-family': 'font1', 'font-style': 'normal' }, text: 'input' }
            ]);
        });
    });

    describe('non-textNode elements that show text', function () {
        it('should pick up <input> elements with visual values', function () {
            var htmlText = [
                '<style>input { font-family: font1; }</style>',
                '<input value="type:undefined">',
                '<input type="date" value="type:date">',
                '<input type="datetime-local" value="type:datetime-local">',
                '<input type="email" value="type:email">',
                '<input type="month" value="type:month">',
                '<input type="number" value="type:number">',
                '<input type="reset" value="type:reset">',
                '<input type="search" value="type:search">',
                '<input type="submit" value="type:submit">',
                '<input type="tel" value="type:tel">',
                '<input type="text" value="type:text">',
                '<input type="time" value="type:time">',
                '<input type="url" value="type:url">',
                '<input type="week" value="type:week">',
                '<input type="radio" value="type:radio">',
                '<input placeholder="placeholder">'
            ].join('\n');

            return expect(htmlText, 'to satisfy computed font properties', [
                { props: { 'font-family': 'font1' }, text: 'type:undefined' },
                { props: { 'font-family': 'font1' }, text: 'type:date' },
                { props: { 'font-family': 'font1' }, text: 'type:datetime-local' },
                { props: { 'font-family': 'font1' }, text: 'type:email' },
                { props: { 'font-family': 'font1' }, text: 'type:month' },
                { props: { 'font-family': 'font1' }, text: 'type:number' },
                { props: { 'font-family': 'font1' }, text: 'type:reset' },
                { props: { 'font-family': 'font1' }, text: 'type:search' },
                { props: { 'font-family': 'font1' }, text: 'type:submit' },
                { props: { 'font-family': 'font1' }, text: 'type:tel' },
                { props: { 'font-family': 'font1' }, text: 'type:text' },
                { props: { 'font-family': 'font1' }, text: 'type:time' },
                { props: { 'font-family': 'font1' }, text: 'type:url' },
                { props: { 'font-family': 'font1' }, text: 'type:week' },
                { props: { 'font-family': 'font1' }, text: 'placeholder' }
            ]);
        });
    });

    describe('`initial`-keyword', function () {
        it('should set initial values even when inheritance set other values', function () {

            var htmlText = [
                '<style>.all {font-weight: 900} span { font-weight: initial; }</style>',
                '<div class="all"><span>span</span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('`lighter`-keyword', function () {
        it('should return initial value with `lighter` modification', function () {
            var htmlText = [
                '<style>span { font-weight: lighter; }</style>',
                '<div><span>span</span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '400+lighter',
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should return inherited value with `lighter` modification', function () {
            var htmlText = [
                '<style>div { font-weight: 600; }</style>',
                '<style>span { font-weight: lighter; }</style>',
                '<div><span>span</span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '600+lighter',
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should return inherited value with multiple `lighter` modifications', function () {
            var htmlText = [
                '<style>div { font-weight: 900; }</style>',
                '<style>span { font-weight: lighter; }</style>',
                '<div><span><span>span</span></span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '900+lighter+lighter',
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('`bolder`-keyword', function () {
        it('should return initial value with `bolder` modification', function () {
            var htmlText = [
                '<style>span { font-weight: bolder; }</style>',
                '<div><span>span</span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '400+bolder',
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should return inherited value with `bolder` modification', function () {
            var htmlText = [
                '<style>div { font-weight: 600; }</style>',
                '<style>span { font-weight: bolder; }</style>',
                '<div><span>span</span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '600+bolder',
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should return inherited value with multiple `bolder` modifications', function () {
            var htmlText = [
                '<style>div { font-weight: 200; }</style>',
                '<style>span { font-weight: bolder; }</style>',
                '<div><span><span>span</span></span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '200+bolder+bolder',
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('`lighter` and `bolder` combinations', function () {
        it('should return inherited value with `bolder` and `lighter` modification', function () {
            var htmlText = [
                '<style>div { font-weight: 200; }</style>',
                '<style>span { font-weight: bolder; }</style>',
                '<style>.inner { font-weight: lighter; }</style>',
                '<div><span><span class="inner">span</span></span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '200+bolder+lighter',
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should return inherited value with `lighter` and `bolder` modification', function () {
            var htmlText = [
                '<style>div { font-weight: 200; }</style>',
                '<style>span { font-weight: lighter; }</style>',
                '<style>.inner { font-weight: bolder; }</style>',
                '<div><span><span class="inner">span</span></span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '200+lighter+bolder',
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should handle `lighter` with a pseudo class', function () {
            var htmlText = [
                '<style>div { font-weight: 200; }</style>',
                '<style>span { font-weight: lighter; }</style>',
                '<style>.inner:hover { font-weight: bolder; }</style>',
                '<div><span><span class="inner">span</span></span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '200+lighter+bolder',
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'span',
                    props: {
                        'font-family': undefined,
                        'font-weight': '200+lighter+lighter',
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    it('should take browser default stylesheet into account', function () {
        var htmlText = [
            '<style>h1 { font-family: font1; } span { font-family: font2; }</style>',
            '<h1>foo <span>bar</span></h1>'
        ].join('\n');

        return expect(htmlText, 'to exhaustively satisfy computed font properties', [
            {
                text: 'foo',
                props: {
                    'font-family': 'font1',
                    'font-weight': 700,
                    'font-style': 'normal'
                }
            },
            {
                text: 'bar',
                props: {
                    'font-family': 'font2',
                    'font-weight': 700,
                    'font-style': 'normal'
                }
            }
        ]);
    });

    describe('CSS pseudo elements', function () {
        it('should pick up distinct styles on :after pseudo-element', function () {
            var htmlText = [
                '<style>h1:after { content: "after"; font-family: font1 !important; }</style>',
                '<h1>h1</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'h1',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'after',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should support :after without content', function () {
            var htmlText = [
                '<style>h1:after { font-family: font1 !important; }</style>',
                '<h1></h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', []);
        });

        it('should not inherit the content property', function () {
            var htmlText = [
                '<style>h1 { content: "foo" }</style>',
                '<style>h1:after { font-family: font1 !important; }</style>',
                '<h1></h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', []);
        });

        describe('with quotes', function () {
            it('should include all start quote characters when open-quote is part of the content value', function () {
                var htmlText = [
                    '<style>div:after { quotes: "<" ">"; }</style>',
                    '<style>div:after { content: open-quote; font-family: font1 !important; }</style>',
                    '<div></div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: '<',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should include all end quote characters when close-quote is part of the content value', function () {
                var htmlText = [
                    '<style>div:after { quotes: "<" ">" "[" "]"; }</style>',
                    '<style>div:after { content: close-quote; font-family: font1 !important; }</style>',
                    '<div></div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: '>]',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should handle hypothetical values of quotes', function () {
                var htmlText = [
                    '<style>div:after { quotes: "<" ">"; }</style>',
                    '<style>@media 3dglasses { div:after { quotes: "(" ")"; } }</style>',
                    '<style>div:after { content: open-quote; font-family: font1 !important; }</style>',
                    '<div></div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: '(',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: '<',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should assume a conservative set of the most common quote characters when the quotes property is not explicitly given', function () {
                var htmlText = [
                    '<q></q>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: '«‹‘\'"',
                        props: {
                            'font-family': undefined,
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: '»›’\'"',
                        props: {
                            'font-family': undefined,
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });
        });

        it('should override re-definition of prop on :after pseudo-element', function () {
            var htmlText = [
                '<style>h1::after { content: "after"; font-family: font1; }</style>',
                '<style>h1::after { content: "after"; font-family: font2; }</style>',
                '<h1>h1</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'h1',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'after',
                    props: {
                        'font-family': 'font2',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should take !important into account when re-defining prop on :after pseudo-element', function () {
            var htmlText = [
                '<style>h1:after { content: "after"; font-family: font1 !important; }</style>',
                '<style>h1:after { content: "after"; font-family: font2; }</style>',
                '<h1>h1</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'h1',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'after',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should pick up multiple :after pseudo-elements', function () {
            var htmlText = [
                '<style>h1:after { content: "after"; font-family: font1 !important; }</style>',
                '<h1>h1</h1>',
                '<h1>h1</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'h1',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'after',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should inherit from each distinct pseudo parent', function () {
            var htmlText = [
                '<style>.foo:after { content: "after"; font-family: font1 !important; }</style>',
                '<style>p { font-weight: 200; }</style>',
                '<style>article { font-weight: 600; }</style>',
                '<p class="foo">p</p>',
                '<article class="foo">article</atricle>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'p',
                    props: {
                        'font-family': undefined,
                        'font-weight': 200,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'article',
                    props: {
                        'font-family': undefined,
                        'font-weight': 600,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'after',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 200,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'after',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 600,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should support content: attr(...)', function () {
            var htmlText = [
                '<style>div:after { content: attr(data-foo); font-family: font1; }</style>',
                '<div data-foo="bar"></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'bar',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should support content: counter() with an explicit list-style', function () {
            var htmlText = [
                '<style>div:after { content: counter(section, upper-roman); font-family: font1; }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'IVXLCDMↁↂↇↈ',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        describe('with content: counters()', function () {
            it('should support the 2 argument form without an explicit counter style', function () {
                var htmlText = [
                    '<style>div:after { content: counters(section, "."); font-family: font1; }</style>',
                    '<div></div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: '0123456789.',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should support the 3 argument form with a built-in counter-style', function () {
                var htmlText = [
                    '<style>div:after { content: counters(section, ".", upper-roman); font-family: font1; }</style>',
                    '<div></div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'IVXLCDMↁↂↇↈ.',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should support the 3 argument form with a custom @counter-style', function () {
                var htmlText = [
                    '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ }</style>',
                    '<style>div:after { content: counters(section, ".", circled-alpha); font-family: font1; }</style>',
                    '<div></div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'ⒶⒷⒸ.',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should support the 3 argument form with a custom @counter-style that references other counters', function () {
                var htmlText = [
                    '<style>@counter-style foobar { system: fixed; symbols: "foo" "bar"; }</style>',
                    '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ; fallback: foobar; }</style>',
                    '<style>div:after { content: counters(section, ".", circled-alpha); font-family: font1; }</style>',
                    '<div></div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'ⒶⒷⒸfoobar.',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should support the 3 argument form with a custom @counter-style that references a chain of other counters', function () {
                var htmlText = [
                    '<style>@counter-style foo { system: fixed; symbols: "foo"; fallback: decimal; }</style>',
                    '<style>@counter-style bar { system: fixed; symbols: "bar"; fallback: foo; }</style>',
                    '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ; fallback: bar; }</style>',
                    '<style>div:after { content: counters(section, ".", circled-alpha); font-family: font1; }</style>',
                    '<div></div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'ⒶⒷⒸbarfoo0123456789.',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });
        });

        describe('with @counter-style rules', function () {
            it('should include all the symbols of the counter when it is referenced by a list-style-type declaration', function () {
                var htmlText = [
                    '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ }</style>',
                    '<style>div { font-family: font1; display: list-item; list-style-type: circled-alpha; }</style>',
                    '<div>foo</div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'foo',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'ⒶⒷⒸ',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should support the full syntax of the symbols property', function () {
                var htmlText = [
                    '<style>@counter-style circled-alpha { system: fixed; symbols: \'a\' b "c" url(foo.svg) "\\64" "\\"" \'\\\'\'; }</style>',
                    '<style>li { font-family: font1; display: list-item; list-style-type: circled-alpha; }</style>',
                    '<ol><li></li></ol>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'abcd"\'',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should pickup the text from all @counter-style properties', function () {
                var htmlText = [
                    '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ; additive-symbols: 3 url(symbol.png), 2 "0"; prefix: "p"; suffix: "s"; pad: 5 "q"; }</style>',
                    '<style>li { font-family: font1; list-style-type: circled-alpha; }</style>',
                    '<ol><li></li></ol>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'ⒶⒷⒸps0q',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should include all characters of the fallback counter, if given', function () {
                var htmlText = [
                    '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ; fallback: upper-roman }</style>',
                    '<style>div { font-family: font1; display: list-item; list-style-type: circled-alpha; }</style>',
                    '<div>foo</div>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'foo',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'ⒶⒷⒸIVXLCDMↁↂↇↈ',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should trace conditional @counter-style declarations', function () {
                var htmlText = [
                    '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ }</style>',
                    '<style>@media 3dglasses { @counter-style circled-alpha { system: fixed; symbols: Ⓓ Ⓔ Ⓕ } }</style>',
                    '<style>li { font-family: font1; list-style-type: circled-alpha; }</style>',
                    '<ol><li></li></ol>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'ⒶⒷⒸ',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'ⒹⒺⒻ',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should exclude impossible combinations when tracing conditional @counter-style declarations', function () {
                var htmlText = [
                    '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ }</style>',
                    '<style>li { font-family: font1; list-style-type: circled-alpha; }</style>',
                    '<style>@media 3dglasses { @counter-style circled-alpha { system: fixed; symbols: Ⓓ Ⓔ Ⓕ } }</style>',
                    '<style>@media 3dglasses { li { font-family: font2; list-style-type: circled-alpha; } }</style>',
                    '<ol><li></li></ol>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    // Would be nice to avoid this first one, since all the @media 3dglasses {...} will
                    // kick in together, but that would require a more advanced predicate handling:
                    {
                        text: 'ⒶⒷⒸ',
                        props: {
                            'font-family': 'font2',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'ⒹⒺⒻ',
                        props: {
                            'font-family': 'font2',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'ⒶⒷⒸ',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });
        });

        it('should support content: attr(...) mixed with quoted strings', function () {
            var htmlText = [
                '<style>div:after { content: "baz" attr(data-foo) "yadda"; font-family: font1; }</style>',
                '<div data-foo="bar"></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'bazbaryadda',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should apply inherited pseudo-element properties from lower specificity selectors', function () {
            var htmlText = [
                '<style>div:after { content: "foo" !important; }</style>',
                '<style>.myClass:after { font-family: "myClass" }</style>',
                '<style>#myId:after { font-weight: 900 }</style>',
                '<div id="myId" class="myClass">text</div>',
                '<div class="myClass">text</div>',
                '<div >text</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'text',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': 'myClass',
                        'font-weight': 900,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': 'myClass',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should support a combination of pseudo elements and media queries', function () {
            var htmlText = [
                '<style>h1:after { content: "foo"; font-family: font1 !important; }</style>',
                '<style>@media 3dglasses { h1:after { content: "bar"; font-family: font1 !important; } }</style>',
                '<h1>h1</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'h1',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should not confuse :before and :after properties', function () {
            var htmlText = [
                '<style>.after:after { content: "after"; font-family: font1 !important; }</style>',
                '<style>h1:before { content: "before"; font-family: font2; }</style>',
                '<h1 class="after">h1</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'h1',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'before',
                    props: {
                        'font-family': 'font2',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'after',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('with display:list-item', function () {
        it('should include the default list indicators in the subset', function () {
            var htmlText = [
                '<ol><li>foo</li></ol>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: '0123456789',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should include the indicators when display:list-item and list-style-type are applied to an element', function () {
            var htmlText = [
                '<style>div { display: list-item; list-style-type: upper-roman; }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'IVXLCDMↁↂↇↈ',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should recognize "display: list-item block;" as a list item', function () {
            var htmlText = [
                '<style>div { display: list-item block; list-style-type: upper-roman; }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'IVXLCDMↁↂↇↈ',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should support list-style-type provided as a string', function () {
            var htmlText = [
                '<style>div { display: list-item; list-style-type: \'yeah\'; }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'yeah',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should include the indicators when display:list-item and list-style are applied to an element', function () {
            var htmlText = [
                '<style>div { display: list-item; list-style: upper-roman inside; }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'IVXLCDMↁↂↇↈ',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should include the indicators even with the display:list-item does not have text', function () {
            var htmlText = [
                '<style>div { display: list-item; list-style: upper-roman inside; }</style>',
                '<div></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'IVXLCDMↁↂↇↈ',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should combine with conditionals', function () {
            var htmlText = [
                '<style>li { list-style-type: decimal; font-weight: 400 }</style>',
                '<style>@media 3dglasses { li { list-style-type: upper-roman; } } </style>',
                '<li>Hello</li>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'Hello',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'IVXLCDMↁↂↇↈ',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: '0123456789',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('CSS pseudo selectors', function () {
        it('should handle stand alone pseudo selector', function () {
            var htmlText = [
                '<style>:hover > span { font-family: font1; }</style>',
                '<div>foo<span>bar</span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should multiply the styles when a pseudo class matches', function () {
            var htmlText = [
                '<style>div:hover { font-family: font1; font-weight: bold }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should inherit non-pseudo class values from the non-pseudo node', function () {
            var htmlText = [
                '<style>div { font-family: font1; font-weight: 400 } div:hover { font-weight: 500 }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 500,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should multiply pseudo class properties to children', function () {
            var htmlText = [
                '<style>div:hover { font-family: font1; }</style>',
                '<div>foo<span>bar</span></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('CSS @media queries', function () {
        it('should include the possibility of the media query matching or not matching', function () {
            var htmlText = [
                '<style>div { font-family: font1; font-weight: 400 } @media (max-width: 600px) { div { font-weight: 500 } }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 500,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should include the possibility of a media attribute matching or not matching', function () {
            var htmlText = [
                '<style>div { font-family: font1; font-weight: 400 }</style>',
                '<style media="projection">div { font-family: font2; font-weight: 800 }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font2',
                        'font-weight': 800,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should trace two levels of media queries when a media attribute is present and the referenced stylesheet contains a @media rule', function () {
            var htmlText = [
                '<style>div { font-family: font1; font-weight: 400 }</style>',
                '<style media="projection">div { font-family: font2; font-weight: 800 } @media (max-width: 600px) { div { font-weight: 500 } }</style>',
                '<div>foo</div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                { text: 'foo', props: { 'font-style': 'normal', 'font-weight': 800, 'font-family': 'font2' } },
                { text: 'foo', props: { 'font-style': 'normal', 'font-weight': 500, 'font-family': 'font2' } },
                { text: 'foo', props: { 'font-style': 'normal', 'font-weight': 400, 'font-family': 'font1' } }
            ]);
        });

        it('should trace multiple levels of @import tagged with media lists', function () {
            return new AssetGraph({root: __dirname + '/../../../testdata/util/fonts/getTextByFontProperties/nestedCssImportWithMedia/'})
                .loadAssets('index.html')
                .populate()
                .then(function (assetGraph) {
                    expect(getTextByFontProp(assetGraph.findAssets({type: 'Html'})[0]), 'to exhaustively satisfy', [
                        { text: 'foo', props: { 'font-family': undefined, 'font-weight': 500, 'font-style': 'normal' } },
                        { text: 'foo', props: { 'font-family': undefined, 'font-weight': 600, 'font-style': 'normal' } },
                        { text: 'foo', props: { 'font-family': undefined, 'font-weight': 700, 'font-style': 'normal' } }
                    ]);
                });
        });
    });

    describe('font-shorthand property', function () {
        it('should have shorthand value override previous longhand value', function () {
            var htmlText = [
                '<style>h1 { font-weight: normal; font: bold 10px "famfam"; }</style>',
                '<h1>foo</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': 'famfam',
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should have longhand value override previous shorthand value', function () {
            var htmlText = [
                '<style>h1 { font: bold 10px "famfam"; font-weight: normal; }</style>',
                '<h1>foo</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': 'famfam',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('with CSS animations', function () {
        it('should support the animation shorthand', function () {
            var htmlText = [
                '<style>@keyframes foo { 100% { font-weight: 400 } }</style>',
                '<style>h1 { font-weight: 100; animation: 3s ease-in 1s 2 reverse both foo; }</style>',
                '<h1>bar</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 100,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 200,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 300,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should pick up all values of font-style used in an animation', function () {
            var htmlText = [
                '<style>@keyframes foo { 50% { font-style: oblique } 100% { font-style: italic } }</style>',
                '<style>h1 { font-style: normal; animation-name: foo; }</style>',
                '<h1>bar</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'oblique'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'italic'
                    }
                }
            ]);
        });

        it('should support list-style-type being animated', function () {
            var htmlText = [
                '<style>@keyframes foo { 50% { list-style-type: decimal; } 100% { list-style-type: upper-roman; } }</style>',
                '<style>ol > li { list-style-type: "quux"; animation-name: foo; }</style>',
                '<ol><li>bar</li></ol>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'quux',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: '0123456789',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'IVXLCDMↁↂↇↈ',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should trace the intermediate values of font-weight', function () {
            var htmlText = [
                '<style>@keyframes foo { 100% { font-weight: 400 } }</style>',
                '<style>h1 { font-weight: 100; animation-name: foo; }</style>',
                '<h1>bar</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 100,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 200,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 300,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        // This doesn't really make sense, but it works in browsers
        it('should support animating the content attribute', function () {
            var htmlText = [
                '<style>@keyframes foo { 100% { content: "bar"; } }</style>',
                '<style>div:before { content: "foo"; animation: 3s ease-in 1s 2 reverse both paused foo; }</style>',
                '<div></div>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                }
            ]);
        });

        it('should handle conditional animations', function () {
            var htmlText = [
                '<style>@media 3dglasses { @keyframes foo { from { font-weight: 100; } to { font-weight: 400; } } }</style>',
                '<style>@keyframes foo { from { font-weight: 400; } to { font-weight: 700; } }</style>',
                '<style>h1 { font-weight: 400; animation-name: foo; }</style>',
                '<h1>bar</h1>'
            ].join('\n');

            return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 100,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 200,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 300,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 500,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 600,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': undefined,
                        'font-weight': 700,
                        'font-style': 'normal'
                    }
                }
            ]);
        });
    });

    describe('with CSS transitions', function () {
        describe('with the transition shorthand', function () {
            it('should trace all intermediate values of font-weight', function () {
                var htmlText = [
                    '<style>h1 { font-weight: 400; transition: width 2s, height 2s, font-weight 2s, transform 2s; }</style>',
                    '<style>h1:hover { font-weight: 700; }</style>',
                    '<h1>bar</h1>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 700,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 500,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 600,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });
        });

        describe('with transition-property passed separately', function () {
            it('should trace all intermediate values of font-weight when explicitly passed', function () {
                var htmlText = [
                    '<style>h1 { font-weight: 400; transition-property: font-weight; transition-duration: 4s; }</style>',
                    '<style>h1:hover { font-weight: 700; }</style>',
                    '<h1>bar</h1>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 700,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 500,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 600,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should trace all intermediate values of font-weight when `all` is passed', function () {
                var htmlText = [
                    '<style>h1 { font-weight: 400; transition-property: all; transition-duration: 4s; }</style>',
                    '<style>h1:hover { font-weight: 700; }</style>',
                    '<h1>bar</h1>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 700,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 500,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 600,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });

            it('should not trace intermediate values of font-weight when neither `all` nor `font-weight` is passed', function () {
                var htmlText = [
                    '<style>h1 { font-weight: 400; transition-property: color; }</style>',
                    '<style>h1:hover { font-weight: 700; }</style>',
                    '<h1>bar</h1>'
                ].join('\n');

                return expect(htmlText, 'to exhaustively satisfy computed font properties', [
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 700,
                            'font-style': 'normal'
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': undefined,
                            'font-weight': 400,
                            'font-style': 'normal'
                        }
                    }
                ]);
            });
        });
    });
});
