var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph'),
    assets = AssetGraph.assets;

vows.describe('Asset test').addBatch({
    'Instantiate an Html asset with an extensionless url': {
        topic: function () {
            return new assets.Html({
                text: 'foo',
                url: 'http://example.com/index'
            });
        },
        'the extension should be the empty string': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '');
        },
        'then set the extension property to ".foo"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.foo';
                return htmlAsset;
            },
            'the extension property should be ".foo"': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.foo');
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
                'then set the url of the asset to null (inline it)': {
                    topic: function (htmlAsset) {
                        htmlAsset.url = null;
                        return htmlAsset;
                    },
                    'the extension property should still have the previous value': function (htmlAsset) {
                        assert.equal(htmlAsset.extension, '.dhtml');
                    }
                }
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension': {
        topic: function () {
            return new assets.Html({
                text: 'foo',
                url: 'http://example.com/index.blah'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg');
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension': {
        topic: function () {
            return new assets.Html({
                text: 'foo',
                url: 'http://example.com/index.blah'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'then set the extension property to ""': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '';
                return htmlAsset;
            },
            'the extension should be ""': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index');
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension and a fragment identifier': {
        topic: function () {
            return new assets.Html({
                text: 'foo',
                url: 'http://example.com/index.blah#yay'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg#yay');
            },
            'then set the extension to ""': {
                topic: function (htmlAsset) {
                    htmlAsset.extension = "";
                    return htmlAsset;
                },
                'the url property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.url, 'http://example.com/index#yay');
                }
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension and a query string': {
        topic: function () {
            return new assets.Html({
                text: 'foo',
                url: 'http://example.com/index.blah?yay=bar'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg?yay=bar');
            },
            'then set the extension to ""': {
                topic: function (htmlAsset) {
                    htmlAsset.extension = "";
                    return htmlAsset;
                },
                'the url property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.url, 'http://example.com/index?yay=bar');
                }
            }
        }
    },
    'Instantiate an Html asset with an url that has an extension, a query string, and a fragment identifier': {
        topic: function () {
            return new assets.Html({
                text: 'foo',
                url: 'http://example.com/index.blah?yay=bar#really'
            });
        },
        'the extension property should return the right value': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.blah');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the url property should be updated': function (htmlAsset) {
                assert.equal(htmlAsset.url, 'http://example.com/index.blerg?yay=bar#really');
            },
            'then set the extension to ""': {
                topic: function (htmlAsset) {
                    htmlAsset.extension = "";
                    return htmlAsset;
                },
                'the url property should be updated': function (htmlAsset) {
                    assert.equal(htmlAsset.url, 'http://example.com/index?yay=bar#really');
                }
            }
        }
    },
    'Instantiate an Html asset with no url': {
        topic: function () {
            return new assets.Html({
                text: 'foo'
            });
        },
        'the extension property should be ".html" (the defaultExtension)': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.html');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the url property should still be falsy': function (htmlAsset) {
                assert.isTrue(!htmlAsset.url);
            }
        }
    },
    'Instantiate an Html asset with no url but an extension of ".yay"': {
        topic: function () {
            return new assets.Html({
                extension: '.yay',
                text: 'foo'
            });
        },
        'the extension property should be ".yay"': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '.yay');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the url property should still be falsy': function (htmlAsset) {
                assert.isTrue(!htmlAsset.url);
            }
        }
    },
    'Instantiate an Html asset with no url but an extension of ""': {
        topic: function () {
            return new assets.Html({
                extension: '',
                text: 'foo'
            });
        },
        'the extension property should be ""': function (htmlAsset) {
            assert.equal(htmlAsset.extension, '');
        },
        'then set the extension property to ".blerg"': {
            topic: function (htmlAsset) {
                htmlAsset.extension = '.blerg';
                return htmlAsset;
            },
            'the extension should be .blerg': function (htmlAsset) {
                assert.equal(htmlAsset.extension, '.blerg');
            },
            'the url property should still be falsy': function (htmlAsset) {
                assert.isTrue(!htmlAsset.url);
            }
        }
    }
})['export'](module);
