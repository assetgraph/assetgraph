/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const estraverse = require('estraverse-fb');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/bundleSystemJs', function () {
    it('should handle a simple test case', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/simple/')});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain assets', 'JavaScript', 3);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'index.html' } }, 3);

        await assetGraph.bundleSystemJs();

        expect(assetGraph, 'to contain assets', 'JavaScript', 4);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'index.html' } }, 4);
        expect(assetGraph, 'to contain asset', {
            type: 'JavaScript',
            fileName: { $regex: /bundle/ }
        });
        expect(assetGraph.findRelations({ from: { fileName: 'index.html' } })[2].to.text, 'to contain', 'alert(\'main!\');');
        expect(assetGraph.findRelations({
            from: { fileName: 'index.html' },
            to: { fileName: { $regex: /bundle/ } }
        })[0].to.text, 'to contain', 'alert(\'main!\');');

        await assetGraph.bundleRelations();

        expect(assetGraph, 'to contain assets', 'JavaScript', 1);
    });

    it('should pick up the source map information', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/simple/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs();

        let numNodesWithCorrectLoc = 0;
        estraverse.traverse(assetGraph.findAssets({
            type: 'JavaScript',
            fileName: { $regex: /bundle/ }
        })[0].parseTree, {
            enter(node) {
                if (node.loc && node.loc.source === assetGraph.root + 'main.js') {
                    numNodesWithCorrectLoc += 1;
                }
            }
        });
        expect(numNodesWithCorrectLoc, 'to be greater than or equal to', 1);
    });

    it('should handle a simple test case with an extra System.config call', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/simpleWithExtraConfigCall/')});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain no relation', 'JavaScriptSystemImport');
        expect(assetGraph, 'to contain assets', 'JavaScript', 4);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'index.html' } }, 4);

        await assetGraph.bundleSystemJs()
            .populate();

        expect(assetGraph, 'to contain assets', 'JavaScript', 5);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'index.html' } }, 5);
        expect(assetGraph, 'to contain asset', {
            type: 'JavaScript',
            fileName: { $regex: /bundle/ }
        });

        await assetGraph.bundleRelations();

        expect(assetGraph, 'to contain assets', 'JavaScript', 1);
    });

    it('should handle a complex test case', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/test-tree/')});
        await assetGraph.loadAssets('index.html')
            .populate({ followRelations: { type: { $not: 'JavaScriptSystemImport' } } });

        expect(assetGraph, 'to contain assets', 'JavaScript', 4);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'index.html' } }, 4);

        await assetGraph.bundleSystemJs();

        expect(assetGraph, 'to contain assets', 'JavaScript', 5);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'index.html' } }, 5);
        expect(assetGraph, 'to contain asset', {
            type: 'JavaScript',
            fileName: { $regex: /bundle/ }
        });

        await assetGraph.bundleRelations();

        expect(assetGraph, 'to contain assets', 'JavaScript', 1);
    });

    it('should handle a multi-page test case with one System.import call per page importing the same thing', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/multiPageOneSystemImportEach/')});
        await assetGraph.loadAssets('*.html')
            .populate();

        expect(assetGraph, 'to contain assets', 'Html', 2);
        expect(assetGraph, 'to contain assets', 'JavaScript', 4);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'page1.html' } }, 3);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'page2.html' } }, 3);

        await assetGraph.bundleSystemJs();

        expect(assetGraph, 'to contain assets', 'JavaScript', 5);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'page1.html' } }, 4);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'page2.html' } }, 4);
        expect(assetGraph, 'to contain asset', {
            type: 'JavaScript',
            fileName: { $regex: /bundle/ }
        });
        expect(assetGraph.findRelations({
            from: { fileName: 'page1.html' },
            to: { fileName: { $regex: /bundle/ } }
        })[0].to.text, 'to contain', 'alert(\'main!\');');
        expect(assetGraph.findRelations({
            from: { fileName: 'page2.html' },
            to: { fileName: { $regex: /bundle/ } }
        })[0].to.text, 'to contain', 'alert(\'main!\');');

        await assetGraph.bundleRelations();

        expect(assetGraph, 'to contain assets', 'JavaScript', 2);
    });

    it('should handle a multi-page test case with one System.import call per page importing different modules with nothing in common, one of them using a condition', async function () {
        await new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/multiPageNothingInCommon/')})
            .loadAssets('*.html')
            .populate()
            .bundleSystemJs();
    });

    it('should handle a multi-page test case with one System.import call per page importing different things', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/multiPageDifferentSystemImports/')});
        await assetGraph.loadAssets('*.html')
            .populate();

        expect(assetGraph, 'to contain assets', 'Html', 2);
        expect(assetGraph, 'to contain assets', 'JavaScript', 4);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'page1.html' } }, 3);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'page2.html' } }, 3);

        await assetGraph.bundleSystemJs();

        expect(assetGraph, 'to contain assets', 'JavaScript', 6);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'page1.html' } }, 4);
        expect(assetGraph, 'to contain relations', { type: 'HtmlScript', from: { fileName: 'page2.html' } }, 4);
        expect(assetGraph, 'to contain assets', {
            type: 'JavaScript',
            fileName: { $regex: /bundle/ }
        }, 2);
        expect(assetGraph.findRelations({
            from: { fileName: 'page1.html' },
            to: { fileName: { $regex: /bundle/ } }
        })[0].to.text, 'to contain', 'alert(\'main!\');');
        expect(assetGraph.findRelations({
            from: { fileName: 'page2.html' },
            to: { fileName: { $regex: /bundle/ } }
        })[0].to.text, 'to contain', 'alert(\'otherMain!\');');

        await assetGraph.bundleRelations();

        expect(assetGraph, 'to contain assets', 'JavaScript', 2);
    });

    it('should only deduplicate asset list entries (as determined by the url)', async function () {
        // The tpl.js in this test has been tweaked to list each template twice
        // in the asset list
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/assetList/sameAssetListEntryTwice/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs();

        expect(assetGraph, 'to contain asset', {isFragment: true});
    });

    it('should add a SystemJsBundle relation to a non-Css entry in the asset list', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/assetList/template/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs();

        expect(assetGraph, 'to contain asset', {fileName: 'foo.html', type: 'Html', isFragment: true});
        expect(assetGraph, 'to contain relations', {type: 'SystemJsBundle'}, 1);
        expect(assetGraph.findAssets({fileName: 'common-bundle.js'})[0].text, 'to contain', '//# SystemJsBundle=/foo.html');
    });

    it('should add a SystemJsBundle relation to a conditional non-Css entry in the asset list', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/assetList/conditionalTemplate/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs();

        expect(assetGraph, 'to contain assets', {type: 'Html', isFragment: true}, 2);
        expect(assetGraph, 'to contain relations', {type: 'SystemJsBundle'}, 2);
        expect(assetGraph.findAssets({fileName: 'bundle-main-sunny.js'})[0].text, 'to contain', '//# SystemJsBundle=/foo-sunny.html')
            .and('not to contain', 'rainy');
        expect(assetGraph.findAssets({fileName: 'bundle-main-rainy.js'})[0].text, 'to contain', '//# SystemJsBundle=/foo-rainy.html')
            .and('not to contain', 'sunny');
    });

    it('should add a SystemJsBundle relation to a conditional non-Css entry in the asset list in a multi-page setting', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/assetList/multiPageConditionalTemplate/')});
        await assetGraph.loadAssets(['index1.html', 'index2.html'])
            .populate()
            .bundleSystemJs({
                conditions: {
                    weather: ['rainy', 'sunny']
                }
            })
            .populate();

        expect(assetGraph, 'to contain assets', {type: 'Html', isFragment: true}, 3);
        expect(assetGraph, 'to contain relations', {type: 'SystemJsBundle'}, 4);

        await assetGraph.inlineHtmlTemplates({type: 'Html'});

        expect(assetGraph, 'to contain relations', {type: 'HtmlInlineScriptTemplate'}, 6);
        expect(assetGraph, 'to contain relations', {type: 'SystemJsBundle'}, 0);
    });

    it('should handle a test case with a css plugin', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/cssPlugin/')});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain assets', 'Html', 1);
        expect(assetGraph, 'to contain no assets', 'Css');

        await assetGraph
            .bundleSystemJs()
            .populate({startAssets: {type: 'JavaScript'}});

        expect(assetGraph, 'to contain asset', 'Css');
        expect(assetGraph, 'to contain no relations', 'SystemJsBundle');
        expect(assetGraph, 'to contain relation', 'HtmlStyle');
    });

    it('should handle a test case with a less plugin', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/lessPlugin/')});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain assets', 'Html', 1);
        expect(assetGraph, 'to contain no assets', 'Css');

        await assetGraph
            .bundleSystemJs()
            .populate({startAssets: {type: 'JavaScript'}});

        expect(assetGraph, 'to contain asset', 'Css');
        expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', '<link rel="stylesheet" href="/styles.less">');
    });

    describe('with systemjs-plugin-less', function () {
        describe('and all JavaScript assets marked for removal via data-systemjs-remove', function () {
            it('should remove system.js and the configuration and not inject the bundle', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/onlyLess/')});
                await assetGraph.loadAssets('index.html')
                    .populate({
                        followRelations: { type: { $not: 'JavaScriptSourceMappingUrl' } }
                    });

                expect(assetGraph, 'to contain assets', 'Html', 1);
                expect(assetGraph, 'to contain no assets', 'Css');

                await assetGraph
                    .bundleSystemJs()
                    .populate({
                        followRelations: { type: { $not: 'JavaScriptSourceMappingUrl' } }
                    });

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain', '<link rel="stylesheet" href="/styles.less">');
                expect(assetGraph, 'to contain no asset', 'JavaScript');
                expect(assetGraph, 'to contain asset', 'Css');
            });
        });
    });

    it('should error out if two pages include the same System.config assets in different orders', async function () {
        await expect(
            new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conflictingSystemConfigs/')})
                .loadAssets('page*.html')
                .populate()
                .bundleSystemJs(),
            'to be rejected with', new Error('bundleSystemJs transform: System.config calls come in conflicting order across pages')
        );
    });

    it('should error out if two pages include the same System.config assets in different orders, second scenario', async function () {
        await expect(
            new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conflictingSystemConfigs2/')})
                .loadAssets('page*.html')
                .populate()
                .bundleSystemJs(),
            'to be rejected with', new Error('bundleSystemJs transform: System.config calls come in conflicting order across pages')
        );
    });

    it('should error out if two pages include conflicting System.js configs', async function () {
        await expect(
            new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conflictingSystemConfigs3/')})
                .loadAssets('page*.html')
                .populate()
                .bundleSystemJs(),
            'to be rejected with', new Error('bundleSystemJs transform: Configs conflict')
        );
    });

    it('should handle a lazy import System.import case', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/lazySystemImport/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs({ deferredImports: true });

        expect(assetGraph, 'to contain relation', 'SystemJsLazyBundle');
    });

    it('should handle a multi-page lazy import System.import case', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/multiPageLazySystemImport/')});
        await assetGraph.loadAssets('*.html')
            .populate()
            .bundleSystemJs({ deferredImports: true });

        expect(
            assetGraph.findAssets({ fileName: 'page1.html' })[0].text,
            'to contain',
            'System.config({ bundles:'
        );
        expect(
            assetGraph.findAssets({ fileName: 'page1.html' })[0].text,
            'to contain',
            '<script src="/bundle-page1.js"></script><script>System.config({ bundles: { \'bundle-lazyrequired.js\': [\'lazyRequired.js\'] } });</script><script>'
        );
        expect(
            assetGraph.findAssets({ fileName: 'page2.html' })[0].text,
            'to contain',
            '<script src="/bundle-page2.js"></script><script>System.config({ bundles: { \'bundle-lazyrequired.js\': [\'lazyRequired.js\'] } });</script><script>'
        );
        expect(assetGraph, 'to contain relation', 'SystemJsLazyBundle', 2);

        await assetGraph.moveAssetsInOrder({ type: 'JavaScript' }, function (asset, assetGraph) {
            if (assetGraph.findRelations({ type: 'SystemJsLazyBundle', to: asset }).length > 0) {
                return assetGraph.root + 'static/foobar-' + asset.fileName;
            }
        });

        expect(
            assetGraph.findAssets({ fileName: 'page1.html' })[0].text,
            'to contain',
            'System.config({ bundles: { \'static/'
        );
        expect(
            assetGraph.findAssets({ fileName: 'page2.html' })[0].text,
            'to contain',
            'System.config({ bundles: { \'static/'
        );
    });

    it('should handle the use of system.js in a web worker', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/webWorker/')});
        await assetGraph.loadAssets('*.html')
            .populate();

        expect(assetGraph, 'to contain relations', 'JavaScriptImportScripts', 2);

        await assetGraph.bundleSystemJs();

        expect(assetGraph, 'to contain relations', 'JavaScriptImportScripts', 3);
        expect(assetGraph.findAssets({fileName: 'worker.js'})[0].text, 'to contain', "importScripts('system.js', 'config.js', '/common-bundle.js')");
    });

    it('should handle the use of system.js in a service worker registered via <link rel="serviceworker" href=...>', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/HtmlServiceWorkerRegistration/')});
        await assetGraph.loadAssets('*.html')
            .populate();

        expect(assetGraph, 'to contain relations', 'JavaScriptImportScripts', 2);

        await assetGraph.bundleSystemJs();

        expect(assetGraph, 'to contain relations', 'JavaScriptImportScripts', 3);
        expect(assetGraph.findAssets({fileName: 'sw.js'})[0].text, 'to contain', "importScripts('system.js', 'config.js', '/common-bundle.js')");
    });

    it('should handle the use of system.js in a service worker registered via navigator.serviceWorker.register(...)', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/JavaScriptServiceWorkerRegistration/')});
        await assetGraph.loadAssets('*.html')
            .populate();

        expect(assetGraph, 'to contain relations', 'JavaScriptImportScripts', 2);

        await assetGraph.bundleSystemJs();

        expect(assetGraph, 'to contain relations', 'JavaScriptImportScripts', 3);
        expect(assetGraph.findAssets({fileName: 'sw.js'})[0].text, 'to contain', "importScripts('system.js', 'config.js', '/common-bundle.js')");
    });

    it('should handle a System.import test case with a manual bundle', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/manualBundle/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs({ deferredImports: true });

        expect(assetGraph, 'to contain asset', {fileName: 'foo.js'});
        expect(assetGraph.findAssets({fileName: 'foo.js'})[0].text, 'to contain', 'a.js').and('to contain', 'b.js');

        expect(assetGraph.findAssets({fileName: 'common-bundle.js'})[0].text, 'not to contain', 'a.js').and('not to contain', 'b.js');
    });

    it('should allow multiple identical definitions of the same manual bundle', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/duplicateManualBundle/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs({ deferredImports: true });

        expect(assetGraph, 'to contain asset', {fileName: 'foo.js'});
        expect(assetGraph.findAssets({fileName: 'foo.js'})[0].text, 'to contain', 'a.js').and('to contain', 'b.js');
    });

    it('should error out if the same manual bundle is defined multiple times', async function () {
        return expect(
            new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conflictingManualBundles/')})
                .loadAssets('index.html')
                .populate()
                .bundleSystemJs({ deferredImports: true }),
            'to be rejected with',
            new Error('bundleSystemJs transform: Conflicting definitions of the manual bundle foo')
        );
    });

    describe('with a data-systemjs-polyfill attribute', function () {
        it('should remove the data-systemjs-polyfill attribute', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/polyfill/simple/')});
            await assetGraph.loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 1);
            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

            await assetGraph
                .bundleSystemJs()
                .populate();

            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
            expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
            expect(assetGraph.findAssets({type: 'Html'})[0].text, 'not to contain', 'data-systemjs-polyfill');
        });

        it('should polyfill system.js when instructed to', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/polyfill/simple/')});
            await assetGraph.loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 1);
            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

            await assetGraph
                .bundleSystemJs({ polyfill: true })
                .populate();

            expect(assetGraph, 'to contain assets', 'JavaScript', 4);
            expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 4);
        });

        describe('that has no value', function () {
            it('should polyfill system.js', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/polyfill/noValue/')});
                await assetGraph.loadAssets('index.html')
                    .populate();

                expect(assetGraph, 'to contain assets', 'Html', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

                await assetGraph
                    .bundleSystemJs({ polyfill: true })
                    .populate();

                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 4);
            });
        });
    });

    describe('with a data-systemjs-csp-production attribute', function () {
        it('should remove the data-systemjs-csp-production attribute', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/replacement/simple/')});
            await assetGraph.loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 1);
            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

            await assetGraph
                .bundleSystemJs()
                .populate();

            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
            expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
            expect(assetGraph.findAssets({type: 'Html'})[0].text, 'not to contain', 'data-system-csp-production');
            expect(assetGraph, 'to contain no assets', { fileName: 'system.js' });
        });

        it('should replace system.js with the referenced asset', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/replacement/simple/')});
            await assetGraph.loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 1);
            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

            await assetGraph
                .bundleSystemJs()
                .populate();

            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
            expect(assetGraph, 'to contain asset', {fileName: 'system-csp-production.js'});
        });

        describe('that has no value', function () {
            it('should replace system.js with the default system-csp-production.js', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/replacement/noValue/')});
                await assetGraph.loadAssets('index.html')
                    .populate();

                expect(assetGraph, 'to contain assets', 'Html', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);

                await assetGraph
                    .bundleSystemJs()
                    .populate();

                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
                expect(assetGraph, 'to contain asset', {fileName: 'system-csp-production.js'});
            });
        });
    });

    it('should pick up assets referenced via an asset plugin', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/assetPlugin/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs()
            .populate();

        expect(assetGraph, 'to contain assets', 'Text', 2);
        expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 2);
        assetGraph.findAssets({fileName: 'test-foo.txt'})[0].fileName = 'somethingElse.txt';
        expect(assetGraph.findAssets({fileName: 'bundle-main-foo.js'})[0].text, 'to contain', "'/somethingElse.txt'.toString('url')")
            .and('not to contain', "'/test-foo.txt'.toString('url')");
    });

    it('should pick up assets referenced via an asset plugin using a wildcard', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/assetPluginWithWildcard/')});
        await assetGraph.loadAssets('index.html')
            .populate()
            .bundleSystemJs()
            .populate();

        expect(assetGraph, 'to contain assets', 'Text', 2);
        expect(assetGraph, 'to contain relations', 'JavaScriptStaticUrl', 2);
        assetGraph.findAssets({fileName: 'test-foo.txt'})[0].fileName = 'somethingElse.txt';
        expect(assetGraph.findAssets({fileName: 'common-bundle.js'})[0].text, 'to contain', "'/somethingElse.txt'.toString('url')")
            .and('not to contain', "'/test-foo.txt'.toString('url')")
            .and('to contain', "System.registerDynamic('test-*.txt!systemjs-asset-plugin/asset-plugin.js'");
    });

    describe('with a buildConfig property in a System.config({...})', function () {
        it('should apply the build config during the build', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/buildConfig/')});
            await assetGraph.loadAssets('index.html')
                .populate()
                .bundleSystemJs()
                .populate();

            expect(assetGraph, 'to contain asset', {fileName: 'styles.css'});
        });

        it('should remove the buildConfig and testConfig properties after building', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/buildConfig/')});
            await assetGraph.loadAssets('index.html')
                .populate()
                .bundleSystemJs()
                .populate();

            expect(assetGraph.findAssets({fileName: 'build-config.js'})[0].text, 'not to contain', 'buildConfig')
                .and('not to contain', 'testConfig');
        });

        it('should remove the System.config call if there is no other properties after removing the buildConfig property', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/buildConfigWithNothingElse/')});
            await assetGraph.loadAssets('index.html')
                .populate()
                .bundleSystemJs()
                .populate();

            expect(assetGraph.findAssets({fileName: 'build-config.js'})[0].text, 'not to contain', 'System.config');
        });

        it('should remove the System.config call in a SequenceExpression if there is no other properties after removing the buildConfig property', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/buildConfigWithNothingElseInASequenceExpression/')});
            await assetGraph.loadAssets('index.html')
                .populate()
                .bundleSystemJs()
                .populate();

            expect(assetGraph.findAssets({fileName: 'build-config.js'})[0].text, 'not to contain', 'System.config')
                .and('to contain', 'console.log');
        });
    });

    describe('with conditionals', async function () {
        describe('when specifying a single value of the a conditional up front', async function () {
            it('should exclude the unneeded branches from the created bundle', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/exclude/')});
                await assetGraph.loadAssets('index.html')
                    .populate()
                    .bundleSystemJs({
                        conditions: {
                            lang: 'en_us'
                        }
                    })
                    .populate();

                const bundleAsset = assetGraph.findAssets({fileName: 'common-bundle.js'})[0];
                expect(bundleAsset.text, 'to contain', 'American English')
                    .and('not to contain', 'Danish')
                    .and('to contain', 'neededInAllLanguages')
                    .and('to contain', 'neededInAmericanEnglish')
                    .and('not to contain', 'neededInDanish')
                    .and('not to contain', 'Math.random');
            });
        });

        describe('when specifying multiple values of a conditional up front', async function () {
            it('should trace the provided values of the conditional (and only those)', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/multipleValuesGiven/')});
                await assetGraph.loadAssets('index.html')
                    .populate()
                    .bundleSystemJs({
                        conditions: {
                            'whichTest.js': ['foo', 'quux']
                        }
                    })
                    .populate();

                const commonBundleAsset = assetGraph.findAssets({fileName: 'common-bundle.js'})[0];
                expect(commonBundleAsset.text, 'to contain', 'foo')
                    .and('not to contain', 'quux')
                    .and('not to contain', 'bar');

                const fooBundleAsset = assetGraph.findAssets({fileName: 'bundle-main-foo.js'})[0];
                expect(fooBundleAsset.text, 'to contain', "alert('foo')")
                    .and('not to contain', "alert('bar');")
                    .and('not to contain', "alert('quux');");

                const quuxBundleAsset = assetGraph.findAssets({fileName: 'bundle-main-quux.js'})[0];
                expect(quuxBundleAsset.text, 'to contain', "alert('quux')")
                    .and('not to contain', "alert('bar');")
                    .and('not to contain', "alert('foo');");

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<script src="[^"]+"[^>]*>/g), 'to equal', [
                    '<script src="system.js">',
                    '<script src="config.js">',
                    '<script src="/common-bundle.js">',
                    '<script src="/bundle-main-foo.js" data-assetgraph-conditions="\'whichTest.js|default\': \'foo\'">',
                    '<script src="/bundle-main-quux.js" data-assetgraph-conditions="\'whichTest.js|default\': \'quux\'">'
                ]);
            });

            describe('with a plugin providing a value based on the conditional', async function () {
                it('should trace the provided values of the conditional', async function () {
                    const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/pluginAndMultipleValuesGiven/')});
                    await assetGraph.loadAssets('index.html')
                        .populate()
                        .bundleSystemJs({
                            conditions: {
                                'locale.js': ['en_us', 'da']
                            }
                        })
                        .populate();

                    expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<script src="[^"]+"[^>]*>/g), 'to equal', [
                        '<script src="system.js">',
                        '<script src="config.js">',
                        '<script src="/common-bundle.js">',
                        '<script src="/bundle-main-en_us.js" data-assetgraph-conditions="\'locale.js|default\': \'en_us\'">',
                        '<script src="/bundle-main-da.js" data-assetgraph-conditions="\'locale.js|default\': \'da\'">'
                    ]);
                    const commonBundleAsset = assetGraph.findAssets({fileName: 'common-bundle.js'})[0];
                    expect(commonBundleAsset.text, 'not to contain', "alert('en_us')").and('not to contain', "alert('da');");

                    const americanEnglishBundleAsset = assetGraph.findAssets({fileName: 'bundle-main-en_us.js'})[0];
                    expect(americanEnglishBundleAsset.text, 'to contain', "alert('en_us')").and('not to contain', "alert('da');");

                    const danishBundleAsset = assetGraph.findAssets({fileName: 'bundle-main-da.js'})[0];
                    expect(danishBundleAsset.text, 'to contain', "alert('da')").and('not to contain', "alert('en_us');");
                });
            });
        });

        describe('with unspecified conditionals', async function () {
            it('should create separate bundles per variant', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/oneBundlePerVariant/')});
                await assetGraph.loadAssets('index.html')
                    .populate()
                    .bundleSystemJs()
                    .populate();

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<script src="[^"]+"[^>]*>/g), 'to equal', [
                    '<script src="system.js">',
                    '<script src="config.js">',
                    '<script src="/common-bundle.js">',
                    '<script src="/bundle-main-da.js" data-assetgraph-conditions="\'lang.js|default\': \'da\'">',
                    '<script src="/bundle-main-en_us.js" data-assetgraph-conditions="\'lang.js|default\': \'en_us\'">'
                ]);
                expect(assetGraph.findAssets({fileName: 'common-bundle.js'})[0].text, 'to contain', 'System.registerDynamic(\'lang.js');
            });

            it('should support independent conditionals', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/twoIndependentConditionals/')});
                await assetGraph.loadAssets('index.html')
                    .populate()
                    .bundleSystemJs()
                    .populate();

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<script src="[^"]+"[^>]*>/g), 'to equal', [
                    '<script src="system.js">',
                    '<script src="config.js">',
                    '<script src="/common-bundle.js">',
                    '<script src="/bundle-main-rainy.js" data-assetgraph-conditions="\'weather.js|default\': \'rainy\'">',
                    '<script src="/bundle-main-sunny.js" data-assetgraph-conditions="\'weather.js|default\': \'sunny\'">',
                    '<script src="/bundle-main-da.js" data-assetgraph-conditions="\'lang.js|default\': \'da\'">',
                    '<script src="/bundle-main-en_us.js" data-assetgraph-conditions="\'lang.js|default\': \'en_us\'">'
                ]);
                const commonBundle = assetGraph.findAssets({fileName: 'common-bundle.js'})[0];
                expect(commonBundle.text, 'to contain', 'neededInAllLanguages')
                    .and('not to contain', 'neededInAmericanEnglish')
                    .and('not to contain', 'neededInDanish');
            });

            it('should support independent conditionals with one of the conditions provided up front', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/twoIndependentConditionals/')});
                await assetGraph.loadAssets('index.html')
                    .populate()
                    .bundleSystemJs({
                        conditions: { 'weather.js': 'sunny' }
                    })
                    .populate();

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<script src="[^"]+"[^>]*>/g), 'to equal', [
                    '<script src="system.js">',
                    '<script src="config.js">',
                    '<script src="/common-bundle.js">',
                    '<script src="/bundle-main-da.js" data-assetgraph-conditions="\'lang.js|default\': \'da\'">',
                    '<script src="/bundle-main-en_us.js" data-assetgraph-conditions="\'lang.js|default\': \'en_us\'">'
                ]);
                const commonBundle = assetGraph.findAssets({fileName: 'common-bundle.js'})[0];
                expect(commonBundle.text, 'not to contain', 'rainy')
                    .and('not to contain', '#{weather.js');
            });

            it('should support dependent conditionals', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/twoDependentConditionals/')});
                await assetGraph.loadAssets('index.html')
                    .populate()
                    .bundleSystemJs()
                    .populate();

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<script src="[^"]+"[^>]*>/g), 'to equal', [
                    '<script src="system.js">',
                    '<script src="config.js">',
                    '<script src="/common-bundle.js">',
                    '<script src="/bundle-main-da.js" data-assetgraph-conditions="\'lang.js|default\': \'da\'">',
                    '<script src="/bundle-main-en_us.js" data-assetgraph-conditions="\'lang.js|default\': \'en_us\'">',
                    '<script src="/bundle-main-rainy-da.js" data-assetgraph-conditions="\'weather.js|default\': \'rainy\', \'lang.js|default\': \'da\'">',
                    '<script src="/bundle-main-rainy-en_us.js" data-assetgraph-conditions="\'weather.js|default\': \'rainy\', \'lang.js|default\': \'en_us\'">',
                    '<script src="/bundle-main-sunny-da.js" data-assetgraph-conditions="\'weather.js|default\': \'sunny\', \'lang.js|default\': \'da\'">',
                    '<script src="/bundle-main-sunny-en_us.js" data-assetgraph-conditions="\'weather.js|default\': \'sunny\', \'lang.js|default\': \'en_us\'">'
                ]);
                const commonBundle = assetGraph.findAssets({fileName: 'common-bundle.js'})[0];
                expect(commonBundle.text, 'to contain', 'neededInAllLanguages')
                    .and('not to contain', 'neededInAmericanEnglish')
                    .and('not to contain', 'neededInDanish');
            });

            it('should create separate stylesheets per variant', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/stylesheet/')});
                await assetGraph.loadAssets('index.html')
                    .populate()
                    .bundleSystemJs()
                    .populate();

                expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to contain',
                    '<link rel="stylesheet" href="/styles.da.css" data-assetgraph-conditions="\'lang.js|default\': \'da\'">'
                ).and('to contain', '<link rel="stylesheet" href="/styles.en_us.css" data-assetgraph-conditions="\'lang.js|default\': \'en_us\'">');
            });

            it('should work when combined with the asset list plugin', async function () {
                const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/combinedWithAssetPlugin/')});
                await assetGraph.loadAssets('index.html')
                    .populate()
                    .bundleSystemJs()
                    .populate();

                expect(assetGraph.findAssets({fileName: 'common-bundle.js'})[0].text, 'to contain',
                    "System.registerDynamic('main.js', ['test-*.txt!systemjs-asset-plugin/asset-plugin.js'"
                );
            });
        });

        it('should support a combination of paths aliases and conditions', async function () {
            const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleSystemJs/conditionals/specfiedAndUnspecified/')});
            await assetGraph.loadAssets('index.html')
                .populate()
                .bundleSystemJs({
                    conditions: {
                        locale: ['en_us', 'da'],
                        environment: ['development', 'production']
                    }
                })
                .populate();

            expect(assetGraph.findAssets({fileName: 'common-bundle.js'})[0].text, 'to contain', "System.registerDynamic('environment'")
                .and('to contain', "System.registerDynamic('main.js', ['virtual-#{environment|default}.configjson', 'virtual-#{locale|default}.i18n', 'actual-#{locale|default}.js']");
        });
    });
});
