var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('Changing the url of assets').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/simple/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 3);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 2);
        },
        'the graph should contain one Png asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Png');
        },
        'then moving the first Html asset one level down': {
            topic: function (assetGraph) {
                var initialHtml = assetGraph.findAssets({type: 'Html'})[0];
                initialHtml.url = urlTools.resolveUrl(assetGraph.root, 'bogus/index.html');
                return assetGraph;
            },
            'the relative url of the anchor relation should have changed': function (assetGraph) {
                var relativeUrl = assetGraph.findRelations({type: 'HtmlAnchor'})[0].node.getAttribute('href');
                expect(relativeUrl, 'to equal', '../otherpage.html');
            },
            'then moving the other page one level down': {
                topic: function (assetGraph) {
                    var otherHtml = assetGraph.findAssets({type: 'Html'})[1];
                    otherHtml.url = urlTools.resolveUrl(assetGraph.root, 'fluff/otherpage.html');
                    return assetGraph;
                },
                'the relative url of the anchor relation should be updated': function (assetGraph) {
                    var relativeUrl = assetGraph.findRelations({type: 'HtmlAnchor'})[0].node.getAttribute('href');
                    expect(relativeUrl, 'to equal', '../fluff/otherpage.html');
                },
                'the relative url of the image relation should be updated': function (assetGraph) {
                    var relativeUrl = assetGraph.findRelations({type: 'HtmlImage'})[0].node.getAttribute('src');
                    expect(relativeUrl, 'to equal', '../foo.png');
                }
            }
        }
    },
    'After loading a test case with an Html asset that has multiple levels of inline assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/multipleLevelsOfInline/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should a single Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'the graph should a single inline Html asset (conditional comment)': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true});
        },
        'the graph should a single non-inline Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Html', isInline: false});
        },
        'then moving the Html asset one level down': {
            topic: function (assetGraph) {
                assetGraph.moveAssets({type: 'Html', isInline: false}, function (asset) {
                    return urlTools.resolveUrl(assetGraph.root, 'subdir/index.html');
                }).run(done);
            },
            'the CssImage url should be relative to /subdir': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'CssImage'})[0].cssRule.style['background-image'], 'to equal', 'url(../foo.png)');
            }
        }
    },
    'After loading a test case with an Html asset and a distant Htc asset that has the Html as its base asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/nonTrivialBaseAsset/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain three Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Css', 3);
        },
        'the graph should contain a single Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain a single Htc asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Htc');
        },
        'then moving the Html asset one level down': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInline: false})[0].url = urlTools.resolveUrl(assetGraph.root, 'subdir/index.html');
                return assetGraph;
            },
            'the CssBehavior url should be relative to /subdir': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'CssBehavior'})[0].cssRule.style.behavior, 'to equal', 'url(theBehavior.htc)');
            }
        }
    },
    'After loading a test case with a single Html file': {
        topic: function () {
            new AssetGraph({root: 'file:///foo/bar/quux'})
                .loadAssets(new AssetGraph.Html({
                    url: 'file:///foo/bar/quux/baz/index.html',
                    text: '<!DOCTYPE html><html></html>'
                }))
                .run(done);
        },
        'then change the url of the Html asset to a relative url': {
            topic: function (assetGraph) {
                assetGraph.findAssets()[0].url = 'otherdir/index.html';
                return assetGraph;
            },
            'the asset url should be updated correctly': function (assetGraph) {
                expect(assetGraph.findAssets()[0].url, 'to equal', 'file:///foo/bar/quux/baz/otherdir/index.html');
            },
            'then update the asset url to a root-relative url': {
                topic: function (assetGraph) {
                    assetGraph.findAssets()[0].url = '/hey/index.html';
                    return assetGraph;
                },
                'the asset url should be updated correctly': function (assetGraph) {
                    expect(assetGraph.findAssets()[0].url, 'to equal', 'file:///foo/bar/quux/hey/index.html');
                },
                'then update the asset url to a protocol-relative url': {
                    topic: function (assetGraph) {
                        assetGraph.findAssets()[0].url = '//hey.com/there/index.html';
                        return assetGraph;
                    },
                    'the asset url should be updated correctly': function (assetGraph) {
                        expect(assetGraph.findAssets()[0].url, 'to equal', 'http://hey.com/there/index.html');
                    },
                    'then update the asset url to a relative url': {
                        topic: function (assetGraph) {
                            assetGraph.findAssets()[0].url = 'you/go/index.html';
                            return assetGraph;
                        },
                        'the asset url should be updated correctly': function (assetGraph) {
                            expect(assetGraph.findAssets()[0].url, 'to equal', 'http://hey.com/there/you/go/index.html');
                        },
                        'then update the asset url to a root-relative url': {
                            topic: function (assetGraph) {
                                assetGraph.findAssets()[0].url = '/and/then/here.html';
                                return assetGraph;
                            },
                            'the asset url should be updated correctly': function (assetGraph) {
                                expect(assetGraph.findAssets()[0].url, 'to equal', 'http://hey.com/and/then/here.html');
                            },
                            'then update the asset url to a protocol-relative url': {
                                topic: function (assetGraph) {
                                    assetGraph.findAssets()[0].url = '//example.com/then/here.html';
                                    return assetGraph;
                                },
                                'the asset url should be updated correctly': function (assetGraph) {
                                    expect(assetGraph.findAssets()[0].url, 'to equal', 'http://example.com/then/here.html');
                                },
                                'then update the asset url to an absolute https url, then to a protocol-relative url': {
                                    topic: function (assetGraph) {
                                        assetGraph.findAssets()[0].url = 'https://example2.com/then/here.html';
                                        assetGraph.findAssets()[0].url = '//example.com/then/here.html';
                                        return assetGraph;
                                    },
                                    'the asset url should be updated correctly': function (assetGraph) {
                                        expect(assetGraph.findAssets()[0].url, 'to equal', 'https://example.com/then/here.html');
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
