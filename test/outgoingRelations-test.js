var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('asset.outgoingRelations').addBatch({
    'After creating a standalone Html asset': {
        topic: function () {
            return new AssetGraph.Html({
                url: 'http://example.com/foo.html',
                text:
                    '<!DOCTYPE html>\n' +
                    '<html><head><style type="text/css">body{background-image: url(foo.png)}</style></head>' +
                    '<body><a href="quux.html">Link text</a></body></html>'
            });
        },
        'its outgoingRelations property should contain two relations': function (htmlAsset) {
            expect(htmlAsset.outgoingRelations, 'to have length', 2);
        },
        'its first outgoing relation should be an HtmlStyle': function (htmlAsset) {
            expect(htmlAsset.outgoingRelations[0].type, 'to equal', 'HtmlStyle');
        },
        'its second and last outgoing relation should be an HtmlAnchor': function (htmlAsset) {
            expect(htmlAsset.outgoingRelations[1].type, 'to equal', 'HtmlAnchor');
        },
        'the HtmlStyle relation should point to an instantiated Css': function (htmlAsset) {
            expect(htmlAsset.outgoingRelations[0].to.isAsset, 'to equal', true);
            expect(htmlAsset.outgoingRelations[0].to.type, 'to equal', 'Css');
        },
        'the Css asset should have an outgoing unresolved CssImage relation': function (htmlAsset) {
            expect(htmlAsset.outgoingRelations[0].to.outgoingRelations, 'to have length', 1);
            expect(htmlAsset.outgoingRelations[0].to.outgoingRelations[0].type, 'to equal', 'CssImage');
            expect(!!htmlAsset.outgoingRelations[0].to.outgoingRelations[0].to.isResolved, 'to equal', false);
        },
        'the HtmlAnchor relation should be unresolved': function (htmlAsset) {
            expect(!!htmlAsset.outgoingRelations[1].to.isResolved, 'to equal', false);
        },
        'then create an AssetGraph and add the asset to it along with two dummy document': {
            topic: function (htmlAsset) {
                var assetGraph = new AssetGraph({root: 'http://example.com/'});
                assetGraph.addAsset(new AssetGraph.Html({
                    url: 'http://example.com/quux.html',
                    text: '<!DOCTYPE html>\n<html><head><title>Boring document</title></head></html>'
                }));
                assetGraph.addAsset(new AssetGraph.Html({
                    url: 'http://example.com/baz.html',
                    text: '<!DOCTYPE html>\n<html><head><title>Another boring document</title></head></html>'
                }));
                assetGraph.addAsset(htmlAsset);
                return assetGraph;
            },
            'the graph should contain 1 resolved HtmlAnchor relation pointing at quux.html': function (assetGraph) {
                expect(assetGraph, 'to contain relation', {type: 'HtmlAnchor', to: assetGraph.findAssets({url: /\/quux\.html$/})[0]});
            },
            'the graph should contain 1 resolved HtmlStyle relation': function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlStyle');
            },
            'the graph should contain 1 resolved HtmlAnchor relation': function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlAnchor');
            },
            'the graph should contain 1 unresolved CssImage relation': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'CssImage'}, true).length - assetGraph.findRelations({type: 'CssImage'}).length, 'to equal', 1);

            },
            'then overwrite the text of foo.html and include an anchor that points at baz.html': {
                topic: function (assetGraph, fooHtml) {
                    fooHtml.text = '<!DOCTYPE html>\n<html><head></head><body><a href="baz.html">Another link text</a></body></html>';
                    return assetGraph;
                },
                'the graph should contain a single HtmlAnchor relation pointing at baz.html': function (assetGraph) {
                    expect(assetGraph, 'to contain relation', {type: 'HtmlAnchor', to: assetGraph.findAssets({type: 'Html', url: /\/baz\.html$/})});
                },
                'then attach a new HtmlAnchor relation pointing at quux.html': {
                    topic: function (assetGraph) {
                        var fooHtml = assetGraph.findAssets({url: /\/foo\.html$/})[0];
                        new AssetGraph.HtmlAnchor({to: assetGraph.findAssets({url: /\/quux\.html$/})[0]}).attach(fooHtml, 'after', assetGraph.findRelations({type: 'HtmlAnchor', from: fooHtml})[0]);
                        return assetGraph;
                    },
                    'both baz.html and quux.html should be mentioned in the text of foo.html': function (assetGraph) {
                        var text = assetGraph.findAssets({url: /\/foo\.html$/})[0].text;
                        expect(text, 'to match', /baz\.html/);
                        expect(text, 'to match', /quux\.html/);
                    },
                    'then remove foo.html from the graph': {
                        topic: function (assetGraph) {
                            var fooHtml = assetGraph.findAssets({url: /\/foo\.html$/})[0];
                            assetGraph.removeAsset(fooHtml);
                            return {fooHtml: fooHtml, assetGraph: assetGraph};
                        },
                        'the outgoingRelations property of foo.html should contain the two HtmlAnchor relations': function (obj) {
                            var fooHtml = obj.fooHtml;
                            expect(fooHtml.outgoingRelations, 'to have length', 2);
                            expect(fooHtml.outgoingRelations[0].type, 'to equal', 'HtmlAnchor');
                            expect(fooHtml.outgoingRelations[0].to.url, 'to equal', 'http://example.com/baz.html');
                            expect(fooHtml.outgoingRelations[1].type, 'to equal', 'HtmlAnchor');
                            expect(fooHtml.outgoingRelations[1].to.url, 'to equal', 'http://example.com/quux.html');
                        },
                        'the graph should contain no HtmlAnchor relations': function (obj) {
                            var assetGraph = obj.assetGraph;
                            expect(assetGraph, 'to contain no relations', {type: 'HtmlAnchor'});
                        },
                        'then add foo.html to the graph again': {
                            topic: function (obj) {
                                obj.assetGraph.addAsset(obj.fooHtml);
                                return obj.assetGraph;
                            },
                            'the HtmlAnchor relations should be in the graph again': function (assetGraph) {
                                expect(assetGraph, 'to contain relations', 'HtmlAnchor', 2);
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
                                    expect(clone, 'not to be undefined');
                                    var outgoingRelations = assetGraph.findRelations({from: clone});
                                    expect(outgoingRelations, 'to have length', 2);
                                    expect(outgoingRelations[0].to.url, 'to equal', 'http://example.com/baz.html');
                                    expect(outgoingRelations[1].to.url, 'to equal', 'http://example.com/quux.html');
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
                                        expect(clone, 'not to be undefined');
                                        var outgoingRelations = assetGraph.findRelations({from: clone});
                                        expect(outgoingRelations, 'to have length', 2);
                                        expect(outgoingRelations[0].to.url, 'to equal', 'http://example.com/baz.html');
                                        expect(outgoingRelations[1].to.url, 'to equal', 'http://example.com/quux.html');
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
