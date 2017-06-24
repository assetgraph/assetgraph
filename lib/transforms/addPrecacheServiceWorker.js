const _ = require('lodash');
const AssetGraph = require('../AssetGraph');
const query = AssetGraph.query;
const urlTools = require('urltools');
const swPrecache = require('sw-precache');
const commonPathPrefix = require('common-path-prefix');
const Promise = require('bluebird');

module.exports = function (queryObj, options) {
    options = options || {};
    return function addPrecacheServiceWorker(assetGraph) {
        function generateAndAttachPrecacheServiceWorkerAsync(entryPointHtmlAssets) {
            // Invariant: All entryPointHtmlAssets must have the same origin
            const textOrRawSrcByUrl = {};
            const assetByUrl = {};
            for (const htmlAsset of entryPointHtmlAssets) {
                assetGraph.eachAssetPostOrder(htmlAsset, {type: query.not(['HtmlAnchor', 'SvgAnchor', 'HtmlMetaRefresh', 'HtmlCacheManifest', 'HtmlConditionalComment', 'JavaScriptSourceUrl', 'JavaScriptSourceMappingUrl', 'JavaScriptSourceMap'])}, asset => {
                    // But only if the asset isn't inline, has been loaded, and isn't already in the manifest:
                    if (!asset.isInline && asset.isLoaded && asset !== htmlAsset) {
                        const url = require('urltools').buildRootRelativeUrl(assetGraph.root, asset.url, assetGraph.root);
                        assetByUrl[url] = asset;
                        textOrRawSrcByUrl[url] = asset.isText ? asset.text : asset.rawSrc;
                    }
                });
            }

            const entryPointAssetPaths = [];
            let serviceWorkerFileNameFragments = [];
            for (const entryPointAsset of entryPointHtmlAssets) {
                entryPointAssetPaths.push(entryPointAsset.url);
                const basename = entryPointAsset.fileName.replace(/\..*$/, '');
                if (basename) {
                    serviceWorkerFileNameFragments.push(basename);
                }
            }
            serviceWorkerFileNameFragments = _.uniq(serviceWorkerFileNameFragments.sort());
            serviceWorkerFileNameFragments.push('precache-service-worker.js');

            const baseUrl = commonPathPrefix(entryPointAssetPaths);
            if (!baseUrl || /^[^:]*:\/+$/.test(baseUrl)) {
                assetGraph.emit('error', new Error('addPrecacheServiceWorker: HTML assets reside on different domains or schemes, cannot create a shared service worker'));
                return;
            }
            const serviceWorkerUrl = baseUrl + serviceWorkerFileNameFragments.join('-');
            if (assetGraph.findAssets({url: serviceWorkerUrl}).length > 0) {
                assetGraph.emit('error', new Error('There is already a service worker at ' + serviceWorkerUrl + ' -- giving up'));
            }
            return Promise.fromNode(cb => {
                swPrecache.generate({
                    dynamicUrlToDependencies: textOrRawSrcByUrl,
                    logger(message) {
                        assetGraph.emit('info', serviceWorkerUrl.replace(/^.*\//, '') + ': ' + message);
                    }
                }, cb);
            }).then(serviceWorkerStr => {
                // Turn the string literal urls in the generated service worker scripts into JavaScriptStaticUrl:
                serviceWorkerStr = serviceWorkerStr.replace(/^(var precacheConfig = )(\[[^\n]*\]);/m, ($0, before, urlAndHashPairs) => {
                    return before + '[' + JSON.parse(urlAndHashPairs).map(
                        urlAndHash => '[' + JSON.stringify(urlAndHash[0]) + '.toString(\'url\'),' + JSON.stringify(urlAndHash[1]) + ']'
                    ).join(',') + '];';
                });
                const serviceWorker = new assetGraph.JavaScript({
                    url: serviceWorkerUrl,
                    text: serviceWorkerStr
                });
                // Manually attach the resulting relations to the assets we already gathered.
                // Saves a .populate() run:
                for (const relation of serviceWorker.outgoingRelations) {
                    relation.to = assetByUrl[relation.href];
                }
                assetGraph.addAsset(serviceWorker);
                for (const htmlAsset of entryPointHtmlAssets) {
                    var serviceWorkerRegistrationScript = new assetGraph.JavaScript({
                        text:
                            'if (\'serviceWorker\' in navigator) {\n' +
                            '    window.addEventListener(\'load\', function () {\n' +
                            '        navigator.serviceWorker.register(\'' + urlTools.buildRootRelativeUrl(assetGraph.root, serviceWorkerUrl, assetGraph.root).replace(/'/g, '\\\'') + '\');\n' +
                            '    });\n' +
                            '}\n'
                    });
                    assetGraph.addAsset(serviceWorkerRegistrationScript);
                    serviceWorkerRegistrationScript.populate();
                    // Manually attach non-inline relation in order to avoid calling the populate transform as well:
                    serviceWorkerRegistrationScript.outgoingRelations[0].to = serviceWorker;
                    const node = htmlAsset.parseTree.createElement('script');
                    htmlAsset.parseTree.body.appendChild(node);
                    const htmlScript = new AssetGraph.HtmlScript({
                        from: htmlAsset,
                        to: serviceWorkerRegistrationScript,
                        node: node
                    });
                    htmlAsset.addRelation(htmlScript, 'last');
                    htmlScript.inline();
                }
            });
        }

        const entryPointHtmlAssets = assetGraph.findAssets(_.extend({type: 'Html', isInline: false}, queryObj));

        let batches;
        if (options.single) {
            batches = _.values(_.groupBy(entryPointHtmlAssets, 'origin'));
            if (batches.length > 1) {
                assetGraph.emit('info', new Error('addPrecacheServiceWorker: HTML assets reside on different domains or schemes, creating a service worker per origin'));
            }
        } else {
            batches = entryPointHtmlAssets.map(asset => [asset]);
        }
        return Promise.map(batches, generateAndAttachPrecacheServiceWorkerAsync, { concurrency: 1 });
    };
};
