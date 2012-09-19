var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    seq = require('seq'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Cloning assets').addBatch({
    'After loading a test case with multiple Html assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cloneAsset/multipleHtmls/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 3);
        },
        'the graph should contain a single Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'the graph should contain a single inline Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css', isInline: true}).length, 1);
        },
        'then cloning the first Html asset': {
            topic: function (assetGraph) {
                var indexHtml = assetGraph.findAssets({type: 'Html'})[0],
                    assetClone = indexHtml.clone();
                assetClone.url = indexHtml.url.replace(/\.html$/, ".clone.html");
                return assetGraph;
            },
            'the clone should be in the graph': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/index\.clone\.html$/}).length, 1);
            },
            'the clone should have an HtmlAnchor relation to anotherpage.html': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.clone\.html$/}, to: {url: /\/anotherpage\.html$/}}).length, 1);
            },
            'the clone should have an HtmlAnchor relation to yetanotherpage.html': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.clone\.html$/}, to: {url: /\/yetanotherpage\.html$/}}).length, 1);
            },
            'the clone should have an HtmlStyle relation to an inline stylesheet': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.clone\.html$/}, to: {type: 'Css'}}).length, 1);
            },
            'the graph should still contain a single Png asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
            },
            'the graph should contain two inline Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css', isInline: true}).length, 2);
            },
            'the text of the original and the cloned asset should be identical': function (assetGraph) {
                var originalAndCloned = assetGraph.findAssets({url: /\/index(?:\.clone)?.html/});
                assert.equal(originalAndCloned[0].text, originalAndCloned[1].text);
            }
        }
    },
    'After loading a test case with an advanced require.js construct': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cloneAsset/requireJs/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 7 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 7);
        },
        'then cloning the main asset': {
            topic: function (assetGraph) {
                var clone = assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.clone();
                return assetGraph;
            },
            'the graph should contain no unpopulated relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({}, true).filter(function (relation) {
                    return !relation.to.isAsset;
                }).length, 0);
            },
            'the clone should have the same number of outgoing relations as the original': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: assetGraph.findAssets().pop()}).length,
                             assetGraph.findRelations({from: {url: /\/main\.js$/}}).length);
            },
            'then cloning thelib.js': {
                topic: function (assetGraph) {
                    assetGraph.findAssets({url: /\/thelib\.js/})[0].clone();
                    return assetGraph;
                },
                'the text of the cloned asset should be identical to the original': function (assetGraph) {
                    assert.equal(assetGraph.findAssets().pop().text, assetGraph.findAssets({url: /\/thelib\.js$/})[0].text);
                },
                'the original and the cloned asset should have the same number (and types) of relations': function (assetGraph) {
                    assert.deepEqual(_.pluck(assetGraph.findRelations({from: assetGraph.findAssets().pop()}), 'type'),
                                     _.pluck(assetGraph.findRelations({from: {url: /\/thelib\.js$/}}), 'type'));
                }
            }
        }
    }
})['export'](module);
