/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    _ = require('lodash');

describe('transforms/splitCssIfIeLimitIsReached', function () {
    it('should handle a simple Css test case', function (done) {
        var infos = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .on('info', function (err) {
                infos.push(err);
            })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var cssAssets = assetGraph.findAssets({type: 'Css'});
                expect(cssAssets, 'to have length', 1);
                assetGraph._parseTreeBefore = cssAssets[0].parseTree;
                expect(assetGraph.findAssets({type: 'Css'})[0].parseTree.cssRules, 'to have length', 4096);
            })
            .splitCssIfIeLimitIsReached()
            .queue(function (assetGraph) {
                expect(infos, 'to have length', 1);

                expect(assetGraph, 'to contain assets', 'Css', 2);

                expect(assetGraph.findAssets({ type: 'Css' }).map(function (cssAsset) {
                    return cssAsset.parseTree.cssRules.length;
                }).reduce(function (prev, current) {
                    return prev + current;
                }, 0), 'to equal', 4096);

                // Each Css asset should be smaller than the original
                assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
                    expect(cssAsset.parseTree.cssRules.length, 'to be less than', assetGraph._parseTreeBefore.cssRules.length);
                });

                var cssAfter = new AssetGraph.Css({
                    text: assetGraph.findAssets({type: 'Css'}).map(function (cssAsset) {
                        return cssAsset.text;
                    }).join('')
                }).parseTree.toString();

                expect(assetGraph._parseTreeBefore.toString(), 'to equal', cssAfter);

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
            })
            .run(done);
    });

    it('should handle a real life huge Css test case', function (done) {
        var infos = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .on('info', function (err) {
                infos.push(err);
            })
            .loadAssets('falcon.html')
            .populate()
            .queue(function (assetGraph) {
                var cssAssets = assetGraph.findAssets({type: 'Css'});
                expect(cssAssets, 'to have length', 1);

                assetGraph._parseTreeBefore = cssAssets[0].parseTree;

                var rules = assetGraph.findAssets({ type: 'Css' })[0].parseTree.cssRules.length;
                assetGraph.__rules = rules;
                expect(rules, 'to equal', 6290);

                ['png', 'gif', 'svg', 'ttf', 'eot', 'woff'].forEach(function (extension) {
                    expect(assetGraph, 'to contain asset', {
                        url: new RegExp('\\.' + extension + '(?:$|#)')
                    }, 1);
                });

                expect(assetGraph, 'to contain assets', {url: /fake\./}, 7);
            })
            .splitCssIfIeLimitIsReached()
            .queue(function (assetGraph) {
                expect(infos, 'to have length', 1);
                expect(assetGraph, 'to contain assets', 'Css', 3);

                expect(assetGraph.findAssets({type: 'Css'}).map(function (cssAsset) {
                    return cssAsset.parseTree.cssRules.length;
                }).reduce(function (prev, current) {
                    return prev + current;
                }, 0), 'to equal', 6290);

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

                var text = assetGraph.findAssets({type: 'Css'}).map(function (cssAsset) {
                        return cssAsset.text;
                    }).join('\n'),
                parseTreeAfter = new AssetGraph.Css({
                    text: text
                }).parseTree;

                expect(assetGraph._parseTreeBefore.toString(), 'to equal', parseTreeAfter.toString());

                ['png', 'gif', 'svg', 'ttf', 'eot', 'woff'].forEach(function (extension) {
                    expect(assetGraph, 'to contain asset', {
                        url: new RegExp('\\.' + extension + '(?:$|#)')
                    });
                });
            })
            .run(done);
    });

    it('should handle a test case with an inline stylesheet', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets('inline.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {rulesPerStylesheetLimit: 2})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 3);
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
                expect(_.pluck(assetGraph.findAssets({type: 'Css'}), 'text'), 'to equal',
                    [
                        '.a {color: #aaa;}.b {color: #bbb;}',
                        '.c {color: #ccc;}.d {color: #ddd;}',
                        '.e {color: #eee;}'
                    ]
                );
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    matchInlineStylesheets = htmlAsset.text.match(/<style type="text\/css">/g);
                expect(matchInlineStylesheets, 'to be ok');
                expect(matchInlineStylesheets, 'to have length', 3);
            })
            .run(done);
    });

    it('should handle a test case with an inline stylesheet that has rules in media queries', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets('inlineWithMedia.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {rulesPerStylesheetLimit: 3})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 4);
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
                expect(_.pluck(assetGraph.findAssets({type: 'Css'}), 'text'), 'to equal',
                    [
                        '@media screen {.a, .quux, .baz {color: #aaa;}}',
                        '.b {color: #bbb;}.c {color: #ccc;}',
                        '@media print {.d {color: #ddd;}.e {color: #eee;}.f {color: #fff;}}',
                        '.hey {color: #000;}.there {color: #fff;}'
                    ]
                );

                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    matchInlineStylesheets = htmlAsset.text.match(/<style type="text\/css">/g);
                expect(matchInlineStylesheets, 'to be ok');
                expect(matchInlineStylesheets, 'to have length', 4);
            })
            .run(done);
    });

    it('should leave a big stylesheet alone if minimumIeVersion is 10', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><body><style type="text/css">' + new Array(5000).join('body {color: red;}') + '</style></body></html>'
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {minimumIeVersion: 10})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .run(done);
    });

    it('should split an enourmous stylesheet if minimumIeVersion is 10', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><body><style type="text/css">' + new Array(65536).join('body {color: red;}') + '</style></body></html>'
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {minimumIeVersion: 10})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 2);
            })
            .run(done);
    });

    it('should leave an enourmous stylesheet alone if minimumIeVersion is null', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><body><style type="text/css">' + new Array(65536).join('body {color: red;}') + '</style></body></html>'
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {minimumIeVersion: null})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .run(done);
    });

    it('should split a big stylesheet alone if minimumIeVersion is 9', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><body><style type="text/css">' + new Array(5000).join('body {color: red;}') + '</style></body></html>'
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {minimumIeVersion: 9})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 2);
            })
            .run(done);
    });
});
