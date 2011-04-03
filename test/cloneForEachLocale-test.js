var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Make a clone of each HTML file for each language').addBatch({
    'After loading simple test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cloneForEachLocale/simple/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain one HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph should contain one inline JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript', url: query.undefined}).length, 1);
        },
        'the graph should contain one I18N asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'I18N'}).length, 1);
        },
        'then running the cloneForEachLocale transform': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.cloneForEachLocale({type: 'HTML'}, ['en_US', 'da']),
                    this.callback
                );
            },
            'the graph should contain 2 HTML assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
            },
            'then getting the text of the American English version of the HTML asset': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({url: /\/index\.en_US\.html$/})[0], this.callback);
                },
                'the html tag should have a lang attribute with a value of "en_US"': function (text) {
                    assert.isTrue(/<html[^>]+lang=([\'\"])en_US\1/.test(text));
                }
            },
            'then getting the text of the Danish version of the HTML asset': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({url: /\/index\.da\.html$/})[0], this.callback);
                },
                'the html tag should have a lang attribute with a value of "da"': function (text) {
                    assert.isTrue(/<html[^>]+lang=([\'\"])da\1/.test(text));
                }
            },
            'then getting the text of the American English HTML asset': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({url: /\/index\.en_US\.html$/})[0], this.callback);
                },
                'the one.tr expression in the inline script should be replaced with the American English text': function (text) {
                    assert.isTrue(/var localizedString\s*=\s*([\'\"])The American English text\1/.test(text));
                }
            },
            'then getting the text of the Danish HTML asset': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({url: /\/index\.da\.html$/})[0], this.callback);
                },
                'the one.tr expression in the inline script should be replaced with the Danish text': function (text) {
                    assert.isTrue(/var localizedString\s*=\s*([\'\"])The Danish text\1/.test(text));
                }
            }
        }
    },
    'After loading test case with multiple locales': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cloneForEachLocale/multipleLocales/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
            assert.equal(assetGraph.findAssets({type: 'JavaScript', url: query.undefined}).length, 1);
            assert.equal(assetGraph.findAssets({type: 'I18N'}).length, 1);
        },
        'then get the inline JavaScript asset as text': {
            topic: function (assetGraph) {
                assetGraph.getAssetText(assetGraph.findAssets({type: 'JavaScript'})[0], this.callback);
            },
            'the plainOneTr function should use the default pattern': function (src) {
                assert.equal(new Function(src + "; return plainOneTr();")(), "Plain default");
            },
            'the callOneTrPattern function should use the default pattern': function (src) {
                assert.equal(new Function(src + "; return callOneTrPattern();")(), "Boring and stupid default pattern");
            },
            'the nonInvokedTrPattern should use the default pattern': function (src) {
                assert.equal(new Function(src + "; return nonInvokedTrPattern('X');")(), "Welcome to Default Country, Mr. X");
            }
        },
        'then run the cloneForEachLocale transform': {
            topic: function (assetGraph) {
                var callback = this.callback;
                assetGraph.transform(
                    transforms.cloneForEachLocale({isInitial: true}, ['da', 'en_US']),
                    transforms.prettyPrintAssets({type: 'JavaScript'}),
                    this.callback
                );
            },
            'the graph should contain 2 HTML assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'then get the American English JavaScript as text': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'JavaScript', incoming: {from: {url: /\/index\.en_US\.html$/}}})[0], this.callback);
                },
                'the plainOneTr function should use the "en" pattern': function (src) {
                    assert.equal(new Function(src + "; return plainOneTr();")(), "Plain English");
                },
                'the callOneTrPattern function should use the "en" pattern': function (src) {
                    assert.equal(new Function(src + "; return callOneTrPattern();")(), "Boring and stupid English pattern");
                },
                'the nonInvokedTrPattern should use the "en_US" pattern': function (src) {
                    assert.equal(new Function(src + "; return nonInvokedTrPattern('X');")(), "Welcome to America, Mr. X");
                }
            },
            'then get the Danish JavaScript as text': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'JavaScript', incoming: {from: {url: /\/index\.da\.html$/}}})[0], this.callback);
                },
                'the plainOneTr function should use the "da" pattern': function (src) {
                    assert.equal(new Function(src + "; return plainOneTr();")(), "Jævnt dansk");
                },
                'the callOneTrPattern function should use the "da" pattern': function (src) {
                    assert.equal(new Function(src + "; return callOneTrPattern();")(), "Kedeligt and stupid dansk mønster");
                },
                'the nonInvokedTrPattern should use the "da" pattern': function (src) {
                    assert.equal(new Function(src + "; return nonInvokedTrPattern('X');")(), "Velkommen til Danmark, hr. X");
                }
            }
        }
    }
})['export'](module);
