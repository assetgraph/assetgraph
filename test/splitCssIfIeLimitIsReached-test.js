var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    _ = require('underscore');

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
                .run(this.callback);
        },
        'the graph should contain 1 Css asset': function (assetGraph) {
            var cssAssets = assetGraph.findAssets({type: 'Css'});

            expect(cssAssets, 'to have length', 1);

            assetGraph._parseTreeBefore = cssAssets[0].parseTree;
        },
        'the Css asset should contain 4096 rules': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Css'})[0].parseTree.cssRules, 'to have length', 4096);
        },
        'then running the splitCssIfIeLimitIsReached transform': {
            topic: function (assetGraph) {
                assetGraph.__infos = [];

                assetGraph
                    .on('info', function (err) {
                        assetGraph.__infos.push(err);
                    })
                    .splitCssIfIeLimitIsReached()
                    .run(this.callback);
            },
            'the graph should have 1 emitted info': function (assetGraph) {
                expect(assetGraph.__infos, 'to have length', 1);
            },
            'the graph should contain 2 Css asset': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 2);
            },
            'the Css assets should contain 4096 rules': function (assetGraph) {
                expect(assetGraph.findAssets({ type: 'Css' }).map(function (cssAsset) {
                    return cssAsset.parseTree.cssRules.length;
                }).reduce(function (prev, current) {
                    return prev + current;
                }, 0), 'to equal', 4096);
            },
            'each Css asset should be smaller than the original': function (assetGraph) {
                assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
                    expect(cssAsset.parseTree.cssRules.length, 'to be less than', assetGraph._parseTreeBefore.cssRules.length);
                });
            },
            'the concatenated css text content should be unchanged from before': function (assetGraph) {
                var cssAfter = new AssetGraph.Css({
                    text: assetGraph.findAssets({type: 'Css'}).map(function (cssAsset) {
                        return cssAsset.text;
                    }).join('')
                }).parseTree.toString();

                expect(assetGraph._parseTreeBefore.toString(), 'to equal', cssAfter);
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

                expect(pngRelations, 'to have length', 1);
                expect(pngRelations[0].from, 'to be', cssAssets[1]);
            }
        }
    },
    'After loading a real life huge Css test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/splitCssIfIeLimitIsReached/'})
                .loadAssets('falcon.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 Css asset': function (assetGraph) {
            var cssAssets = assetGraph.findAssets({type: 'Css'});

            expect(cssAssets, 'to have length', 1);

            assetGraph._parseTreeBefore = cssAssets[0].parseTree;
        },
        'the Css asset should contain 6290 rules': function (assetGraph) {
            var rules = assetGraph.findAssets({ type: 'Css' })[0].parseTree.cssRules.length;
            assetGraph.__rules = rules;
            expect(rules, 'to equal', 6290);
        },
        'the graph should have 1 of each of asset types "png", "gif", "svg", "ttf", "eot", "woff"': function (assetGraph) {
            ['png', 'gif', 'svg', 'ttf', 'eot', 'woff'].forEach(function (extension) {
                expect(assetGraph, 'to contain asset', {
                    url: new RegExp('\\.' + extension + '(?:$|#)')
                }, 1);
            });
        },
        'the graph should contain 7 files named fake.*': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {url: /fake\./}, 7);
        },
        'then running the splitCssIfIeLimitIsReached transform': {
            topic: function (assetGraph) {
                assetGraph.__infos = [];

                assetGraph
                    .on('info', function (err) {
                        assetGraph.__infos.push(err);
                    })
                    .splitCssIfIeLimitIsReached()
                    .run(this.callback);
            },
            'the graph should have 1 emitted info': function (assetGraph) {
                expect(assetGraph.__infos, 'to have length', 1);
            },
            'the graph should contain 3 Css asset': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 3);
            },
            'the Css assets should contain 6290 rules': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Css'}).map(function (cssAsset) {
                    return cssAsset.parseTree.cssRules.length;
                }).reduce(function (prev, current) {
                    return prev + current;
                }, 0), 'to equal', 6290);
            },
            'each Css asset should be smaller than the original': function (assetGraph) {
                var cssAssets = assetGraph.findAssets({type: 'Css'}),
                    parseTreeBefore = assetGraph._parseTreeBefore,
                    rules = [2806, 2399, 1085],
                    sum = 0;

                cssAssets.forEach(function (cssAsset, idx) {
                    var assetRules = cssAsset.parseTree.cssRules;
                    expect(assetRules.length, 'to be less than', parseTreeBefore.cssRules.length);
                    expect(assetRules.length, 'to equal', rules[idx]);
                    sum += assetRules.length;
                });

                expect(sum, 'to equal', assetGraph.__rules);
            },
            'the concatenated css text content should be unchanged from before': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Css'}).map(function (cssAsset) {
                            return cssAsset.text;
                        }).join('\n'),
                    parseTreeAfter = new AssetGraph.Css({
                        text: text
                    }).parseTree;

                expect(assetGraph._parseTreeBefore.toString(), 'to equal', parseTreeAfter.toString());
            },
            'the graph should have 1 of each of asset types "png", "gif", "svg", "ttf", "eot", "woff"': function (assetGraph) {
                ['png', 'gif', 'svg', 'ttf', 'eot', 'woff'].forEach(function (extension) {
                    expect(assetGraph, 'to contain asset', {
                        url: new RegExp('\\.' + extension + '(?:$|#)')
                    });
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
            expect(assetGraph, 'to contain assets', 2);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain one Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'then running the splitCssIfIeLimitIsReached transform': {
            topic: function (assetGraph) {
                assetGraph
                    .splitCssIfIeLimitIsReached({}, {rulesPerStylesheetLimit: 2})
                    .run(this.callback);
            },
            'the graph should contain 3 inline Css assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 3);
            },
            'the graph should contain 3 HtmlStyle relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
            },
            'the Css assets should have the expected contents': function (assetGraph) {
                expect(_.pluck(assetGraph.findAssets({type: 'Css'}), 'text'), 'to equal',
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
                expect(matchInlineStylesheets, 'to be ok');
                expect(matchInlineStylesheets, 'to have length', 3);
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
            expect(assetGraph, 'to contain assets', 2);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain one Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'then running the splitCssIfIeLimitIsReached transform': {
            topic: function (assetGraph) {
                assetGraph
                    .splitCssIfIeLimitIsReached({}, {rulesPerStylesheetLimit: 3})
                    .run(this.callback);
            },
            'the graph should contain 4 inline Css assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 4);
            },
            'the graph should contain 4 HtmlStyle relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
            },
            'the Css assets should have the expected contents': function (assetGraph) {
                expect(_.pluck(assetGraph.findAssets({type: 'Css'}), 'text'), 'to equal',
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
                expect(matchInlineStylesheets, 'to be ok');
                expect(matchInlineStylesheets, 'to have length', 4);
            }
        }
    }
})['export'](module);
