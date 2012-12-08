var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('INCLUDE test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptInclude/topLevelStatements/'})
                .loadAssets('index.js')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
        },
        'the graph should contain 2 JavaScriptInclude relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptInclude'}).length, 2);
        },
        'then detach and remove the first JavaScriptInclude relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'JavaScriptInclude'})[0].detach();
                return assetGraph;
            },
            'the INCLUDE(\'foo.js\') statement should be removed from the text of index.js': function (assetGraph) {
                assert.isFalse(/one\.include\([\'\"]one\.js\1\)/.test(assetGraph.findAssets({url: /\/index\.js$/})[0].text));
            }
        },
        'then attach a new JavaScriptInclude relation before the other ones': {
            topic: function (assetGraph) {
                var newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'quux.js'),
                    text: "alert('quux.js');"
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'first');
                return assetGraph;
            },
            'the INCLUDE statements should be in the correct order': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'),
                                 ['quux.js', 'bar.js']);
            },
            'then attach a new JavaScriptInclude relation after the quux.js one': {
                topic: function (assetGraph) {
                    var newJavaScriptAsset = new AssetGraph.JavaScript({
                        url: urlTools.resolveUrl(assetGraph.root, 'baz.js'),
                        text: "alert('baz.js');"
                    });
                    assetGraph.addAsset(newJavaScriptAsset);
                    new AssetGraph.JavaScriptInclude({
                        to: newJavaScriptAsset
                    }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'after', assetGraph.findRelations({to: {url: /\/quux\.js$/}})[0]);
                    return assetGraph;
                },
                'the INCLUDE statements should be in the correct order': function (assetGraph) {
                    assert.deepEqual(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'),
                                     ['quux.js', 'baz.js', 'bar.js']);
                },
                'then attach a new JavaScriptInclude relation before the bar.js one': {
                    topic: function (assetGraph) {
                        var newJavaScriptAsset = new AssetGraph.JavaScript({
                            url: urlTools.resolveUrl(assetGraph.root, 'bazze.js'),
                            text: "alert('bazze.js');"
                        });
                        assetGraph.addAsset(newJavaScriptAsset);
                        new AssetGraph.JavaScriptInclude({
                            to: newJavaScriptAsset
                        }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'before', assetGraph.findRelations({to: {url: /\/bar\.js$/}})[0]);
                        return assetGraph;
                    },
                    'the INCLUDE statements should be in the correct order': function (assetGraph) {
                        assert.deepEqual(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'),
                                         ['quux.js', 'baz.js', 'bazze.js', 'bar.js']);
                    },
                    'then attach a new JavaScriptInclude relation in the last position': {
                        topic: function (assetGraph) {
                            var newJavaScriptAsset = new AssetGraph.JavaScript({
                                url: urlTools.resolveUrl(assetGraph.root, 'prinzenrolle.js'),
                                text: "alert('prinzenrolle.js');"
                            });
                            assetGraph.addAsset(newJavaScriptAsset);
                            new AssetGraph.JavaScriptInclude({
                                to: newJavaScriptAsset
                            }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'last');
                            return assetGraph;
                        },
                        'the INCLUDE statements should be in the correct order': function (assetGraph) {
                            assert.deepEqual(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'),
                                             ['quux.js', 'baz.js', 'bazze.js', 'bar.js', 'prinzenrolle.js']);
                        }
                    }
                }
            }
        }
    },
    'After loading a the same test case with original INCLUDE statements in one sequenced statement': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptInclude/sequencedStatements/'})
                .loadAssets('index.js')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
        },
        'the graph should contain 2 JavaScriptInclude relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptInclude'}).length, 2);
        },
        'then detach the first JavaScriptInclude relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'JavaScriptInclude'})[0].detach();
                return assetGraph;
            },
            'the INCLUDE(\'foo.js\') statement should be removed from the text of index.js': function (assetGraph) {
                assert.isFalse(/one\.include\([\'\"]one\.js\1\)/.test(assetGraph.findAssets({url: /\/index\.js$/})[0].text));
            }
        },
        'then attach a new JavaScriptInclude relation before the other ones': {
            topic: function (assetGraph) {
                var newJavaScriptAsset = new AssetGraph.JavaScript({
                    url: urlTools.resolveUrl(assetGraph.root, 'quux.js'),
                    text: "alert('quux.js');"
                });
                assetGraph.addAsset(newJavaScriptAsset);
                new AssetGraph.JavaScriptInclude({
                    to: newJavaScriptAsset
                }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'first');
                return assetGraph;
            },
            'the INCLUDE statements should be in the correct order': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'),
                                 ['quux.js', 'bar.js']);
            },
            'then attach a new JavaScriptInclude relation after the quux.js one': {
                topic: function (assetGraph) {
                    var newJavaScriptAsset = new AssetGraph.JavaScript({
                        url: urlTools.resolveUrl(assetGraph.root, 'baz.js'),
                        text: "alert('baz.js');"
                    });
                    assetGraph.addAsset(newJavaScriptAsset);
                    new AssetGraph.JavaScriptInclude({
                        to: newJavaScriptAsset
                    }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'after', assetGraph.findRelations({to: {url: /\/quux\.js$/}})[0]);
                    return assetGraph;
                },
                'the INCLUDE statements should be in the correct order': function (assetGraph) {
                    assert.deepEqual(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'),
                                     ['quux.js', 'baz.js', 'bar.js']);
                },
                'then attach a new JavaScriptInclude relation before the bar.js one': {
                    topic: function (assetGraph) {
                        var newJavaScriptAsset = new AssetGraph.JavaScript({
                            url: urlTools.resolveUrl(assetGraph.root, 'bazze.js'),
                            text: "alert('bazze.js');"
                        });
                        assetGraph.addAsset(newJavaScriptAsset);
                        new AssetGraph.JavaScriptInclude({
                            to: newJavaScriptAsset
                        }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'before', assetGraph.findRelations({to: {url: /\/bar\.js$/}})[0]);
                        return assetGraph;
                    },
                    'the INCLUDE statements should be in the correct order': function (assetGraph) {
                        assert.deepEqual(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'),
                                         ['quux.js', 'baz.js', 'bazze.js', 'bar.js']);
                    },
                    'then attach a new JavaScriptInclude relation in the last position': {
                        topic: function (assetGraph) {
                            var newJavaScriptAsset = new AssetGraph.JavaScript({
                                url: urlTools.resolveUrl(assetGraph.root, 'prinzenrolle.js'),
                                text: "alert('prinzenrolle.js');"
                            });
                            assetGraph.addAsset(newJavaScriptAsset);
                            new AssetGraph.JavaScriptInclude({
                                to: newJavaScriptAsset
                            }).attach(assetGraph.findAssets({url: /\/index\.js$/})[0], 'last');
                            return assetGraph;
                        },
                        'the INCLUDE statements should be in the correct order': function (assetGraph) {
                            assert.deepEqual(_.pluck(assetGraph.findRelations({from: {url: /\/index\.js$/}}), 'href'),
                                             ['quux.js', 'baz.js', 'bazze.js', 'bar.js', 'prinzenrolle.js']);
                        }
                    }
                }
            }
        }
    }
})['export'](module);
