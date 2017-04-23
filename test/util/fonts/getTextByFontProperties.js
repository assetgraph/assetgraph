var expect = require('unexpected').clone();
var AssetGraph = require('../../../lib');
var getTextByFontProp = require('../../../lib/util/fonts/getTextByFontProperties');

expect.addAssertion('<string> to [exhaustively] satisfy computed font properties <array>', function (expect, subject, result) {
    return new AssetGraph({})
        .loadAssets(new AssetGraph.Html({
            text: subject
        }))
        .populate({ followRelations: { crossorigin: false } })
        .queue(function (assetGraph) {
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
                    'font-weight': undefined,
                    'font-style': undefined
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
                    'font-weight': 'bold',
                    'font-style': undefined
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
                    'font-weight': 'bold',
                    'font-style': undefined
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
                    'font-weight': undefined,
                    'font-style': undefined
                }
            },
            {
                text: 'strong',
                props: {
                    'font-family': undefined,
                    'font-weight': 'bold',
                    'font-style': undefined
                }
            },
            {
                text: 'em',
                props: {
                    'font-family': undefined,
                    'font-weight': undefined,
                    'font-style': 'italic'
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
                        'font-weight': 'normal',
                        'font-style': undefined
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
                        'font-weight': 'normal',
                        'font-style': undefined
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
                        'font-weight': 'light',
                        'font-style': undefined
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
                        'font-weight': 'light',
                        'font-style': undefined
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
                        'font-weight': 'bold',
                        'font-style': undefined
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
                        'font-weight': 'bold',
                        'font-style': undefined
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
                        'font-weight': 'bold',
                        'font-style': undefined
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
                        'font-weight': 'light',
                        'font-style': undefined
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
                        'font-weight': 'bold',
                        'font-style': undefined
                    }
                },
                {
                    text: 'bar',
                    props: {
                        'font-family': 'font1',
                        'font-weight': 'bold',
                        'font-style': undefined
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
                { props: { 'font-family': undefined, 'font-weight': undefined, 'font-style': undefined }, text: 'button' },
                { props: { 'font-family': undefined, 'font-weight': 'normal', 'font-style': undefined }, text: 'option' },
                { props: { 'font-family': undefined, 'font-weight': undefined, 'font-style': undefined }, text: 'textarea' },
                { props: { 'font-family': undefined, 'font-weight': undefined, 'font-style': undefined }, text: 'input' }
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
                { props: { 'font-family': 'font1', 'font-style': undefined }, text: 'button' },
                { props: { 'font-family': 'font1', 'font-style': undefined }, text: 'option' },
                { props: { 'font-family': 'font1', 'font-style': undefined }, text: 'textarea' },
                { props: { 'font-family': 'font1', 'font-style': undefined }, text: 'input' }
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
                '<input type="radio" value="type:radio">'
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
                { props: { 'font-family': 'font1' }, text: 'type:week' }
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
                    'font-weight': 'bold',
                    'font-style': undefined
                }
            },
            {
                text: 'bar',
                props: {
                    'font-family': 'font2',
                    'font-weight': 'bold',
                    'font-style': undefined
                }
            }
        ]);
    });
});
