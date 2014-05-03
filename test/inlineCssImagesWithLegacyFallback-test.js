var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('transforms.inlineCssImagesWithLegacyFallback').addBatch({
    'After loading test case with a single Html asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineCssImagesWithLegacyFallback/combo/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 5 Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Css', 5);
        },
        'the graph should contain 6 images': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {isImage: true}, 6);
        },
        'then running the inlineCssImagesWithLegacyFallback transform': {
            topic: function (assetGraph) {
                assetGraph
                    .inlineCssImagesWithLegacyFallback({isInitial: true}, 32768 * 3/4)
                    .run(done);
            },
            'the graph should contain 7 Css assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 7);
            },
            'the ?inline=false parameter should be removed from smallImagesWithInlineFalse.css': function (assetGraph) {
                var inlineOccurrences = assetGraph.findAssets({url: /\/smallImagesWithInlineFalse\.css$/})[0].text.match(/inline=false/g);
                expect(inlineOccurrences, 'to be null');
            },
            'the ?inline parameter should be removed from imageGreaterThan32KBWithInlineParameter.css': function (assetGraph) {
                var inlineOccurrences = assetGraph.findAssets({url: /\/imageGreaterThan32KBWithInlineParameter\.css$/})[0].text.match(/inline/g);
                expect(inlineOccurrences, 'to be null');
            },
            'the graph should contain 7 HtmlConditionalComment relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 7);
            },
            'the graph should contain 3 inline CssImage relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', {type: 'CssImage', to: {isInline: true}}, 3);
            },
            'the Html asset should contain 7 <link> tags': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link[^>]*>/g);
                expect(captures, 'not to be null');
                expect(captures, 'to have length', 7);
            },
            'the Html asset should contain 3 non-IE conditional comment markers': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/<!--\[if !IE\]>-->/g);
                expect(captures, 'not to be null');
                expect(captures, 'to have length', 3);
            },
            'the media=handheld attribute should occur twice now that smallImages.css has been rolled out in two versions': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]handheld/g);
                expect(captures, 'not to be null');
                expect(captures, 'to have length', 2);
            },
            'the media=screen attribute should occur once': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]screen/g);
                expect(captures, 'not to be null');
                expect(captures, 'to have length', 1);
            },
            'the Html asset should contain 1 IE 8 conditional comment marker with a link tag in it': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Html'})[0].text;
                expect(text, 'to match', /<!--\[if gte IE 8\]><!--><link[^>]*><!--<!\[endif\]-->/);
                var captures = text.match(/<!--\[if lt IE 8\]><link[^>]*><!\[endif\]-->/g);
                expect(captures, 'not to be null');
                expect(captures, 'to have length', 1);
            },
            'the Html asset should contain 1 IE 9 conditional comment marker with a link tag in it': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Html'})[0].text;
                expect(text, 'to match', /<!--\[if gte IE 9\]><!--><link[^>]*><!--<!\[endif\]-->/);
                var captures = text.match(/<!--\[if lt IE 9\]><link[^>]*><!\[endif\]-->/g);
                expect(captures, 'not to be null');
                expect(captures, 'to have length', 1);
            }
        }
    },
    'After loading test case with multiple Html asset that point at the same Css': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineCssImagesWithLegacyFallback/multipleHtmls/'})
                .loadAssets('*.html')
                .populate()
                .run(done);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 2);
        },
        'the graph should contain 1 Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'the graph should contain 1 image': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {isImage: true});
        },
        'then running the inlineCssImagesWithLegacyFallback transform': {
            topic: function (assetGraph) {
                assetGraph
                    .inlineCssImagesWithLegacyFallback({isInitial: true}, 32768 * 3/4)
                    .run(done);
            },
            'the graph should contain 3 Css assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 3);
            },
            'the graph should contain 2 HtmlConditionalComment relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);
            },
            'the graph should contain 2 inline CssImage relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', {type: 'CssImage', to: {isInline: true}}, 2);
            },
            '1.html should contain 2 <link> tags': function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html', url: /\/1.html$/})[0],
                    captures = htmlAsset.text.match(/<link[^>]*>/g);
                expect(captures, 'not to be null');
                expect(captures, 'to have length', 2);
            },
            '2.html should contain 2 <link> tags': function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html', url: /\/2.html$/})[0],
                    captures = htmlAsset.text.match(/<link[^>]*>/g);
                expect(captures, 'not to be null');
                expect(captures, 'to have length', 2);
            },
            'each Html asset should contain one >= IE8 conditional comment marker': function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInline: false}).forEach(function (htmlAsset) {
                    var captures = htmlAsset.text.match(/<!--\[if gte IE 8\]><!-->/g);
                    expect(captures, 'not to be null');
                    expect(captures, 'to have length', 1);
                });
            }
        }
    },
    'After loading test case with a root-relative HtmlStyle, then running the inlineCssImagesWithLegacyFallback transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineCssImagesWithLegacyFallback/rootRelative/'})
                .loadAssets('index.html')
                .populate()
                .inlineCssImagesWithLegacyFallback({isInitial: true}, 32768 * 3/4)
                .run(done);
        },
        'the graph should contain 2 HtmlStyle relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
        },
        'the graph should contain 2 HtmlStyle relations with an hrefType of "rootRelative"': function (assetGraph) {
            expect(assetGraph, 'to contain relations', {type: 'HtmlStyle', hrefType: 'rootRelative'}, 2);
        }
    },
    'After loading test case with a small background-image inside a @media query, then running the inlineCssImagesWithLegacyFallback transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineCssImagesWithLegacyFallback/mediaQuery/'})
                .loadAssets('index.html')
                .populate()
                .inlineCssImagesWithLegacyFallback({isInitial: true}, 10000)
                .run(done);
        },
        'the background-image should not be inlined': function (assetGraph) {
            expect(assetGraph, 'to contain relation', {type: 'CssImage', to: {isInline: false}});
            expect(assetGraph, 'to contain no relations', {type: 'CssImage', to: {isInline: true}});
        }
    }
})['export'](module);
