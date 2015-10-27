/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/bundleSystemJs', function () {
    it('should handle a simple test case', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/simple/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /index\.html$/} }, 3);
                expect(assetGraph.systemJsConfig, 'to satisfy', {
                    configStatements: expect.it('to have length', 1),
                    topLevelSystemImportCalls: expect.it('to have length', 1)
                });
            })
            .bundleSystemJs()
            .assumeRequireJsConfigHasBeenFound() // And System.js
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /index\.html$/} }, 4);
                expect(assetGraph, 'to contain asset', {
                    type: 'JavaScript',
                    fileName: /bundle/
                });
                expect(assetGraph.findRelations({ from: { url: /index\.html$/} })[2].to.text, 'to contain', 'alert(\'main!\');');
                expect(assetGraph.findRelations({
                    from: { url: /index\.html$/ },
                    to: { fileName: /bundle/ }
                })[0].to.text, 'to contain', 'alert(\'main!\');');
            })
            .bundleRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);
            });
    });

    it('should pick up the source map information', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/simple/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .bundleSystemJs()
            .assumeRequireJsConfigHasBeenFound() // And System.js
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({
                    type: 'JavaScript',
                    fileName: /bundle/
                })[0].parseTree, 'to satisfy', {
                    body: {
                        0: {
                            loc: {
                                source: assetGraph.root + 'main.js'
                            }
                        }
                    }
                });
            });
    });

    it('should handle a simple test case with an extra System.config call', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/simpleWithExtraConfigCall/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no relation', 'JavaScriptSystemImport');
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /index\.html$/} }, 4);
                expect(assetGraph.systemJsConfig, 'to satisfy', {
                    configStatements: expect.it('to have length', 2),
                    topLevelSystemImportCalls: expect.it('to have length', 1)
                });
            })
            .bundleSystemJs()
            .assumeRequireJsConfigHasBeenFound() // And System.js
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /index\.html$/} }, 5);
                expect(assetGraph, 'to contain asset', {
                    type: 'JavaScript',
                    fileName: /bundle/
                });
            })
            .bundleRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);
            });
    });

    it('should handle a complex test case', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/test-tree/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate({ followRelations: { type: AssetGraph.query.not('JavaScriptSystemImport') } })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /index\.html$/} }, 4);
                expect(assetGraph.systemJsConfig, 'to satisfy', {
                    configStatements: expect.it('to have length', 2),
                    topLevelSystemImportCalls: expect.it('to have length', 1)
                });
            })
            .bundleSystemJs()
            .assumeRequireJsConfigHasBeenFound() // And System.js
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /index\.html$/ } }, 5);
                expect(assetGraph, 'to contain asset', {
                    type: 'JavaScript',
                    fileName: /bundle/
                });
            })
            .bundleRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);
            });
    });

    it('should handle a multi-page test case with one System.import call per page importing the same thing', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/multiPageOneSystemImportEach/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('*.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /page1\.html$/} }, 3);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /page2\.html$/} }, 3);
                expect(assetGraph.systemJsConfig, 'to satisfy', {
                    configStatements: expect.it('to have length', 1),
                    topLevelSystemImportCalls: expect.it('to have length', 2)
                });
            })
            .bundleSystemJs()
            .assumeRequireJsConfigHasBeenFound() // And System.js
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 6);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /page1\.html$/} }, 4);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /page2\.html$/} }, 4);
                // FIXME: Expect the two to be the same bundle asset?
                expect(assetGraph, 'to contain assets', {
                    type: 'JavaScript',
                    fileName: /bundle/
                }, 2);
                expect(assetGraph.findRelations({
                    from: { url: /page1\.html$/ },
                    to: { fileName: /bundle/ }
                })[0].to.text, 'to contain', 'alert(\'main!\');');
                expect(assetGraph.findRelations({
                    from: { url: /page2\.html$/ },
                    to: { fileName: /bundle/ }
                })[0].to.text, 'to contain', 'alert(\'main!\');');
            })
            .bundleRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            });
    });

    it('should handle a multi-page test case with one System.import call per page importing different things', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/multiPageDifferentSystemImports/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('*.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /page1\.html$/} }, 3);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /page2\.html$/} }, 3);
                expect(assetGraph.systemJsConfig, 'to satisfy', {
                    configStatements: expect.it('to have length', 1),
                    topLevelSystemImportCalls: expect.it('to have length', 2)
                });
            })
            .bundleSystemJs()
            .assumeRequireJsConfigHasBeenFound() // And System.js
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 6);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /page1\.html$/} }, 4);
                expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { url: /page2\.html$/} }, 4);
                expect(assetGraph, 'to contain assets', {
                    type: 'JavaScript',
                    fileName: /bundle/
                }, 2);
                expect(assetGraph.findRelations({
                    from: { url: /page1\.html$/ },
                    to: { fileName: /bundle/ }
                })[0].to.text, 'to contain', 'alert(\'main!\');');
                expect(assetGraph.findRelations({
                    from: { url: /page2\.html$/ },
                    to: { fileName: /bundle/ }
                })[0].to.text, 'to contain', 'alert(\'otherMain!\');');
            })
            .bundleRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            });
    });

    it('should handle a test case with a template plugin', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/templatePlugin/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            })
            .bundleSystemJs()
            .assumeRequireJsConfigHasBeenFound() // And System.js
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relation', 'SystemJsBundle');
            })
            .populate()
            .inlineKnockoutJsTemplates()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no relations', 'SystemJsBundle');
                expect(assetGraph, 'to contain relation', 'HtmlInlineScriptTemplate');
            });
    });

    it('should handle a test case with a css plugin', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/cssPlugin/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 1);
                expect(assetGraph, 'to contain no assets', 'Css');
            })
            .bundleSystemJs()
            .populate({startAssets: {type: 'JavaScript'}})
            .assumeRequireJsConfigHasBeenFound() // And System.js
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relation', 'SystemJsBundle');
            })
            .populate({ startAssets: { type: 'JavaScript' } })
            .flattenStaticIncludes()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no relations', 'SystemJsBundle');
                expect(assetGraph, 'to contain relation', 'HtmlStyle');
            });
    });

    it('should error out if two pages include the same System.config assets in different orders', function () {
        return expect(
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/conflictingSystemConfigs/'})
                .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
                .loadAssets('page*.html')
                .populate()
                .bundleSystemJs(),
            'to be rejected with', new Error('bundleSystemJs transform: System.config calls come in conflicting order across pages')
        );
    });

    it('should error out if two pages include the same System.config assets in different orders, second scenario', function () {
        return expect(
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/conflictingSystemConfigs2/'})
                .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
                .loadAssets('page*.html')
                .populate()
                .bundleSystemJs(),
            'to be rejected with', new Error('bundleSystemJs transform: System.config calls come in conflicting order across pages')
        );
    });

    it('should error out if two pages include conflicting System.js configs', function () {
        return expect(
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/conflictingSystemConfigs3/'})
                .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
                .loadAssets('page*.html')
                .populate()
                .bundleSystemJs(),
            'to be rejected with', new Error('bundleSystemJs transform: Configs conflict')
        );
    });

    it('should handle a lazy import System.import case', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/lazySystemImport/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .bundleSystemJs({ deferredImports: true })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'SystemJsLazyBundle');
            });
    });

    it('should handle a multi-page lazy import System.import case', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/multiPageLazySystemImport/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('*.html')
            .populate()
            .bundleSystemJs({ deferredImports: true })
            .queue(function (assetGraph) {
                expect(
                    assetGraph.findAssets({ url: /\/page1\.html$/})[0].text,
                    'to contain',
                    'System.config({bundles:'
                );
                expect(
                    assetGraph.findAssets({ url: /\/page1\.html$/})[0].text,
                    'to contain',
                    '<script src="bundle-page1.js"></script><script>System.config({bundles:{\'bundle-lazyrequired.js\':[\'lazyRequired.js\']}});</script><script>'
                );
                expect(
                    assetGraph.findAssets({ url: /\/page2\.html$/})[0].text,
                    'to contain',
                    '<script src="bundle-page2.js"></script><script>System.config({bundles:{\'bundle-lazyrequired.js\':[\'lazyRequired.js\']}});</script><script>'
                );
                expect(assetGraph, 'to contain relation', 'SystemJsLazyBundle', 2);
            })
            .moveAssetsInOrder({ type: 'JavaScript' }, function (asset, assetGraph) {
                if (assetGraph.findRelations({ type: 'SystemJsLazyBundle', to: asset }).length > 0) {
                    return assetGraph.root + 'static/foobar-' + asset.fileName;
                }
            })
            .queue(function (assetGraph) {
                expect(
                    assetGraph.findAssets({ url: /\/page1\.html$/})[0].text,
                    'to contain',
                    'System.config({bundles:{\'static/'
                );
                expect(
                    assetGraph.findAssets({ url: /\/page2\.html$/})[0].text,
                    'to contain',
                    'System.config({bundles:{\'static/'
                );
            });
    });

    it('should handle a System.import test case with a manual bundle', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/manualBundle/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .bundleSystemJs({ deferredImports: true })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {fileName: 'foo.js'});
                expect(assetGraph.findAssets({fileName: 'foo.js'})[0].text, 'to contain', 'a.js').and('to contain', 'b.js');

                expect(assetGraph.findAssets({fileName: 'common-bundle.js'})[0].text, 'not to contain', 'a.js').and('not to contain', 'b.js');
            });
    });

    it('should allow multiple identical definitions of the same manual bundle', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/duplicateManualBundle/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .bundleSystemJs({ deferredImports: true })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {fileName: 'foo.js'});
                expect(assetGraph.findAssets({fileName: 'foo.js'})[0].text, 'to contain', 'a.js').and('to contain', 'b.js');
            });
    });

    it('should error out if the same manual bundle is defined multiple times', function () {
        return expect(
            new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleSystemJs/conflictingManualBundles/'})
                .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
                .loadAssets('index.html')
                .populate()
                .bundleSystemJs({ deferredImports: true }),
            'to be rejected with',
            new Error('bundleSystemJs transform: Conflicting definitions of the manual bundle foo')
        );
    });
});
