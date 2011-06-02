var vows = require('vows'),
    assert = require('assert'),
    vm = require('vm'),
    passError = require('../lib/util/passError'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query,
    i18nTools = require('../lib/util/i18nTools');

function getJavaScriptTextAndBootstrappedContext(assetGraph, htmlQueryObj, cb) {
    var htmlAsset = assetGraph.findAssets(htmlQueryObj)[0],
        htmlScriptRelations = assetGraph.findRelations({from: htmlAsset, to: {type: 'JavaScript'}}),
        inlineJavaScript;

    if (htmlScriptRelations[0].node.getAttribute('id') === 'oneBootstrapper') {
        inlineJavaScript = htmlScriptRelations[1].to;
    } else {
        inlineJavaScript = htmlScriptRelations[0].to;
    }
    assetGraph.getAssetText(inlineJavaScript, function (err, text) {
        if (err) {
            return cb(err);
        }
        i18nTools.getBootstrappedContext(assetGraph, assetGraph.findAssets(htmlQueryObj)[0], passError(cb, function (context) {
            cb(null, text, context);
        }));
    });
}

function evaluateInContext(src, context) {
    vm.runInContext("result = (function () {" + src + "}());", context);
    return context.result;
}

vows.describe('Make a clone of each HTML file for each language').addBatch({
    'After loading simple test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cloneForEachLocale/simple/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain one HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph should contain one inline JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript', url: query.isUndefined}).length, 1);
        },
        'the graph should contain one I18N asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'I18N'}).length, 1);
        },
        'then running the cloneForEachLocale transform': {
            topic: function (assetGraph) {
                assetGraph.queue(
                    transforms.injectOneBootstrapper({type: 'HTML'}),
                    transforms.cloneForEachLocale({type: 'HTML'}, ['en_US', 'da'])
                ).run(this.callback);
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
            new AssetGraph({root: __dirname + '/cloneForEachLocale/multipleLocales/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                transforms.injectOneBootstrapper({type: 'HTML', isInitial: true})
            ).run(this.callback);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
            assert.equal(assetGraph.findAssets({type: 'JavaScript', url: query.isUndefined}).length, 2);
            assert.equal(assetGraph.findAssets({type: 'I18N'}).length, 1);
        },
        'then get the inline JavaScript asset as text': {
            topic: function (assetGraph) {
                getJavaScriptTextAndBootstrappedContext(assetGraph, {type: 'HTML'}, this.callback);
            },
            'the plainOneTr function should use the default pattern': function (err, text, context) {
                assert.equal(evaluateInContext(text + "; return plainOneTr()", context), 'Plain default');
            },
            'the callOneTrPattern function should use the default pattern': function (err, text, context) {
                assert.equal(evaluateInContext(text + "; return callOneTrPattern()", context), 'Boring and stupid default pattern');
            },
            'the nonInvokedTrPattern should use the default pattern': function (err, text, context) {
                assert.equal(evaluateInContext(text + "; return nonInvokedTrPattern('X')", context), 'Welcome to Default Country, Mr. X');
            }
        },
        'then run the cloneForEachLocale transform': {
            topic: function (assetGraph) {
                assetGraph.queue(
                    transforms.cloneForEachLocale({isInitial: true}, ['da', 'en_US']),
                    transforms.prettyPrintAssets({type: 'JavaScript'})
                ).run(this.callback);
            },
            'the graph should contain 2 HTML assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
            },
            'the graph should contain 4 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 4);
            },
            'then get the American English JavaScript as text along with the bootstrapped context': {
                topic: function (assetGraph) {
                    getJavaScriptTextAndBootstrappedContext(assetGraph, {type: 'HTML', url: /\/index\.en_US\.html$/}, this.callback);
                },
                'the plainOneTr function should use the "en" pattern': function (err, text, context) {
                    assert.equal(evaluateInContext(text + "; return plainOneTr()", context), 'Plain English');
                },
                'the callOneTrPattern function should use the "en" pattern': function (err, text, context) {
                    assert.equal(evaluateInContext(text + "; return callOneTrPattern();", context), "Boring and stupid English pattern");
                },
                'the nonInvokedTrPattern should use the "en_US" pattern': function (err, text, context) {
                    assert.equal(evaluateInContext(text + "; return nonInvokedTrPattern('X');", context), "Welcome to America, Mr. X");
                }
            },
            'then get the Danish JavaScript as text': {
                topic: function (assetGraph) {
                    getJavaScriptTextAndBootstrappedContext(assetGraph, {type: 'HTML', url: /\/index\.da\.html$/}, this.callback);
                },
                'the plainOneTr function should use the "en" pattern': function (err, text, context) {
                    assert.equal(evaluateInContext(text + "; return plainOneTr()", context), 'Jævnt dansk');
                },
                'the callOneTrPattern function should use the "en" pattern': function (err, text, context) {
                    assert.equal(evaluateInContext(text + "; return callOneTrPattern();", context), "Kedeligt and stupid dansk mønster");
                },
                'the nonInvokedTrPattern should use the "en_US" pattern': function (err, text, context) {
                    assert.equal(evaluateInContext(text + "; return nonInvokedTrPattern('X');", context), "Velkommen til Danmark, hr. X");
                }
            },
            'the run the buildDevelopment conditional blocks': {
                topic: function (assetGraph) {
                    assetGraph.queue(transforms.runJavaScriptConditionalBlocks({isInitial: true}, 'buildDevelopment')).run(this.callback);
                },
                'the American English HTML asset should contain the American English title': function (assetGraph) {
                    assert.equal(assetGraph.findAssets({type: 'HTML', url: /\/index\.en_US\.html$/})[0].parseTree.title, "The awesome document title");
                },
                'the Danish HTML asset should contain the Danish title': function (assetGraph) {
                    assert.equal(assetGraph.findAssets({type: 'HTML', url: /\/index\.da\.html$/})[0].parseTree.title, "Dokumentets vidunderlige titel");
                }
            }
        }
    }
})['export'](module);
