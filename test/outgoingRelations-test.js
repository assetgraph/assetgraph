var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph'),
    assets = AssetGraph.assets,
    transforms = AssetGraph.transforms;

vows.describe('asset.outgoingRelations').addBatch({
    'After creating a standalone Html asset': {
        topic: function () {
            return new assets.Html({
                url: 'http://example.com/foo.html',
                text:
                    '<!DOCTYPE html>\n' +
                    '<html><head><style type="text/css">body{background-image: url(foo.png)}</style></head>' +
                    '<body><a href="quux.html">Link text</a></body></html>'
            });
        },
        'its outgoingRelations property should contain two relations': function (htmlAsset) {
            assert.equal(htmlAsset.outgoingRelations.length, 2);
        },
        'its first outgoing relation should be an HtmlStyle': function (htmlAsset) {
            assert.equal(htmlAsset.outgoingRelations[0].type, 'HtmlStyle');
        },
        'its second and last outgoing relation should be an HtmlAnchor': function (htmlAsset) {
            assert.equal(htmlAsset.outgoingRelations[1].type, 'HtmlAnchor');
        },
        'the HtmlStyle relation should point to an instantiated Css': function (htmlAsset) {
            assert.equal(htmlAsset.outgoingRelations[0].to.isAsset, true);
            assert.equal(htmlAsset.outgoingRelations[0].to.type, 'Css');
        },
        'the Css asset should have an outgoing unresolved CssImage relation': function (htmlAsset) {
            assert.equal(htmlAsset.outgoingRelations[0].to.outgoingRelations.length, 1);
            assert.equal(htmlAsset.outgoingRelations[0].to.outgoingRelations[0].type, 'CssImage');
            assert.equal(!!htmlAsset.outgoingRelations[0].to.outgoingRelations[0].to.isResolved, false);
        },
        'the HtmlAnchor relation should be unresolved': function (htmlAsset) {
            assert.equal(!!htmlAsset.outgoingRelations[1].to.isResolved, false);
        },
        'then create an AssetGraph and add the asset to it along with two dummy document': {
            topic: function (htmlAsset) {
                var assetGraph = new AssetGraph({root: 'http://example.com/'});
                assetGraph.addAsset(new assets.Html({
                    url: 'http://example.com/quux.html',
                    text: '<!DOCTYPE html>\n<html><head><title>Boring document</title></head></html>'
                }));
                assetGraph.addAsset(new assets.Html({
                    url: 'http://example.com/baz.html',
                    text: '<!DOCTYPE html>\n<html><head><title>Another boring document</title></head></html>'
                }));
                assetGraph.addAsset(htmlAsset);
                return assetGraph;
            },
            'the graph should contain 1 resolved HtmlAnchor relation pointing at quux.html': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlAnchor', to: assetGraph.findAssets({url: /\/quux\.html$/})[0]}).length, 1);
            },
            'the graph should contain 1 resolved HtmlStyle relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 1);
            },
            'the graph should contain 1 resolved HtmlAnchor relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlAnchor'}).length, 1);
            },
            'the graph should contain 1 unresolved CssImage relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage'}, true).length - assetGraph.findRelations({type: 'CssImage'}).length, 1);
            },
            'then overwrite the text of the Html asset and include an anchor that points at the other document': {
                topic: function (assetGraph, htmlAsset) {
                    htmlAsset.text = '<!DOCTYPE html>\n<html><head></head><body><a href="baz.html">Another link text</a></body></html>';
                    return assetGraph;
                },
                'the graph should contain a single HtmlAnchor relation pointing at quux.html': function (assetGraph) {
                    assert.equal(assetGraph.findRelations({type: 'HtmlAnchor', to: assetGraph.findAssets({type: 'Html', url: /\/baz\.html$/})}).length, 1);
                }
            }
        }
    }
})['export'](module);
