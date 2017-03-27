var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/');

describe('bundleWebpack', function () {
    it('should create a bundle consisting of a single file', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleWebpack/simple/'})
            .loadAssets('index.html')
            .bundleWebpack()
            .populate({followRelations: {type: AssetGraph.query.not('SourceMapSource')}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /index\.html$/} }, 1);
                expect(assetGraph, 'to contain asset', {
                    type: 'JavaScript',
                    fileName: /bundle/
                });
                expect(assetGraph.findRelations({
                    from: { url: /index\.html$/ },
                    to: { fileName: /bundle/ }
                })[0].to.text, 'to contain', 'alert(\'main!\');');
            });
    });

    it('should create a bundle consisting of a single file with a different publicPath', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleWebpack/publicPath/'})
            .loadAssets('index.html')
            .bundleWebpack()
            .populate({followRelations: {type: AssetGraph.query.not('SourceMapSource')}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /index\.html$/} }, 1);
                expect(assetGraph, 'to contain asset', {
                    type: 'JavaScript',
                    fileName: /bundle/
                });
                expect(assetGraph.findRelations({
                    from: { url: /index\.html$/ },
                    to: { fileName: /bundle/ }
                })[0].to.text, 'to contain', 'alert(\'main!\');');
            });
    });

    it('should discover relations in the bundle', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleWebpack/relationInBundle/'})
            .loadAssets('index.html')
            .bundleWebpack()
            .populate({followRelations: {type: AssetGraph.query.not('SourceMapSource')}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Json');
                expect(assetGraph, 'to contain relation', { type: 'JavaScriptStaticUrl', to: { fileName: /^[a-f0-9]{32}\.json$/ } });
            });
    });

    it('should pick up source maps from webpack', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleWebpack/sourceMaps/'})
            .loadAssets('index.html')
            .bundleWebpack()
            .populate()
            .applySourceMaps()
            .queue(function (assetGraph) {
                var alertInScriptWithoutExistingSourceMap;
                var firstGetBoundingClientRectNode;
                require('estraverse').traverse(assetGraph.findAssets({fileName: 'bundle.js'})[0].parseTree, {
                    enter: function (node) {
                        if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'alert' &&
                            node.arguments.length === 1 && node.arguments[0].value === 'noExistingSourceMap') {

                            alertInScriptWithoutExistingSourceMap = alertInScriptWithoutExistingSourceMap || node;
                        } else if (node.type === 'Identifier' && node.name === 'getBoundingClientRect') {
                            firstGetBoundingClientRectNode = firstGetBoundingClientRectNode || node;
                        }
                    }
                });
                expect(alertInScriptWithoutExistingSourceMap, 'to satisfy', {
                    loc: {
                        source: assetGraph.root + 'noExistingSourceMap.js',
                        start: {
                            line: 3
                        }
                    }
                });
                expect(firstGetBoundingClientRectNode, 'to satisfy', {
                    loc: {
                        source: assetGraph.root + 'jquery-1.10.1.js',
                        start: {
                            line: 9591
                        }
                    }
                });
            });
    });

    it('should pick up CSS assets in the output bundles', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleWebpack/css/'})
            .loadAssets('index.html')
            .bundleWebpack()
            .applySourceMaps()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relation', {type: 'HtmlStyle', href: '/dist/main.css', from: { type: 'Html' }, to: { type: 'Css' }});
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', '<link rel="stylesheet" href="/dist/main.css');
            });
    });

    it('should not build unused bundles', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleWebpack/namedUnusedBundles/'})
            .loadAssets('index.html')
            .bundleWebpack()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', { fileName: 'bundle.main.js', isLoaded: true })
                    .and('to contain no asset', { fileName: 'bundle.unused.js' });
            });
    });
});
