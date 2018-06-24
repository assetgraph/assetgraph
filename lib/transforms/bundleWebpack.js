const pathModule = require('path');
const Promise = require('bluebird');
const urlTools = require('urltools');
const estraverse = require('estraverse-fb');
const readPkgUp = require('read-pkg-up');

module.exports = (queryObj, { configPath } = {}) => {
  return async function bundleWebpack(assetGraph) {
    let webpack;
    try {
      webpack = require('webpack');
    } catch (e) {
      if (configPath) {
        throw new Error(
          `Webpack config path given (${configPath}), but webpack itself could not be found. Please install it in your project: ${
            e.stack
          }`
        );
      }
    }

    const triedConfigPaths = [];

    async function loadWebpackConfig() {
      // First try to look for the config in the assetGraph root:
      configPath =
        configPath ||
        pathModule.resolve(
          urlTools.fileUrlToFsPath(assetGraph.root),
          'webpack.config.js'
        );
      triedConfigPaths.push(configPath);
      try {
        return require.main.require(configPath);
      } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND' || configPath) {
          throw err;
        }
        // webpack.config.js was not found in the assetgraph's root.
        // Look for it in the directory that contains the nearest package.json:
        const readPkgUpResult = await readPkgUp();
        if (readPkgUpResult.path) {
          const alternativeConfigPath = pathModule.resolve(
            pathModule.dirname(readPkgUpResult.path),
            'webpack.config.js'
          );
          if (alternativeConfigPath !== configPath) {
            configPath = alternativeConfigPath;
            triedConfigPaths.push(configPath);
            return require.main.require(configPath);
          }
        }
        throw new Error('Could not load webpack config');
      }
    }

    let config;
    try {
      config = await loadWebpackConfig();
    } catch (err) {
      if (webpack) {
        assetGraph.info(
          new Error(
            `Webpack is installed, but could not load the webpack config (tried ${triedConfigPaths.join(
              ' '
            )}): ${err.message}`
          )
        );
      }
      return;
    }
    config.context =
      config.context || urlTools.fileUrlToFsPath(assetGraph.root);
    config.output = config.output || {};
    if (typeof config.output.path === 'string') {
      config.output.path = pathModule.resolve(
        config.context,
        config.output.path
      );
    }
    config.output.devtoolModuleFilenameTemplate =
      config.output.devtoolModuleFilenameTemplate ||
      'file://[absolute-resource-path]';

    let basePath = config.output.path;
    if (config.output.publicPath) {
      basePath = pathModule.resolve(
        config.context,
        config.output.publicPath.replace(/^\//, '')
      );
    }

    const plugins = Array.isArray(config.plugins) ? config.plugins : [];

    for (const plugin of plugins) {
      if (
        plugin.constructor.name === 'UglifyJsPlugin' &&
        (plugin.options.mangle || plugin.options.compress)
      ) {
        plugin.options.mangle = plugin.options.compress = false;
        assetGraph.info(
          new Error(
            'UglifyJsPlugin detected, turning off mangling and compression so outgoing relations can be detected. This is fine for assetgraph-builder, which will run UglifyJs later anyway'
          )
        );
      }
    }

    const hasHtmlWebpackPlugin = plugins.some(
      plugin => plugin.constructor.name === 'HtmlWebpackPlugin'
    );

    if (!hasHtmlWebpackPlugin) {
      // HtmlWebpackPlugin is not in the picture, so we can assume that the
      // relevant entry points are referenced by assets that we have
      // in the graph. Only build the actually referenced entry points:
      let seenReferencedEntryPoints = false;
      const potentialBundlePaths = assetGraph
        .findRelations({
          to: {
            url: { $regex: /\.js(?:\?|$)/ }
          }
        })
        .map(relation => {
          return urlTools.fileUrlToFsPath(
            assetGraph.resolveUrl(relation.baseUrl, relation.to.url)
          );
        });

      /* eslint-disable no-inner-declarations */
      function createAbsolutePath(name) {
        return pathModule.resolve(
          basePath,
          name
            ? config.output.filename.replace(/\[name]/g, name)
            : config.output.filename
        );
      }

      if (
        config.entry &&
        typeof config.entry === 'object' &&
        !Array.isArray(config.entry)
      ) {
        config.entry = Object.keys(config.entry).reduce(
          (entryPointsToBeBuilt, entryPointName) => {
            if (
              potentialBundlePaths.includes(createAbsolutePath(entryPointName))
            ) {
              entryPointsToBeBuilt[entryPointName] =
                config.entry[entryPointName];
            }
            return entryPointsToBeBuilt;
          },
          {}
        );

        seenReferencedEntryPoints = Object.keys(config.entry).length > 0;
      } else {
        // array or string
        if (potentialBundlePaths.includes(createAbsolutePath())) {
          seenReferencedEntryPoints = true;
        }
      }

      if (!seenReferencedEntryPoints) {
        assetGraph.info(
          new Error('No matching webpack bundles found, skipping')
        );
        return;
      }
    }

    // Webpack 4: Disable name mangling so that we can detect relations from the bundle
    // (same reason as why we disable UglifyJsPlugin)
    config.optimization = config.optimization || {};
    config.optimization.minimize = false;

    const compiler = webpack(config);
    const outputFileSystem = new webpack.MemoryOutputFileSystem();
    compiler.outputFileSystem = outputFileSystem;
    const stats = await Promise.fromNode(cb => compiler.run(cb));
    if (stats.compilation && stats.compilation.errors) {
      for (const error of stats.compilation.errors) {
        assetGraph.warn(error);
      }
    }
    const statsObj = stats.toJson({ assets: true });
    let existingAssetsWereReplaced;
    const assetInfos = [];
    const urlByAssetName = {};
    for (const asset of statsObj.assets) {
      const url = urlTools.fsFilePathToFileUrl(
        pathModule.resolve(basePath, asset.name)
      );
      const outputPath = urlTools.fsFilePathToFileUrl(
        pathModule.resolve(config.output.path, asset.name)
      );
      assetInfos.push({
        url,
        output: outputPath,
        name: asset.name
      });
      urlByAssetName[asset.name] = url;
      const existingAsset = assetGraph.findAssets({ url })[0];
      if (existingAsset) {
        assetGraph.info(
          new Error(`Replacing previously built artifact: ${url}`)
        );
        existingAssetsWereReplaced = true;
      }
    }
    assetGraph.info(stats.toString({ colors: true }));
    if (existingAssetsWereReplaced) {
      assetGraph.info(
        new Error(
          `Please remove ${
            config.output.path
          } before building with assetgraph to speed up the process`
        )
      );
    }

    await assetGraph.loadAssets(
      assetInfos.map(({ url, output }) => ({
        url,
        isInitial: /\.html$/.test(url),
        rawSrc: outputFileSystem.readFileSync(urlTools.fileUrlToFsPath(output))
      }))
    );

    // Pick up CSS assets and attach them to each entry point
    for (const chunkName of Object.keys(statsObj.assetsByChunkName)) {
      let assets = statsObj.assetsByChunkName[chunkName];
      if (!Array.isArray(assets)) {
        assets = [assets];
      }
      const javaScriptAssets = assets.filter(asset => /\.js$/.test(asset));
      const cssAssets = assets.filter(asset => /\.css$/.test(asset));
      if (javaScriptAssets.length === 1 && cssAssets.length > 0) {
        const entryPointRelations = assetGraph.findRelations(relation => {
          if (
            relation.type !== 'HtmlScript' ||
            !relation.to ||
            !relation.to.url
          ) {
            return;
          }
          const absoluteUrl = assetGraph.resolveUrl(
            relation.from.nonInlineAncestor.url,
            relation.to.url
          );
          return absoluteUrl === urlByAssetName[javaScriptAssets[0]];
        });
        for (const entryPointRelation of entryPointRelations) {
          for (const cssAsset of cssAssets) {
            entryPointRelation.from.addRelation(
              {
                type: 'HtmlStyle',
                hrefType: 'rootRelative',
                to: assetGraph.findAssets({ url: urlByAssetName[cssAsset] })[0]
              },
              'last'
            );
          }
        }
      }
    }

    // Fix up sources: [...] urls in source maps:
    for (const relation of assetGraph.findRelations({
      type: 'SourceMapSource',
      from: {
        url: {
          $in: assetInfos.map(url => url.url)
        }
      }
    })) {
      if (relation.href.startsWith('file://webpack/')) {
        // Some fake webpack url, eg. "webpack/bootstrap 5c89cbd3893270d2912a"
        // that got file:// prepended due to devtoolFallbackModuleFilenameTemplate
        // Strip the file:// prefix and make it relative so that it sort of
        // looks like the webpack output:
        relation.to.url = relation.to.url.replace('file', 'webpack');
        relation.hrefType = 'relative';
      } else {
        relation.hrefType = 'rootRelative';
      }
    }

    for (const asset of assetGraph.findAssets({
      type: 'JavaScript',
      url: { $in: assetInfos.map(assetInfo => assetInfo.url) }
    })) {
      let replacementsMade = false;
      let requireEnsureAstTemplate;
      let jsonpScriptSrcAst;
      estraverse.traverse(asset.parseTree, {
        enter(node) {
          // Webpack 4 moves this to a separate function:
          // function jsonpScriptSrc(chunkId) {
          //   return __webpack_require__.p + "" + chunkId + ".bundle.js"
          // }

          if (
            node.type === 'FunctionDeclaration' &&
            node.id.name === 'jsonpScriptSrc' &&
            node.body.body.length === 1 &&
            node.body.body[0].type === 'ReturnStatement'
          ) {
            jsonpScriptSrcAst = node.body.body[0].argument;
          }

          // Detect the __webpack_require__.e = function requireEnsure(chunkId, callback) { ... declaration at the top of a bundle
          if (
            node.type === 'AssignmentExpression' &&
            node.operator === '=' &&
            node.left.type === 'MemberExpression' &&
            node.left.object.type === 'Identifier' &&
            node.left.object.name === '__webpack_require__' &&
            node.left.property.type === 'Identifier' &&
            node.left.property.name === 'e' &&
            node.right.type === 'FunctionExpression' &&
            node.right.id &&
            node.right.id.type === 'Identifier' &&
            node.right.id.name === 'requireEnsure'
          ) {
            node.right.params.push({
              type: 'Identifier',
              name: '_assetgraph_url'
            });
            // Replace script.src = ... in the function body:
            estraverse.traverse(node.right.body, {
              enter(node) {
                if (
                  node.type === 'ExpressionStatement' &&
                  node.expression.type === 'AssignmentExpression' &&
                  node.expression.left.type === 'MemberExpression' &&
                  node.expression.left.object.type === 'Identifier' &&
                  node.expression.left.object.name === 'script' &&
                  node.expression.left.property.type === 'Identifier' &&
                  node.expression.left.property.name === 'src'
                ) {
                  const templateAst = node.expression.right;
                  // Quick and dirty evaluator
                  requireEnsureAstTemplate = chunkId => {
                    let result = '';
                    (function visit(node) {
                      if (
                        node.type === 'MemberExpression' &&
                        node.object.type === 'Identifier' &&
                        node.object.name === '__webpack_require__' &&
                        node.property.type === 'Identifier' &&
                        node.property.name === 'p'
                      ) {
                        // FIXME: Fall back to config.output.path instead of hardcoding /dist/:
                        result += config.output.publicPath || '/dist/';
                      } else if (
                        node.type === 'BinaryExpression' &&
                        node.operator === '+'
                      ) {
                        visit(node.left);
                        visit(node.right);
                      } else if (
                        node.type === 'LogicalExpression' &&
                        node.operator === '||'
                      ) {
                        const resultBeforeLeft = result;
                        visit(node.left);
                        if (result === resultBeforeLeft) {
                          visit(node.right);
                        }
                      } else if (
                        node.type === 'MemberExpression' &&
                        node.computed &&
                        node.property.type === 'Identifier' &&
                        node.property.name === 'chunkId' &&
                        node.object.type === 'ObjectExpression'
                      ) {
                        for (const propertyNode of node.object.properties) {
                          if (
                            propertyNode.key.type === 'Literal' &&
                            String(propertyNode.key.value) === String(chunkId)
                          ) {
                            visit(propertyNode.value);
                          }
                        }
                      } else if (node.type === 'Literal') {
                        result += String(node.value);
                      } else if (
                        node.type === 'Identifier' &&
                        node.name === 'chunkId'
                      ) {
                        result += chunkId;
                      } else if (
                        node.type === 'CallExpression' &&
                        node.callee.type === 'Identifier' &&
                        node.callee.name === 'jsonpScriptSrc'
                      ) {
                        visit(jsonpScriptSrcAst);
                      } else {
                        throw new Error(
                          `unsupported ${
                            node.type
                          }: ${require('escodegen').generate(node)}`
                        );
                      }
                    })(templateAst);
                    return result;
                  };
                  node.expression.right = {
                    type: 'BinaryExpression',
                    operator: '||',
                    left: {
                      type: 'Identifier',
                      name: '_assetgraph_url'
                    },
                    right: node.expression.right
                  };
                }
              }
            });
            replacementsMade = true;
          } else if (
            node.type === 'VariableDeclaration' &&
            node.declarations.length === 1 &&
            node.declarations[0].type === 'VariableDeclarator' &&
            node.declarations[0].id.type === 'Identifier' &&
            node.declarations[0].id.name === 'map' &&
            node.declarations[0].init &&
            node.declarations[0].init.type === 'ObjectExpression' &&
            node.declarations[0].init.properties.length > 0 &&
            node.declarations[0].init.properties.every(
              propertyNode =>
                propertyNode.value.type === 'ArrayExpression' &&
                propertyNode.value.elements.length < 3
            )
          ) {
            // var map = {
            //     './splita': [
            //         1,
            //         1
            //     ],
            //     './splita.js': [
            //         1,
            //         1
            //     ],
            //     './splitb': [
            //         2,
            //         0
            //     ],
            //     './splitb.js': [
            //         2,
            //         0
            //     ]
            // };
            // Add a 3rd element to each value that uses .toString('url')
            for (const propertyNode of node.declarations[0].init.properties) {
              // Not sure this is necessary yet, but pad with undefined so we always
              // add to the 3rd position
              while (propertyNode.value.elements.length < 2) {
                propertyNode.value.elements.push({
                  type: 'Identifier',
                  value: 'undefined'
                });
              }
              propertyNode.value.elements.push({
                type: 'CallExpression',
                callee: {
                  type: 'MemberExpression',
                  computed: false,
                  object: {
                    type: 'Literal',
                    value: requireEnsureAstTemplate(
                      String(propertyNode.value.elements[1].value)
                    )
                  },
                  property: {
                    type: 'Identifier',
                    name: 'toString'
                  }
                },
                arguments: [
                  {
                    type: 'Literal',
                    value: 'url'
                  }
                ]
              });
            }
            replacementsMade = true;
          } else if (
            node.type === 'FunctionDeclaration' &&
            node.id.type === 'Identifier' &&
            node.id.name === 'webpackAsyncContext'
          ) {
            // function webpackAsyncContext(req) {
            //     var ids = map[req];
            //     if (!ids)
            //         return Promise.reject(new Error('Cannot find module \'' + req + '\'.'));
            //     return __webpack_require__.e(ids[1]).then(function () {
            //         return __webpack_require__(ids[0]);
            //     });
            // }
            // Add ids[2] to the argument list in the __webpack_require__.e call so that the JavaScriptStaticUrl is passed on
            const lastStatement = node.body.body[node.body.body.length - 1];
            if (
              lastStatement &&
              lastStatement.type === 'ReturnStatement' &&
              lastStatement.argument.type === 'CallExpression' &&
              lastStatement.argument.callee.type === 'MemberExpression' &&
              lastStatement.argument.callee.object.type === 'CallExpression' &&
              lastStatement.argument.callee.object.callee.type ===
                'MemberExpression' &&
              lastStatement.argument.callee.object.callee.object.type ===
                'Identifier' &&
              lastStatement.argument.callee.object.callee.object.name ===
                '__webpack_require__' &&
              lastStatement.argument.callee.object.callee.property.type ===
                'Identifier' &&
              lastStatement.argument.callee.object.callee.property.name ===
                'e' &&
              lastStatement.argument.callee.object.arguments.length === 1 &&
              lastStatement.argument.callee.object.arguments[0].type ===
                'MemberExpression' &&
              lastStatement.argument.callee.object.arguments[0].computed &&
              lastStatement.argument.callee.object.arguments[0].object.type ===
                'Identifier' &&
              lastStatement.argument.callee.object.arguments[0].object.name ===
                'ids' &&
              lastStatement.argument.callee.object.arguments[0].property
                .type === 'Literal'
            ) {
              lastStatement.argument.callee.object.arguments.push({
                type: 'MemberExpression',
                computed: true,
                object: {
                  type: 'Identifier',
                  name: 'ids'
                },
                property: {
                  type: 'Literal',
                  value: 2
                }
              });
              replacementsMade = true;
            }
          } else if (
            node.type === 'CallExpression' &&
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === '__webpack_require__' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'e' &&
            node.arguments.length >= 1 &&
            node.arguments[0].type === 'Literal' &&
            typeof node.arguments[0].value === 'number' &&
            requireEnsureAstTemplate
          ) {
            node.arguments.push({
              type: 'CallExpression',
              callee: {
                type: 'MemberExpression',
                computed: false,
                object: {
                  type: 'Literal',
                  value: requireEnsureAstTemplate(node.arguments[0].value)
                },
                property: {
                  type: 'Identifier',
                  name: 'toString'
                }
              },
              arguments: [
                {
                  type: 'Literal',
                  value: 'url'
                }
              ]
            });
            replacementsMade = true;
          } else if (
            node.type === 'FunctionExpression' &&
            node.params.length === 3 &&
            node.params[0].type === 'Identifier' &&
            node.params[0].name === 'module' &&
            node.params[1].type === 'Identifier' &&
            node.params[1].name === 'exports' &&
            node.params[2].type === 'Identifier' &&
            node.params[2].name === '__webpack_require__' &&
            node.leadingComments &&
            (node.leadingComments.length === 2 ||
              node.leadingComments.length === 3) &&
            /^ \d+ $/.test(
              node.leadingComments[node.leadingComments.length - 2].value
            ) &&
            node.leadingComments[node.leadingComments.length - 1].value ===
              '*' &&
            node.body.type === 'BlockStatement' &&
            node.body.body.length === 1 &&
            node.body.body[0].type === 'ExpressionStatement' &&
            node.body.body[0].expression.type === 'AssignmentExpression' &&
            node.body.body[0].expression.left.type === 'MemberExpression' &&
            node.body.body[0].expression.left.object.type === 'Identifier' &&
            node.body.body[0].expression.left.object.name === 'module' &&
            node.body.body[0].expression.left.property.type === 'Identifier' &&
            node.body.body[0].expression.left.property.name === 'exports' &&
            node.body.body[0].expression.right.type === 'BinaryExpression' &&
            node.body.body[0].expression.right.operator === '+' &&
            node.body.body[0].expression.right.left.type ===
              'MemberExpression' &&
            node.body.body[0].expression.right.left.object.type ===
              'Identifier' &&
            node.body.body[0].expression.right.left.object.name ===
              node.params[2].name &&
            node.body.body[0].expression.right.left.property.type ===
              'Identifier' &&
            node.body.body[0].expression.right.left.property.name === 'p' &&
            node.body.body[0].expression.right.right.type === 'Literal' &&
            typeof node.body.body[0].expression.right.right.value === 'string'
          ) {
            node.body.body[0].expression.right = {
              type: 'CallExpression',
              range: node.body.body[0].expression.right.range,
              callee: {
                type: 'MemberExpression',
                computed: false,
                object: {
                  type: 'Literal',
                  // FIXME: Fall back to config.output.path instead of hardcoding /dist/:
                  value:
                    (config.output.publicPath || '/dist/') +
                    node.body.body[0].expression.right.right.value
                },
                property: {
                  type: 'Identifier',
                  name: 'toString'
                }
              },
              arguments: [
                {
                  type: 'Literal',
                  value: 'url'
                }
              ]
            };
            replacementsMade = true;
          }
        }
      });
      if (replacementsMade) {
        asset.markDirty();
        for (const relation of [...asset.outgoingRelations]) {
          asset.removeRelation(relation);
        }
        asset._outgoingRelations = undefined;
        asset.isPopulated = false;
        asset.populate();
      }
    }
  };
};
