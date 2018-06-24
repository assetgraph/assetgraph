/*jshint unused:false*/
const _ = require('lodash');
const pathModule = require('path');
const urlTools = require('urltools');
const getTemporaryFilePath = require('gettemporaryfilepath');
const estraverse = require('estraverse-fb');
const esanimate = require('esanimate');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

function extractRequireJsConfigFragments(parseTree, htmlAsset) {
  const requireJsConfigFragments = [];
  estraverse.traverse(parseTree, {
    enter: node => {
      if (
        node.type === 'ExpressionStatement' &&
        node.expression.type === 'CallExpression' &&
        node.expression.callee.type === 'MemberExpression' &&
        !node.expression.callee.computed &&
        node.expression.callee.property.name === 'config' &&
        node.expression.callee.object.type === 'Identifier' &&
        node.expression.arguments.length > 0 &&
        node.expression.arguments[0].type === 'ObjectExpression' &&
        (node.expression.callee.object.name === 'require' ||
          node.expression.callee.object.name === 'requirejs')
      ) {
        // require.config({})
        requireJsConfigFragments.push(
          esanimate.objectify(node.expression.arguments[0])
        );
      } else if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          if (
            declarator.id.type === 'Identifier' &&
            (declarator.id.name === 'require' ||
              declarator.id.name === 'requirejs') &&
            declarator.init &&
            declarator.init.type === 'ObjectExpression'
          ) {
            // var require = {}
            // var requirejs = {}
            requireJsConfigFragments.push(esanimate.objectify(declarator.init));
          }
        }
      } else if (
        node.type === 'AssignmentExpression' &&
        node.left.type === 'Identifier' &&
        node.operator === '=' &&
        node.right.type === 'ObjectExpression' &&
        (node.left.name === 'require' || node.left.name === 'requirejs')
      ) {
        // require = {}
        // requirejs = {}
        requireJsConfigFragments.push(esanimate.objectify(node.right));
      } else if (
        node.type === 'AssignmentExpression' &&
        node.left.type === 'MemberExpression' &&
        !node.left.computed &&
        node.operator === '=' &&
        node.left.object.type === 'Identifier' &&
        node.left.object.name === 'window' &&
        (node.left.property.name === 'require' ||
          node.left.property.name === 'requirejs') &&
        node.right.type === 'ObjectExpression'
      ) {
        // window.require = {}
        // window.requirejs = {}
        requireJsConfigFragments.push(esanimate.objectify(node.right));
      } else if (
        node.type === 'AssignmentExpression' &&
        node.left.type === 'MemberExpression' &&
        !node.left.computed &&
        node.left.object.type === 'Identifier' &&
        node.left.object.name === 'require' &&
        node.left.property.name === 'baseUrl' &&
        node.right.type === 'Literal' &&
        typeof node.right.value === 'string'
      ) {
        // require.config.baseUrl = '...'
        requireJsConfigFragments.push({
          baseUrl: htmlAsset.assetGraph.resolveUrl(
            htmlAsset.url.replace(/[^/]+([?#].*)?$/, ''),
            node.right.value.replace(/\/?$/, '/')
          )
        });
      }
    }
  });
  return requireJsConfigFragments;
}

module.exports = () => {
  return async function bundleRequireJs(assetGraph) {
    let requireJs;
    const entryPoints = [];
    for (const htmlAsset of assetGraph.findAssets({
      type: 'Html',
      isFragment: false,
      isLoaded: true
    })) {
      const htmlScripts = assetGraph.findRelations({
        from: htmlAsset,
        type: 'HtmlScript'
      });
      for (const [i, htmlScript] of htmlScripts.entries()) {
        const dataMain = htmlScript.node.getAttribute('data-main');
        if (dataMain) {
          const requireJsConfigFragments = [];
          for (const preceedingHtmlScript of htmlScripts.slice(0, i)) {
            if (preceedingHtmlScript.to && preceedingHtmlScript.to.isLoaded) {
              requireJsConfigFragments.push(
                ...extractRequireJsConfigFragments(
                  preceedingHtmlScript.to.parseTree,
                  htmlAsset
                )
              );
            }
          }
          entryPoints.push({
            htmlScript,
            requireJsConfig: _.merge({}, ...requireJsConfigFragments)
          });
        }
      }
    }
    if (entryPoints.length > 0) {
      const globalSnapshot = Object.assign({}, global);
      try {
        requireJs = require('requirejs');
      } catch (e) {
        throw new Error(
          `The graph contains ${
            entryPoints.length
          } top-level data-main attribute ${
            entryPoints.length === 1 ? '' : 's'
          }` +
            ', but the requirejs package is not available. Please install requirejs in the the containing project.'
        );
      }

      const potentiallyOrphanedAssets = new Set();

      try {
        for (const entryPoint of entryPoints) {
          const { requireJsConfig, htmlScript } = entryPoint;
          let dataMain = htmlScript.node.getAttribute('data-main');
          htmlScript.node.removeAttribute('data-main');
          let baseUrl = requireJsConfig.baseUrl;
          if (baseUrl) {
            baseUrl = assetGraph
              .resolveUrl(htmlScript.from.nonInlineAncestor.url, baseUrl)
              .replace(/^file:\/\//, '');
          } else {
            baseUrl = urlTools.fileUrlToFsPath(assetGraph.root);
            const lastIndexOfSlash = dataMain.lastIndexOf('/');
            if (lastIndexOfSlash !== -1) {
              baseUrl = assetGraph.resolveUrl(
                baseUrl,
                dataMain.slice(0, lastIndexOfSlash)
              );
              dataMain = dataMain.slice(lastIndexOfSlash + 1, dataMain.length);
            }
          }
          baseUrl = baseUrl.replace(/\/?$/, '/'); // Ensure trailing slash
          const outBundleFile = getTemporaryFilePath({ suffix: '.js' });
          const outCssFileName = outBundleFile.replace(/\.js$/, '.css');
          const requireJsOptimizeOptions = _.defaults(
            {
              siteRoot: urlTools.fileUrlToFsPath(assetGraph.root), // https://github.com/guybedford/require-css#siteroot-configuration
              baseUrl,
              name: dataMain,
              out: outBundleFile,
              optimize: 'none',
              generateSourceMaps: true,
              preserveLicenseComments: true
            },
            requireJsConfig
          );
          const dataAlmond = htmlScript.node.getAttribute('data-almond');
          if (dataAlmond) {
            potentiallyOrphanedAssets.add(htmlScript.to);
            htmlScript.href = dataAlmond;
            htmlScript.to = assetGraph.addAsset(
              { url: dataAlmond },
              htmlScript
            );
            htmlScript.node.removeAttribute('data-almond');
          }

          await new Promise(resolve =>
            requireJs.optimize(requireJsOptimizeOptions, resolve)
          ); // Does not pass err as the first parameter

          let contents = await fs.readFileAsync(outBundleFile, 'utf-8');
          await fs.unlinkAsync(outBundleFile);

          let sourceMapFileName;
          contents = contents.replace(
            /\/\/[@#]\s*sourceMappingURL=([\w-.]+)\s*$/,
            ($0, sourceMapUrl) => {
              sourceMapFileName = pathModule.resolve(
                pathModule.dirname(outBundleFile),
                decodeURIComponent(sourceMapUrl)
              );
              return '';
            }
          );
          let sourceMap;
          let bundleAssetUrl = `file://${baseUrl}${
            dataMain ? `${dataMain}-` : ''
          }bundle.js`;
          if (sourceMapFileName) {
            const sourceMapContents = await fs.readFileAsync(
              sourceMapFileName,
              'utf-8'
            );
            await fs.unlinkAsync(sourceMapFileName);
            sourceMap = JSON.parse(sourceMapContents);
            sourceMap.file = `/${urlTools.buildRelativeUrl(
              assetGraph.root,
              bundleAssetUrl
            )}`;
            sourceMap.sources = sourceMap.sources.map(
              sourceFileName =>
                `/${urlTools.buildRelativeUrl(
                  assetGraph.root,
                  `file://${baseUrl}${sourceFileName}`
                )}`
            );
          }

          htmlScript.from.addRelation(
            {
              type: 'HtmlScript',
              to: {
                type: 'JavaScript',
                text: contents,
                url: bundleAssetUrl,
                sourceMap
              }
            },
            'after',
            htmlScript
          );

          let stats;
          try {
            stats = await fs.statAsync(outCssFileName);
          } catch (e) {}
          if (stats && stats.isFile()) {
            const cssContents = await fs.readFileAsync(outCssFileName, 'utf-8');
            if (cssContents) {
              const existingHtmlStyles = assetGraph.findRelations({
                from: htmlScript.from,
                type: 'HtmlStyle'
              });
              const lastExistingHtmlStyle =
                existingHtmlStyles[existingHtmlStyles.length - 1];
              htmlScript.from.addRelation(
                {
                  type: 'HtmlStyle',
                  to: {
                    type: 'Css',
                    text: cssContents,
                    url: `file://${baseUrl}${
                      dataMain ? `${dataMain}-` : ''
                    }bundle.css`,
                    sourceMap: undefined
                  }
                },
                lastExistingHtmlStyle ? 'after' : 'first',
                lastExistingHtmlStyle
              );
            }
            await fs.unlinkAsync(outCssFileName);
          }
        }

        for (const asset of potentiallyOrphanedAssets) {
          if (assetGraph.findRelations({ to: asset }).length === 0) {
            assetGraph.removeAsset(asset);
          }
        }
      } finally {
        for (const key of Object.keys(global)) {
          if (!(key in globalSnapshot)) {
            delete global[key];
          }
        }
      }
    }
  };
};
