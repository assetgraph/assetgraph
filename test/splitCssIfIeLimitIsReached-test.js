var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib'),
    _ = require('underscore'),
    cssText = '';

vows.describe('transforms.splitCssIfIeLimitIsReached').addBatch({
    'After loading a simple Css test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/splitCssIfIeLimitIsReached/'})
/*
                // debug
                .on('addAsset', function (asset) {
                    console.warn('Added: ' + asset.url);
                })
                .on('addRelation', function (relation) {
                    console.warn('Added: ' + relation.from.url + ' --> ' + relation.to.url);
                })
                .on('removeAsset', function (asset) {
                    console.warn('Removed: ' + asset.url);
                })
                .on('removeRelation', function (relation) {
                    console.warn('Removed: ' + relation.from.url + ' --> ' + relation.to.url);
                })
*/
                .loadAssets('index.html')
                .populate()
                .minifyAssets({ type: 'Css', isLoaded: true})
                .run(this.callback);
        },
        'the graph should contain 1 Css asset': function (assetGraph) {
            var cssAssets = assetGraph.findAssets({type: 'Css'});

            assert.equal(cssAssets.length, 1);

            cssText = cssAssets.map(function (cssAsset) {
                return cssAsset.text;
            }).join('');
        },
        'the Css asset should contain 4096 rules': function (assetGraph) {
            assert.equal(assetGraph.findAssets({ type: 'Css' })[0].parseTree.cssRules.length, 4096);
        },
        'then running the splitCssIfIeLimitIsReached transform': {
            topic: function (assetGraph) {
                assetGraph.__infos = [];

                assetGraph
                    .on('info', function (err) {
                        assetGraph.__infos.push(err);
                    })
                    .splitCssIfIeLimitIsReached()
                    .minifyAssets({ type: 'Css', isLoaded: true})
                    .run(this.callback);
            },
            'the graph should have 1 emitted info': function (assetGraph) {
                assert.equal(assetGraph.__infos.length, 1);
            },
            'the graph should contain 2 Css asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
            },
            'the Css assets should contain 4096 rules': function (assetGraph) {
                assert.equal(assetGraph.findAssets({ type: 'Css' }).map(function (cssAsset) {
                    return cssAsset.parseTree.cssRules.length;
                }).reduce(function (prev, current) {
                    return prev + current;
                }, 0), 4096);
            },
            'each Css asset should be smaller than the original': function (assetGraph) {
                assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
                    assert(cssAsset.text.length < cssText.length, cssAsset.url);
                });
            },
            'the concatenated css text content should be unchanged from before': function (assetGraph) {
                var text = '';
                assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
                    text += cssAsset.text;
                });

                assert(text === cssText, 'Concatenation of text of split up css assets differ from original');
            },
            'the background image should have an incoming relation from the second new css asset': function (assetGraph) {
                var cssAssets = assetGraph.findAssets({
                        type: 'Css'
                    }),
                    pngRelations = assetGraph.findRelations({
                        to: {
                            type: 'Png'
                        }
                    });

                assert.equal(pngRelations.length, 1);
                assert.equal(pngRelations[0].from, cssAssets[1]);
            }
        }
    },

    'After loading a real life huge Css test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/splitCssIfIeLimitIsReached/'})
                .loadAssets('falcon.html')
                .populate()
                .minifyAssets({ type: 'Css', isLoaded: true})
                .mergeIdenticalAssets({
                    isLoaded: true
                })
                .run(this.callback);
        },
        'the graph should contain 1 Css asset': function (assetGraph) {
            var cssAssets = assetGraph.findAssets({type: 'Css'});

            assert.equal(cssAssets.length, 1);

            cssText = cssAssets.map(function (cssAsset) {
                return cssAsset.text;
            }).join('');
        },
        'the Css asset should contain 6290 rules': function (assetGraph) {
            var rules = assetGraph.findAssets({ type: 'Css' })[0].parseTree.cssRules.length;
            assetGraph.__rules = rules;
            assert.equal(rules, 6290);
        },
        'the graph should have 1 of each of asset types "png", "gif", "svg", "ttf", "eot", "woff"': function (assetGraph) {
            ['png', 'gif', 'svg', 'ttf', 'eot', 'woff'].forEach(function (extension) {
                assert.equal(assetGraph.findAssets({
                    url: new RegExp('\\.' + extension + '(?:$|#)')
                }).length, 1);
            });
        },
        'the graph should contain 6 files named fake.*': function (assetGraph) {
            assert.equal(assetGraph.findAssets({
                url: /fake\./
            }).length, 6);
        },
        'then running the splitCssIfIeLimitIsReached transform': {
            topic: function (assetGraph) {
                assetGraph.__infos = [];

                assetGraph
                    .on('info', function (err) {
                        assetGraph.__infos.push(err);
                    })
                    .splitCssIfIeLimitIsReached()
                    .minifyAssets({ type: 'Css', isLoaded: true})
                    .run(this.callback);
            },
            'the graph should have 1 emitted info': function (assetGraph) {
                assert.equal(assetGraph.__infos.length, 1);
            },
            'the graph should contain 3 Css asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 3);
            },
            'the Css assets should contain 6290 rules': function (assetGraph) {
                assert.equal(assetGraph.findAssets({ type: 'Css' }).map(function (cssAsset) {
                    return cssAsset.parseTree.cssRules.length;
                }).reduce(function (prev, current) {
                    return prev + current;
                }, 0), 6290);
            },
            'each Css asset should be smaller than the original': function (assetGraph) {
                var cssAssets = assetGraph.findAssets({type: 'Css'}),
                    rules = [2806, 2399, 1085],
                    sum = 0;

                cssAssets.forEach(function (cssAsset, idx) {
                    var assetRules = cssAsset.parseTree.cssRules.length;
                    assert(cssAsset.text.length < cssText.length);
                    assert.equal(assetRules, rules[idx]);
                    sum += assetRules;
                });

                assert.equal(sum, assetGraph.__rules);
            },
            'the concatenated css text content should be unchanged from before': function (assetGraph) {
                var text = '';
                assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
                    text += cssAsset.text;
                });

                assert(text === cssText, 'Concatenation of text of split up css assets differ from original');
            },
            'the graph should have 1 of each of asset types "png", "gif", "svg", "ttf", "eot", "woff"': function (assetGraph) {
                ['png', 'gif', 'svg', 'ttf', 'eot', 'woff'].forEach(function (extension) {
                    assert.equal(assetGraph.findAssets({
                        url: new RegExp('\\.' + extension + '(?:$|#)')
                    }).length, 1);
                });
            }
        }
    },
    'After loading a test case with an inline stylesheet': {
        topic: function () {
            new AssetGraph({root: __dirname + '/splitCssIfIeLimitIsReached/'})
                .loadAssets('inline.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 2);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'then running the splitCssIfIeLimitIsReached transform': {
            topic: function (assetGraph) {
                assetGraph
                    .splitCssIfIeLimitIsReached({}, {rulesPerStylesheetLimit: 2})
                    .run(this.callback);
            },
            'the graph should contain 3 inline Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css', isInline: true}).length, 3);
            },
            'the graph should contain 3 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 3);
            },
            'the Css assets should have the expected contents': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findAssets({type: 'Css'}), 'text'),
                    [
                        '.a {color: #aaa;}.b {color: #bbb;}',
                        '.c {color: #ccc;}.d {color: #ddd;}',
                        '.e {color: #eee;}'
                    ]
                );
            },
            'the Html asset should contain 3 inline stylesheets': function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    matchInlineStylesheets = htmlAsset.text.match(/<style type="text\/css">/g);
                assert.ok(matchInlineStylesheets);
                assert.equal(matchInlineStylesheets.length, 3);
            }
        }
    },
    'After loading a test case with an inline that has rules in media queries': {
        topic: function () {
            new AssetGraph({root: __dirname + '/splitCssIfIeLimitIsReached/'})
                .loadAssets('inlineWithMedia.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 2);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'then running the splitCssIfIeLimitIsReached transform': {
            topic: function (assetGraph) {
                assetGraph
                    .splitCssIfIeLimitIsReached({}, {rulesPerStylesheetLimit: 3})
                    .run(this.callback);
            },
            'the graph should contain 4 inline Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css', isInline: true}).length, 4);
            },
            'the graph should contain 4 HtmlStyle relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 4);
            },
            'the Css assets should have the expected contents': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findAssets({type: 'Css'}), 'text'),
                    [
                        '@media screen {.a, .quux, .baz {color: #aaa;}}',
                        '.b {color: #bbb;}.c {color: #ccc;}',
                        '@media print {.d {color: #ddd;}.e {color: #eee;}.f {color: #fff;}}',
                        '.hey {color: #000;}.there {color: #fff;}'
                    ]
                );
            },
            'the Html asset should contain 4 inline stylesheets': function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    matchInlineStylesheets = htmlAsset.text.match(/<style type="text\/css">/g);
                assert.ok(matchInlineStylesheets);
                assert.equal(matchInlineStylesheets.length, 4);
            }
        }
    }
})['export'](module);
