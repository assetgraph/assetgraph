var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph'),
    assets = AssetGraph.assets,
    relations = AssetGraph.relations,
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
            'then overwrite the text of foo.html and include an anchor that points at baz.html': {
                topic: function (assetGraph, fooHtml) {
                    fooHtml.text = '<!DOCTYPE html>\n<html><head></head><body><a href="baz.html">Another link text</a></body></html>';
                    return assetGraph;
                },
                'the graph should contain a single HtmlAnchor relation pointing at baz.html': function (assetGraph) {
                    assert.equal(assetGraph.findRelations({type: 'HtmlAnchor', to: assetGraph.findAssets({type: 'Html', url: /\/baz\.html$/})}).length, 1);
                },
                'then attach a new HtmlAnchor relation pointing at quux.html': {
                    topic: function (assetGraph) {
                        var fooHtml = assetGraph.findAssets({url: /\/foo\.html$/})[0];
                        new relations.HtmlAnchor({to: assetGraph.findAssets({url: /\/quux\.html$/})[0]}).attach(fooHtml, 'after', assetGraph.findRelations({type: 'HtmlAnchor', from: fooHtml})[0]);
                        return assetGraph;
                    },
                    'both baz.html and quux.html should be mentioned in the text of foo.html': function (assetGraph) {
                        var text = assetGraph.findAssets({url: /\/foo\.html$/})[0].text;
                        assert.matches(text, /baz\.html/);
                        assert.matches(text, /quux\.html/);
                    },
                    'then remove foo.html from the graph': {
                        topic: function (assetGraph) {
                            var fooHtml = assetGraph.findAssets({url: /\/foo\.html$/})[0];
                            assetGraph.removeAsset(fooHtml);
                            return {fooHtml: fooHtml, assetGraph: assetGraph};
                        },
                        'the outgoingRelations property of foo.html should contain the two HtmlAnchor relations': function (obj) {
                            var fooHtml = obj.fooHtml;
                            assert.equal(fooHtml.outgoingRelations.length, 2);
                            assert.equal(fooHtml.outgoingRelations[0].type, 'HtmlAnchor');
                            assert.equal(fooHtml.outgoingRelations[0].to.url, 'http://example.com/baz.html');
                            assert.equal(fooHtml.outgoingRelations[1].type, 'HtmlAnchor');
                            assert.equal(fooHtml.outgoingRelations[1].to.url, 'http://example.com/quux.html');
                        },
                        'the graph should contain no HtmlAnchor relations': function (obj) {
                            var assetGraph = obj.assetGraph;
                            assert.equal(assetGraph.findRelations({type: 'HtmlAnchor'}).length, 0);
                        },
                        'then add foo.html to the graph again': {
                            topic: function (obj) {
                                obj.assetGraph.addAsset(obj.fooHtml);
                                return obj.assetGraph;
                            },
                            'the HtmlAnchor relations should be in the graph again': function (assetGraph) {
                                assert.equal(assetGraph.findRelations({type: 'HtmlAnchor'}).length, 2);
                            },
                            'then clone foo.html': {
                                topic: function (assetGraph) {
                                    var fooHtml = assetGraph.findAssets({url: /\/foo\.html$/})[0],
                                        clone = fooHtml.clone();
                                    clone.url = 'http://example.com/fooclone1.html';
                                    return assetGraph;
                                },
                                'the clone should have populated relations to baz.html and quux.html': function (assetGraph) {
                                    var clone = assetGraph.findAssets({url: /\/fooclone1\.html$/})[0];
                                    assert.notEqual(clone, undefined);
                                    var outgoingRelations = assetGraph.findRelations({from: clone});
                                    assert.equal(outgoingRelations.length, 2);
                                    assert.equal(outgoingRelations[0].to.url, 'http://example.com/baz.html');
                                    assert.equal(outgoingRelations[1].to.url, 'http://example.com/quux.html');
                                },
                                'then change the url of foo.html and clone it again': {
                                    topic: function (assetGraph) {
                                        var fooHtml = assetGraph.findAssets({url: /\/foo\.html$/})[0];
                                        fooHtml.url = 'http://example.com/another/place/foo.html';
                                        var clone = fooHtml.clone();
                                        clone.url = 'http://example.com/another/place/fooclone2.html';
                                        return assetGraph;
                                    },
                                    'the clone should have populated relations to baz.html and quux.html': function (assetGraph) {
                                        var clone = assetGraph.findAssets({url: /\/fooclone2\.html$/})[0];
                                        assert.notEqual(clone, undefined);
                                        var outgoingRelations = assetGraph.findRelations({from: clone});
                                        assert.equal(outgoingRelations.length, 2);
                                        assert.equal(outgoingRelations[0].to.url, 'http://example.com/baz.html');
                                        assert.equal(outgoingRelations[1].to.url, 'http://example.com/quux.html');
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
})['export'](module);
