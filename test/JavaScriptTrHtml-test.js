var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('JavaScriptTrHtml').addBatch({
    'After loading a test case with a simple JavaScriptTrHtml relation': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptTrHtml/simple/'})
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
        'the graph should contain 1 JavaScriptTrHtml relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptTrHtml'}).length, 1);
        },
        'the href getter of the JavaScriptTrHtml relation should return undefined': function (assetGraph) {
            assert.isUndefined(assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].href);
        },
        'then set the omitFunctionCall property of the JavaScriptTrHtml relation to true and inline the JavaScriptTrHtml relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].omitFunctionCall = true;
                assetGraph
                    .inlineRelations({type: 'JavaScriptTrHtml'})
                    .run(this.callback);
            },
            'the TRHTML expression should be replaced with a string with the contents of the Html asset': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*(['"])<html><body>Boo!<\/body><\/html>\\n\1/);
            },
            'then manipulate the Html asset': {
                topic: function (assetGraph) {
                    var htmlAsset = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                        document = htmlAsset.parseTree;
                    document.body.appendChild(document.createElement('div')).appendChild(document.createTextNode('foo'));
                    htmlAsset.markDirty();
                    return assetGraph;
                },
                'the href getter of the JavaScriptTrHtml relation should still return undefined': function (assetGraph) {
                    assert.isUndefined(assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].href);
                },
                'the string literal in the JavaScript should be updated': function (assetGraph) {
                    assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*(['"])<html><body>Boo!<div>foo<\/div><\/body><\/html>\\n\1/);
                },
                'then externalize the Html asset pointed to by the JavaScriptTrHtml relation': {
                    topic: function (assetGraph) {
                        assetGraph.findAssets({type: 'Html', isInline: true})[0].url = 'http://example.com/template.html';
                        return assetGraph;
                    },
                    'the string literal should be replaced by a TRHTML(GETTEXT(...)) expression pointing at the new url': function (assetGraph) {
                        assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*TRHTML\(GETTEXT\((['"])http:\/\/example\.com\/template\.html\1\)\)/);
                    },
                    'then update the href of the JavaScriptTrHtml relation': {
                        topic: function (assetGraph) {
                            var javaScriptTrHtml = assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0];
                            javaScriptTrHtml.href = 'blah';
                            javaScriptTrHtml.from.markDirty();
                            return assetGraph;
                        },
                        'the href getter of the JavaScriptTrHtml relation should return the new value': function (assetGraph) {
                            assert.equal(assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].href, 'blah');
                        },
                        'TRHTML(GETTEXT(...)) expression should be updated': function (assetGraph) {
                            assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*TRHTML\(GETTEXT\((['"])blah\1\)\)/);
                        }
                    }
                }
            }
        }
    },
    'After loading a test case with a JavaScriptTrHtml relation consisting of TRHTML(GETTEXT(...))': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptTrHtml/TrHtmlGetText/'})
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
        'the graph should contain 1 JavaScriptTrHtml relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptTrHtml'}).length, 1);
        },
        'the graph should contain no JavaScriptGetText relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptGetText'}).length, 0);
        },
        'then set the omitFunctionCall property of the JavaScriptTrHtml relation to true and inline the JavaScriptTrHtml relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'JavaScriptTrHtml'})[0].omitFunctionCall = true;
                assetGraph
                    .inlineRelations({type: 'JavaScriptTrHtml'})
                    .run(this.callback);
            },
            'the TRHTML expression should be replaced with a string with the contents of the Html asset': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*(['"])<html><body>Boo!<\/body><\/html>\\n\1/);
            },
            'then manipulate the Html asset': {
                topic: function (assetGraph) {
                    var htmlAsset = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                        document = htmlAsset.parseTree;
                    document.body.appendChild(document.createElement('div')).appendChild(document.createTextNode('foo'));
                    htmlAsset.markDirty();
                    return assetGraph;
                },
                'the string literal in the JavaScript should be updated': function (assetGraph) {
                    assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*(['"])<html><body>Boo!<div>foo<\/div><\/body><\/html>\\n\1/);
                },
                'then externalize the Html asset pointed to by the JavaScriptTrHtml relation': {
                    topic: function (assetGraph) {
                        assetGraph.findAssets({type: 'Html', isInline: true})[0].url = 'http://example.com/template.html';
                        return assetGraph;
                    },
                    'the string literal should be replaced by a TRHTML(GETTEXT(...)) expression pointing at the new url': function (assetGraph) {
                        assert.matches(assetGraph.findAssets({type: 'JavaScript'})[0].text, /var myHtmlString\s*=\s*TRHTML\(GETTEXT\((['"])http:\/\/example\.com\/template\.html\1\)\)/);
                    }
                }
            }
        }
    }
})['export'](module);
