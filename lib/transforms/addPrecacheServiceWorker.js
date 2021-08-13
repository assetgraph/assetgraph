const _ = require('lodash');
const urlTools = require('urltools');
const workboxBuild = require('workbox-build');
const commonPathPrefix = require('common-path-prefix');
const Promise = require('bluebird');
const pathModule = require('path');
const readPkgUp = require('read-pkg-up');

module.exports = (
  queryObj,
  { single = false, minify = false, configPath } = {}
) => {
  return async function addPrecacheServiceWorker(assetGraph) {
    const triedConfigPaths = [];

    async function loadSwPrecacheConfig() {
      // First try to look for the config in the assetGraph root:
      let currentConfigPath = configPath
        ? pathModule.resolve(process.cwd(), configPath)
        : pathModule.resolve(
            urlTools.fileUrlToFsPath(assetGraph.root),
            'sw-precache-config.js'
          );
      triedConfigPaths.push(currentConfigPath);
      try {
        return require.main.require(currentConfigPath);
      } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND' || configPath) {
          throw err;
        }
        // Config was not found in the assetgraph's root.
        // Look for it in the directory that contains the nearest package.json:
        const readPkgUpResult = await readPkgUp();
        if (readPkgUpResult.path) {
          const alternativeConfigPath = pathModule.resolve(
            pathModule.dirname(readPkgUpResult.path),
            'sw-precache-config.js'
          );
          if (alternativeConfigPath !== currentConfigPath) {
            currentConfigPath = alternativeConfigPath;
            triedConfigPaths.push(currentConfigPath);
            try {
              return require.main.require(currentConfigPath);
            } catch (err) {
              if (err.code !== 'MODULE_NOT_FOUND') {
                throw err;
              }
            }
          }
        }
      }
    }

    let config;
    try {
      config = await loadSwPrecacheConfig();
    } catch (err) {
      assetGraph.warn(
        new Error(
          `Could not load the sw-precache config (tried ${triedConfigPaths.join(
            ' '
          )}): ${err.message}`
        )
      );
      return;
    }

    async function generateAndAttachPrecacheServiceWorkerAsync(
      entryPointHtmlAssets
    ) {
      // Invariant: All entryPointHtmlAssets must have the same origin
      const templatedURLs = {};
      for (const htmlAsset of entryPointHtmlAssets) {
        assetGraph.eachAssetPostOrder(
          htmlAsset,
          {
            type: {
              $nin: [
                'HtmlAnchor',
                'SvgAnchor',
                'HtmlMetaRefresh',
                'HtmlCacheManifest',
                'HtmlConditionalComment',
                'HtmlAlternateLink',
                'JavaScriptSourceUrl',
                'JavaScriptSourceMappingUrl',
                'CssSourceUrl',
                'CssSourceMappingUrl',
                'RssChannelLink',
                'HtmlOpenGraph',
                'JavaScriptServiceWorkerRegistration',
                'HtmlServiceWorkerRegistration',
              ],
            },
          },
          (asset) => {
            // But only if the asset isn't inline, has been loaded, and isn't already in the manifest:
            if (!asset.isInline && asset.isLoaded) {
              templatedURLs[assetGraph.buildRootRelativeUrl(asset.url)] =
                asset.md5Hex;
            }
          }
        );
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
      serviceWorkerFileNameFragments = _.uniq(
        serviceWorkerFileNameFragments.sort()
      );
      serviceWorkerFileNameFragments.push('precache-service-worker.js');
      const baseUrl = commonPathPrefix(entryPointAssetPaths);
      if (!baseUrl || /^[^:]*:\/+$/.test(baseUrl)) {
        throw new Error(
          'addPrecacheServiceWorker: HTML assets reside on different domains or schemes, cannot create a shared service worker'
        );
      }
      const serviceWorkerUrl =
        baseUrl + serviceWorkerFileNameFragments.join('-');
      if (assetGraph.findAssets({ url: serviceWorkerUrl }).length > 0) {
        throw new Error(
          `There is already a service worker at ${serviceWorkerUrl} -- giving up`
        );
      }
      if (config && config.staticFileGlobs) {
        throw new Error(
          'The staticFileGlobs config option is not supported at present, sorry!'
        );
      }

      let { swString, warnings } = await workboxBuild.generateSWString({
        ...config,
        templatedURLs,
        importScripts: [],
      });
      for (const warning of warnings) {
        assetGraph.warn(`${serviceWorkerUrl.replace(/^.*\//, '')}: ${warning}`);
      }
      // Turn the string literal urls in the generated service worker scripts into JavaScriptStaticUrl:
      swString = swString.replace(
        /^(self.__precacheManifest = )(\[[\s\S]*?\])(\.concat\(self\.__precacheManifest \|\| \[\]\));$/m,
        ($0, before, urlAndRevisionPairs, after) => {
          return `${before}[${JSON.parse(urlAndRevisionPairs)
            .map(
              (urlAndRevision) =>
                `{url:${JSON.stringify(
                  urlAndRevision.url
                )}.toString('url'),revision:${JSON.stringify(
                  urlAndRevision.revision
                )}}`
            )
            .join(',')}]${after};`;
        }
      );
      const serviceWorker = assetGraph.addAsset({
        type: 'JavaScript',
        url: serviceWorkerUrl,
        text: swString,
      });
      if (minify) {
        serviceWorker.minify();
      }
      for (const htmlAsset of entryPointHtmlAssets) {
        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlScript',
            hrefType: 'inline',
            to: {
              type: 'JavaScript',
              text:
                `${
                  "if ('serviceWorker' in navigator) {\n" +
                  "    window.addEventListener('load', function () {\n" +
                  "        navigator.serviceWorker.register('"
                }${assetGraph
                  .buildRootRelativeUrl(serviceWorkerUrl)
                  .replace(/'/g, "\\'")}');\n` +
                `    });\n` +
                `}\n`,
            },
          },
          'lastInBody'
        );
        if (minify) {
          relation.to.minify();
        }
      }
    }

    const entryPointHtmlAssets = assetGraph.findAssets({
      type: 'Html',
      isInline: false,
      ...queryObj,
    });

    let batches;
    if (single) {
      batches = _.values(_.groupBy(entryPointHtmlAssets, 'origin'));
      if (batches.length > 1) {
        assetGraph.info(
          new Error(
            'addPrecacheServiceWorker: HTML assets reside on different domains or schemes, creating a service worker per origin'
          )
        );
      }
    } else {
      batches = entryPointHtmlAssets.map((asset) => [asset]);
    }
    await Promise.map(batches, generateAndAttachPrecacheServiceWorkerAsync, {
      concurrency: 1,
    });
  };
};
