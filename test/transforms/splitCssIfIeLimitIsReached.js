/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const _ = require('lodash');

describe('transforms/splitCssIfIeLimitIsReached', function () {
    it('should handle a simple Css test case', function () {
        const infos = [];
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .on('info', function (err) {
                infos.push(err);
            })
            .loadAssets('index.html')
            .populate()
            .queue(assetGraph => {
                const cssAssets = assetGraph.findAssets({type: 'Css'});
                expect(cssAssets, 'to have length', 1);
                assetGraph._parseTreeBefore = cssAssets[0].parseTree;

                expect(assetGraph.findAssets({type: 'Css'})[0].parseTree.nodes, 'to have length', 4096);
            })
            .splitCssIfIeLimitIsReached()
            .then(assetGraph => {
                expect(infos, 'to have length', 1);

                expect(assetGraph, 'to contain assets', 'Css', 2);

                expect(assetGraph.findAssets({ type: 'Css' }).map(
                    cssAsset => cssAsset.parseTree.nodes.length
                ).reduce(
                    (prev, current) => prev + current,
                    0
                ), 'to equal', 4096);

                // Each Css asset should be smaller than the original
                for (const cssAsset of assetGraph.findAssets({type: 'Css'})) {
                    expect(cssAsset.parseTree.nodes.length, 'to be less than', assetGraph._parseTreeBefore.nodes.length);
                }

                const cssAfter = new AssetGraph.Css({
                    text: assetGraph.findAssets({type: 'Css'}).map(function (cssAsset) {
                        return cssAsset.text;
                    }).join('')
                }).parseTree.toString();

                expect(assetGraph._parseTreeBefore.toString(), 'to equal', cssAfter + '\n');

                const cssAssets = assetGraph.findAssets({
                    type: 'Css'
                });
                const pngRelations = assetGraph.findRelations({
                    to: {
                        type: 'Png'
                    }
                });

                expect(pngRelations, 'to have length', 1);
                expect(pngRelations[0].from, 'to be', cssAssets[1]);
            });
    });

    it('should handle a real life huge Css test case', function () {
        const infos = [];
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .on('info', function (err) {
                infos.push(err);
            })
            .loadAssets('falcon.html')
            .populate()
            .queue(assetGraph => {
                const cssAssets = assetGraph.findAssets({type: 'Css'});
                expect(cssAssets, 'to have length', 1);

                assetGraph._parseTreeBefore = cssAssets[0].parseTree;

                const rules = assetGraph.findAssets({ type: 'Css' })[0].parseTree.nodes.length;
                assetGraph.__rules = rules;
                expect(rules, 'to equal', 6039);

                for (const extension of ['png', 'gif', 'svg', 'ttf', 'eot', 'woff']) {
                    expect(assetGraph, 'to contain asset', {
                        url: new RegExp('\\.' + extension + '(?:$|#)')
                    }, 1);
                }

                expect(assetGraph, 'to contain assets', {url: /fake\./}, 7);
            })
            .splitCssIfIeLimitIsReached()
            .then(assetGraph => {
                expect(infos, 'to have length', 1);
                expect(assetGraph, 'to contain assets', 'Css', 3);

                expect(assetGraph.findAssets({type: 'Css'}).map(
                    cssAsset => cssAsset.parseTree.nodes.length
                ).reduce(
                    (prev, current) => prev + current,
                    0
                ), 'to equal', 6039);

                const cssAssets = assetGraph.findAssets({type: 'Css'});
                const parseTreeBefore = assetGraph._parseTreeBefore;
                const rules = [2796, 2544, 699];
                let sum = 0;

                for (const [i, cssAsset] of cssAssets.entries()) {
                    const assetRules = cssAsset.parseTree.nodes;
                    expect(assetRules.length, 'to be less than', parseTreeBefore.nodes.length);
                    expect(assetRules.length, 'to equal', rules[i]);
                    sum += assetRules.length;
                }

                expect(sum, 'to equal', assetGraph.__rules);

                const text = assetGraph.findAssets({type: 'Css'}).map(
                    cssAsset => cssAsset.text
                ).join('\n');
                const parseTreeAfter = new AssetGraph.Css({ text }).parseTree;

                expect(assetGraph._parseTreeBefore.toString().replace(/\n+/g, '\n'), 'to equal', (parseTreeAfter.toString() + '\n').replace(/\n+/g, '\n'));

                for (const extension of ['png', 'gif', 'svg', 'ttf', 'eot', 'woff']) {
                    expect(assetGraph, 'to contain asset', {
                        url: new RegExp('\\.' + extension + '(?:$|#)')
                    });
                }
            });
    });

    it('should handle a test case with an inline stylesheet', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets('inline.html')
            .populate()
            .queue(assetGraph => {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {rulesPerStylesheetLimit: 2})
            .then(assetGraph => {
                expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 3);
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 3);
                expect(_.map(assetGraph.findAssets({type: 'Css'}), 'text'), 'to equal',
                    [
                        '\n          .a {color: #aaa;}\n          .b {color: #bbb;}',
                        '\n          .c {color: #ccc;}\n          .d {color: #ddd;}',
                        '\n          .e {color: #eee;}'
                    ]
                );
                const htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                const matchInlineStylesheets = htmlAsset.text.match(/<style type="text\/css">/g);
                expect(matchInlineStylesheets, 'to be ok');
                expect(matchInlineStylesheets, 'to have length', 3);
            });
    });

    it('should handle a test case with an inline stylesheet that has rules in media queries', function () {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets('inlineWithMedia.html')
            .populate()
            .queue(assetGraph => {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {rulesPerStylesheetLimit: 3})
            .then(assetGraph => {
                expect(assetGraph, 'to contain assets', {type: 'Css', isInline: true}, 4);
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
                expect(_.map(assetGraph.findAssets({type: 'Css'}), 'text'), 'to equal',
                    [
                        '\n          @media screen {\n              .a, .quux, .baz {color: #aaa;}\n          }',
                        '\n          .b {color: #bbb;}\n          .c {color: #ccc;}',
                        '\n          @media print {\n             .d {color: #ddd;}\n             .e {color: #eee;}\n             .f {color: #fff;}\n          }',
                        '\n          .hey {color: #000;}\n          .there {color: #fff;}'
                    ]
                );

                const htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                const matchInlineStylesheets = htmlAsset.text.match(/<style type="text\/css">/g);
                expect(matchInlineStylesheets, 'to be ok');
                expect(matchInlineStylesheets, 'to have length', 4);
            });
    });

    it('should leave a big stylesheet alone if minimumIeVersion is 10', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><body><style type="text/css">' + new Array(5000).join('body {color: red;}') + '</style></body></html>'
            })
            .populate()
            .queue(assetGraph => {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {minimumIeVersion: 10})
            .then(assetGraph => {
                expect(assetGraph, 'to contain asset', 'Css');
            });
    });

    it('should split an enourmous stylesheet if minimumIeVersion is 10', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><body><style type="text/css">' + new Array(65536).join('body {color: red;}') + '</style></body></html>'
            })
            .populate()
            .queue(assetGraph => {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {minimumIeVersion: 10})
            .then(assetGraph => {
                expect(assetGraph, 'to contain assets', 'Css', 2);
            });
    });

    it('should leave an enourmous stylesheet alone if minimumIeVersion is null', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><body><style type="text/css">' + new Array(65536).join('body {color: red;}') + '</style></body></html>'
            })
            .populate()
            .queue(assetGraph => {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {minimumIeVersion: null})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
            });
    });

    it('should split a big stylesheet alone if minimumIeVersion is 9', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/splitCssIfIeLimitIsReached/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/foo.html',
                text: '<!DOCTYPE html><html><body><style type="text/css">' + new Array(5000).join('body {color: red;}') + '</style></body></html>'
            })
            .populate()
            .queue(assetGraph => {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
            })
            .splitCssIfIeLimitIsReached({}, {minimumIeVersion: 9})
            .queue(assetGraph => expect(assetGraph, 'to contain assets', 'Css', 2));
    });
});
