var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('transforms.inlineCssImagesWithLegacyFallback').addBatch({
    'After loading test case with a single Html asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineCssImagesWithLegacyFallback/combo/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 5);
        },
        'the graph should contain 6 images': function (assetGraph) {
            assert.equal(assetGraph.findAssets({isImage: true}).length, 6);
        },
        'then running the inlineCssImagesWithLegacyFallback transform': {
            topic: function (assetGraph) {
                assetGraph
                    .inlineCssImagesWithLegacyFallback({isInitial: true}, 32768 * 3/4)
                    .run(this.callback);
            },
            'the graph should contain 7 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 7);
            },
            'the graph should contain 7 HtmlConditionalComment relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 7);
            },
            'the graph should contain 3 inline CssImage relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage', to: {isInline: true}}).length, 3);
            },
            'the Html asset should contain 7 <link> tags': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link[^>]*>/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 7);
            },
            'the Html asset should contain 3 non-IE conditional comment markers': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/<!--\[if !IE\]>-->/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 3);
            },
            'the media=handheld attribute should occur twice now that smallImages.css has been rolled out in two versions': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]handheld/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 2);
            },
            'the media=screen attribute should occur once': function (assetGraph) {
                var captures = assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]screen/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 1);
            },
            'the Html asset should contain 1 IE 8 conditional comment marker with a link tag in it': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Html'})[0].text;
                assert.matches(text, /<!--\[if gte IE 8\]><!--><link[^>]*><!--<!\[endif\]-->/);
                var captures = text.match(/<!--\[if lt IE 8\]><link[^>]*><!\[endif\]-->/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 1);
            },
            'the Html asset should contain 1 IE 9 conditional comment marker with a link tag in it': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Html'})[0].text;
                assert.matches(text, /<!--\[if gte IE 9\]><!--><link[^>]*><!--<!\[endif\]-->/);
                var captures = text.match(/<!--\[if lt IE 9\]><link[^>]*><!\[endif\]-->/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 1);
            }
        }
    },
    'After loading test case with multiple Html asset that point at the same Css': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineCssImagesWithLegacyFallback/multipleHtmls/'})
                .loadAssets('*.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain 1 Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should contain 1 image': function (assetGraph) {
            assert.equal(assetGraph.findAssets({isImage: true}).length, 1);
        },
        'then running the inlineCssImagesWithLegacyFallback transform': {
            topic: function (assetGraph) {
                assetGraph
                    .inlineCssImagesWithLegacyFallback({isInitial: true}, 32768 * 3/4)
                    .run(this.callback);
            },
            'the graph should contain 3 Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 3);
            },
            'the graph should contain 2 HtmlConditionalComment relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 2);
            },
            'the graph should contain 2 inline CssImage relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage', to: {isInline: true}}).length, 2);
            },
            '1.html should contain 2 <link> tags': function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html', url: /\/1.html$/})[0],
                    captures = htmlAsset.text.match(/<link[^>]*>/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 2);
            },
            '2.html should contain 2 <link> tags': function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html', url: /\/2.html$/})[0],
                    captures = htmlAsset.text.match(/<link[^>]*>/g);
                assert.isNotNull(captures);
                assert.equal(captures.length, 2);
            },
            'each Html asset should contain one >= IE8 conditional comment marker': function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInline: false}).forEach(function (htmlAsset) {
                    var captures = htmlAsset.text.match(/<!--\[if gte IE 8\]><!-->/g);
                    assert.isNotNull(captures);
                    assert.equal(captures.length, 1);
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
                .run(this.callback);
        },
        'the graph should contain 2 HtmlStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 2);
        },
        'the graph should contain 2 HtmlStyle relations with an hrefType of "rootRelative"': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyle', hrefType: 'rootRelative'}).length, 2);
        }
    }
})['export'](module);
