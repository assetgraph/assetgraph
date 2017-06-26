var expect = require('unexpected').clone();
var AssetGraph = require('../../../lib');
var getTextByFontProp = require('../../../lib/util/fonts/getTextByFontProperties');

expect.addAssertion('<string> to [exhaustively] satisfy computed font properties <array>', function (expect, subject, result) {
    return new AssetGraph({})
        .loadAssets(new AssetGraph.Html({
            text: subject
        }))
        .populate({ followRelations: { crossorigin: false } })
        .then(function (assetGraph) {
            expect(getTextByFontProp(assetGraph.findAssets({type: 'Html'})[0]), 'to [exhaustively] satisfy', result);
        });
});

describe('util/fonts/getTextByFontProp', function () {
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
                '<article class="foo">article</atricle>',
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
                        'font-family': 'font1',
                        'font-weight': 400,
                        'font-style': 'normal'
                    }
                },
                {
                    text: 'foo',
                    props: {
                        'font-family': undefined,
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
});
