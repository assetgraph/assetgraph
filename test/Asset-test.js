var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('url-tools'),
    AssetGraph = require('../lib');

vows.describe('Asset test').addBatch({
    'Instantiate an Html asset with an extensionless url': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index'
            });
        },
        'the extension should be the empty string': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '');
        },
        'the file name should be "index"': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index');
        },
        'then set the extension property to ".foo"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.foo';
                return htmlAsset;
            },
            'the extension property should be ".foo"': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.foo');
            },
            'the fileName property should be updated to "index.foo"': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.foo');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.foo');
            },
            'then update the url': {
                topic: function (htmlAsset) {
                    htmlAsset.url = 'http://anotherexample.com/heythere.dhtml';
                    return htmlAsset;
                },
                'the extension property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.extension, '.dhtml');
                },
                'the fileName property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.fileName, 'heythere.dhtml');
                },
                'then set the url of the asset to null (inline it)': {
                    topic: function (htmlAsset) {
                        htmlAsset.url = null;
                        return htmlAsset;
                    },
                    'the extension property should still have the previous value': function (htmlAsset) {
                        assert.equal(htmlAsset.extension, '.dhtml');
                    },
                    'the fileName property should still have the previous value': function (htmlAsset) {
                        assert.equal(htmlAsset.fileName, 'heythere.dhtml');
                    }
                }
            }
        }
    },
    'Instantiate an Html asset with an extensionless url': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'æøå',
                url: 'http://example.com/index'
            });
        },
        'the extension should be the empty string': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '');
        },
        'the file name should be "index"': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index');
        },
        'the asset should have a lastKnownByteLength of 6': function (htmlAsset) {
            assert.equal(htmlAsset.lastKnownByteLength, 6);
        },
        'then set the fileName property to "thething.foo"': {
            topic: function (htmlAsset) {
                htmlAsset.fileName = 'thething.foo';
                return htmlAsset;
            },
            'the extension property should be ".foo"': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.foo');
            },
            'the fileName property should be "thething.foo"': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'thething.foo');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/thething.foo');
            },
            'then unload the asset': {
                topic: function (htmlAsset) {
                    htmlAsset.unload();
                    return htmlAsset;
                },
                'the asset should still have a lastKnownByteLength of 6': function (htmlAsset) {
                    assert.equal(htmlAsset.lastKnownByteLength, 6);
                }
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension': {
        topic: function () {
            return new AssetGraph.Html({
                rawSrc: new Buffer([0xc3, 0xa6, 0xc3, 0xb8, 0xc3, 0xa5]),
                url: 'http://example.com/index.blah'
            });
        },
        'the asset should have a lastKnownByteLength of 6': function (htmlAsset) {
            assert.equal(htmlAsset.lastKnownByteLength, 6);
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, 'index.blah');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be ".blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be "index.blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg');
            },
            'then update the rawSrc of the asset': {
                topic: function (htmlAsset) {
                    htmlAsset.rawSrc = new Buffer('foo', 'utf-8');
                    return htmlAsset;
                },
                'the asset should have a lastKnownByteLength of 3': function (htmlAsset) {
                    assert.equal(htmlAsset.lastKnownByteLength, 3);
                }
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, 'index.blah');
        },
        'then set the fileName property to "index.blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.fileName = 'index.blerg';
                return htmlAsset;
            },
            'the extension property should be ".blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be "index.blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg');
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index.blah');
        },
        'then set the extension property to ""': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '';
                return htmlAsset;
            },
            'the extension property should be ""': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '');
            },
            'the fileName property should be "index"': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index');
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index.blah');
        },
        'then set the fileName property to ""': {
            topic: function (htmlAsset) {
                htmlAsset.fileName = '';
                return htmlAsset;
            },
            'the extension property should be ""': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '');
            },
            'the fileName property should be ""': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, '');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/');
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension and a fragment identifier': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah#yay'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index.blah');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be ".blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be "index.blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg#yay');
            },
            'then set the extension to ""': {
                topic: function (htmlAsset) {
                    htmlAsset.extension = "";
                    return htmlAsset;
                },
                'the extension property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.extension, '');
                },
                'the fileName property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.fileName, 'index');
                },
                'the url property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.url, 'http://example.com/index#yay');
                }
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension and a fragment identifier': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah#yay'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index.blah');
        },
        'then set the fileName property to "index.blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be ".blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be "index.blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg#yay');
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension and a query string': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah?yay=bar'
            });
        },
        'the extension property should be the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should be the right value': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index.blah');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg?yay=bar');
            },
            'then set the extension to ""': {
                topic: function (htmlAsset) {
                    htmlAsset.extension = "";
                    return htmlAsset;
                },
                'the fileName property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.fileName, 'index');
                },
                'the url property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.url, 'http://example.com/index?yay=bar');
                }
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension and a query string': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah?yay=bar'
            });
        },
        'the extension property should be the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should be the right value': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index.blah');
        },
        'then set the fileName property to "index.blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.fileName = 'index.blerg';
                return htmlAsset;
            },
            'the extension property should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg?yay=bar');
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension, a query string, and a fragment identifier': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah?yay=bar#really'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index.blah');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg?yay=bar#really');
            },
            'then set the extension to ""': {
                topic: function (htmlAsset) {
                    htmlAsset.extension = "";
                    return htmlAsset;
                },
                'the extension property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.extension, '');
                },
                'the fileName property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.fileName, 'index');
                },
                'the url property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.url, 'http://example.com/index?yay=bar#really');
                }
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension, a query string, and a fragment identifier': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo',
                url: 'http://example.com/index.blah?yay=bar#really'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'the fileName property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, 'index.blah');
        },
        'then set the fileName property to "index.blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.fileName = 'index.blerg';
                return htmlAsset;
            },
            'the extension property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'index.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg?yay=bar#really');
            },
            'then set the extension to ""': {
                topic: function (htmlAsset) {
                    htmlAsset.extension = "";
                    return htmlAsset;
                },
                'the extension property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.extension, '');
                },
                'the fileName property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.fileName, 'index');
                },
                'the url property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.url, 'http://example.com/index?yay=bar#really');
                }
            }
        }
    },
    'Instantiate an Html asset with no url': {
        topic: function () {
            return new AssetGraph.Html({
                text: 'foo'
            });
        },
        'the extension property should be ".html" (the defaultExtension)': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.html');
        },
        'the fileName property should be undefined': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, undefined);
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName should still be undefined': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, undefined);
            },
            'the url property should still be falsy': function (htmlAsset) {
                assert.isTrue(!htmlAsset.url);
            }
        }
    },
    'Instantiate an Html asset with no url but an extension of ".yay"': {
        topic: function () {
            return new AssetGraph.Html({
                extension: '.yay',
                text: 'foo'
            });
        },
        'the extension property should be ".yay"': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.yay');
        },
        'the fileName property should be undefined': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, undefined);
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should still be undefined': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, undefined);
            },
            'the url property should still be falsy': function (htmlAsset) {
                assert.isTrue(!htmlAsset.url);
            }
        }
    },
    'Instantiate an Html asset with no url but a fileName of "thething.yay"': {
        topic: function () {
            return new AssetGraph.Html({
                fileName: 'thething.yay',
                text: 'foo'
            });
        },
        'the extension property should be ".yay"': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.yay');
        },
        'the fileName property should be "thething.yay"': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, "thething.yay");
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, 'thething.blerg');
            },
            'the url property should still be falsy': function (htmlAsset) {
                assert.isTrue(!htmlAsset.url);
            }
        }
    },
    'Instantiate an Html asset with no url but an extension of ""': {
        topic: function () {
            return new AssetGraph.Html({
                extension: '',
                text: 'foo'
            });
        },
        'the extension property should be ""': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '');
        },
        'the fileName property should be undefined': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, undefined);
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should still be undefined': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, undefined);
            },
            'the url property should still be falsy': function (htmlAsset) {
                assert.isTrue(!htmlAsset.url);
            }
        }
    },
    'Instantiate an Html asset with no url but a fileName of ""': {
        topic: function () {
            return new AssetGraph.Html({
                fileName: '',
                text: 'foo'
            });
        },
        'the extension property should be ""': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '');
        },
        'the fileName property should be ""': function (htmlAsset) {
            assert.equal(htmlAsset.fileName, "");
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension property should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the fileName property should be ".blerg"': function (htmlAsset) {
                assert.equal(htmlAsset.fileName, ".blerg");
            },
            'the url property should still be falsy': function (htmlAsset) {
                assert.isTrue(!htmlAsset.url);
            }
        }
    },
    'Create AssetGraph with a loaded asset that has a link to an unloaded asset, then move the unloaded asset': {
        topic: function () {
            var assetGraph = new AssetGraph(),
                fooHtml = new AssetGraph.Html({
                    url: 'http://example.com/foo.html',
                    text: '<!DOCTYPE html><html><head></head><body><a href="http://example.com/bar.html">link text</a></body></html>'
                }),
                barHtml = new AssetGraph.Html({ // Not yet loaded
                    url: 'http://example.com/bar.html'
                });
            assetGraph.addAsset(fooHtml);
            assetGraph.addAsset(barHtml);
            assetGraph.findRelations({type: 'HtmlAnchor'}, true)[0].to = barHtml;
            barHtml.url = 'http://example.com/subdir/quux.html';
            return assetGraph;
        },
        'the href of the HtmlAnchor relation should be updated correctly': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlAnchor'}, true)[0].href, 'http://example.com/subdir/quux.html');
        },
        'subdir/quux.html still should not be loaded': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', url: /\/subdir\/quux\.html$/})[0].isLoaded, false);
        },
        'then set the hrefType of the HtmlAnchor relation to "relative"': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'HtmlAnchor'}, true)[0].hrefType = 'relative';
                return assetGraph;
            },
            'the href of the HtmlAnchor relation should be updated correctly': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlAnchor'}, true)[0].href, 'subdir/quux.html');
            },
            'subdir/quux.html still should not be loaded': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Html', url: /\/subdir\/quux\.html$/})[0].isLoaded, false);
            }
        }
    }
})['export'](module);
