var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('Changing the url of assets').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/simple/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain one Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'then moving the first Html asset one level down': {
            topic: function (assetGraph) {
                var initialHtml = assetGraph.findAssets({type: 'Html'})[0];
                initialHtml.url = urlTools.resolveUrl(assetGraph.root, 'bogus/index.html');
                return assetGraph;
            },
            'the relative url of the anchor relation should have changed': function (assetGraph) {
                var relativeUrl = assetGraph.findRelations({type: 'HtmlAnchor'})[0].node.getAttribute('href');
                assert.equal(relativeUrl, '../otherpage.html');
            },
            'then moving the other page one level down': {
                topic: function (assetGraph) {
                    var otherHtml = assetGraph.findAssets({type: 'Html'})[1];
                    otherHtml.url = urlTools.resolveUrl(assetGraph.root, 'fluff/otherpage.html');
                    return assetGraph;
                },
                'the relative url of the anchor relation should be updated': function (assetGraph) {
                    var relativeUrl = assetGraph.findRelations({type: 'HtmlAnchor'})[0].node.getAttribute('href');
                    assert.equal(relativeUrl, '../fluff/otherpage.html');
                },
                'the relative url of the image relation should be updated': function (assetGraph) {
                    var relativeUrl = assetGraph.findRelations({type: 'HtmlImage'})[0].node.getAttribute('src');
                    assert.equal(relativeUrl, '../foo.png');
                }
            }
        }
    },
    'After loading a test case with an Html asset that has multiple levels of inline assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/multipleLevelsOfInline/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should a single Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should a single inline Html asset (conditional comment)': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: true}).length, 1);
        },
        'the graph should a single non-inline Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: false}).length, 1);
        },
        'then moving the Html asset one level down': {
            topic: function (assetGraph) {
                assetGraph.moveAssets({type: 'Html', isInline: false}, function (asset) {
                    return urlTools.resolveUrl(assetGraph.root, 'subdir/index.html');
                }).run(this.callback);
            },
            'the CssImage url should be relative to /subdir': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage'})[0].cssRule.style['background-image'], 'url(../foo.png)');
            }
        }
    },
    'After loading a test case with an Html asset and a distant Htc asset that has the Html as its base asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setAssetUrl/nonTrivialBaseAsset/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain three Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 3);
        },
        'the graph should contain a single Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain a single Htc asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Htc'}).length, 1);
        },
        'then moving the Html asset one level down': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInline: false})[0].url = urlTools.resolveUrl(assetGraph.root, 'subdir/index.html');
                return assetGraph;
            },
            'the CssBehavior url should be relative to /subdir': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssBehavior'})[0].cssRule.style.behavior, 'url(theBehavior.htc)');
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
                .run(this.callback);
        },
        'then change the url of the Html asset to a relative url': {
            topic: function (assetGraph) {
                assetGraph.findAssets()[0].url = 'otherdir/index.html';
                return assetGraph;
            },
            'the asset url should be updated correctly': function (assetGraph) {
                assert.equal(assetGraph.findAssets()[0].url, 'file:///foo/bar/quux/baz/otherdir/index.html');
            },
            'then update the asset url to a root-relative url': {
                topic: function (assetGraph) {
                    assetGraph.findAssets()[0].url = '/hey/index.html';
                    return assetGraph;
                },
                'the asset url should be updated correctly': function (assetGraph) {
                    assert.equal(assetGraph.findAssets()[0].url, 'file:///foo/bar/quux/hey/index.html');
                },
                'then update the asset url to a protocol-relative url': {
                    topic: function (assetGraph) {
                        assetGraph.findAssets()[0].url = '//hey.com/there/index.html';
                        return assetGraph;
                    },
                    'the asset url should be updated correctly': function (assetGraph) {
                        assert.equal(assetGraph.findAssets()[0].url, 'http://hey.com/there/index.html');
                    },
                    'then update the asset url to a relative url': {
                        topic: function (assetGraph) {
                            assetGraph.findAssets()[0].url = 'you/go/index.html';
                            return assetGraph;
                        },
                        'the asset url should be updated correctly': function (assetGraph) {
                            assert.equal(assetGraph.findAssets()[0].url, 'http://hey.com/there/you/go/index.html');
                        },
                        'then update the asset url to a root-relative url': {
                            topic: function (assetGraph) {
                                assetGraph.findAssets()[0].url = '/and/then/here.html';
                                return assetGraph;
                            },
                            'the asset url should be updated correctly': function (assetGraph) {
                                assert.equal(assetGraph.findAssets()[0].url, 'http://hey.com/and/then/here.html');
                            },
                            'then update the asset url to a protocol-relative url': {
                                topic: function (assetGraph) {
                                    assetGraph.findAssets()[0].url = '//example.com/then/here.html';
                                    return assetGraph;
                                },
                                'the asset url should be updated correctly': function (assetGraph) {
                                    assert.equal(assetGraph.findAssets()[0].url, 'http://example.com/then/here.html');
                                },
                                'then update the asset url to an absolute https url, then to a protocol-relative url': {
                                    topic: function (assetGraph) {
                                        assetGraph.findAssets()[0].url = 'https://example2.com/then/here.html';
                                        assetGraph.findAssets()[0].url = '//example.com/then/here.html';
                                        return assetGraph;
                                    },
                                    'the asset url should be updated correctly': function (assetGraph) {
                                        assert.equal(assetGraph.findAssets()[0].url, 'https://example.com/then/here.html');
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
