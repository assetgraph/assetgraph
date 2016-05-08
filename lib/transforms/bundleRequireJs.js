/*jshint unused:false*/
var _ = require('lodash');
var pathModule = require('path');
var urlTools = require('urltools');
var getTemporaryFilePath = require('gettemporaryfilepath');
var AssetGraph = require('../../lib');
var estraverse = require('estraverse');
var esanimate = require('esanimate');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

function extractRequireJsConfigFragments(parseTree, htmlAsset) {
    var requireJsConfigFragments = [];
    estraverse.traverse(parseTree, {
        enter: function (node) {
            if (node.type === 'ExpressionStatement' &&
                node.expression.type === 'CallExpression' &&
                node.expression.callee.type === 'MemberExpression' &&
                !node.expression.callee.computed &&
                node.expression.callee.property.name === 'config' &&
                node.expression.callee.object.type === 'Identifier' &&
                node.expression.arguments.length > 0 &&
                node.expression.arguments[0].type === 'ObjectExpression' &&
                (node.expression.callee.object.name === 'require' || node.expression.callee.object.name === 'requirejs')) {
                // require.config({})
                requireJsConfigFragments.push(esanimate.objectify(node.expression.arguments[0]));
            } else if (node.type === 'VariableDeclaration') {
                node.declarations.forEach(function (declarator) {
                    if ((declarator.id.type === 'Identifier' && (declarator.id.name === 'require' || declarator.id.name === 'requirejs')) && declarator.init && declarator.init.type === 'ObjectExpression') {
                        // var require = {}
                        // var requirejs = {}
                        requireJsConfigFragments.push(esanimate.objectify(declarator.init));
                    }
                });
            } else if (node.type === 'AssignmentExpression' &&
                       node.left.type === 'Identifier' &&
                       node.operator === '=' &&
                       node.right.type === 'ObjectExpression' &&
                       (node.left.name === 'require' || node.left.name === 'requirejs')) {
                // require = {}
                // requirejs = {}
                requireJsConfigFragments.push(esanimate.objectify(node.right));
            } else if (node.type === 'AssignmentExpression' &&
                       node.left.type === 'MemberExpression' &&
                       !node.left.computed &&
                       node.operator === '=' &&
                       node.left.object.type === 'Identifier' &&
                       node.left.object.name === 'window' &&
                       (node.left.property.name === 'require' || node.left.property.name === 'requirejs') &&
                       node.right.type === 'ObjectExpression') {
                // window.require = {}
                // window.requirejs = {}
                requireJsConfigFragments.push(esanimate.objectify(node.right));
            } else if (node.type === 'AssignmentExpression' &&
                       node.left.type === 'MemberExpression' &&
                       !node.left.computed &&
                       node.left.object.type === 'Identifier' &&
                       node.left.object.name === 'require' &&
                       node.left.property.name === 'baseUrl' &&
                       node.right.type === 'Literal' &&
                       typeof node.right.value === 'string') {
                // require.config.baseUrl = '...'
                requireJsConfigFragments.push({baseUrl: htmlAsset.assetGraph.resolveUrl(htmlAsset.Url.replace(/[^\/]+([\?#].*)?$/, ''), node.right.value.replace(/\/?$/, '/'))});
            }
        }
    });
    return requireJsConfigFragments;
}

module.exports = function (options) {
    options = options || {};
    return function bundleRequireJs(assetGraph) {
        var requireJs;
        var entryPoints = [];
        assetGraph.findAssets({type: 'Html', isFragment: false, isLoaded: true}).forEach(function (htmlAsset) {
            assetGraph.findRelations({from: htmlAsset, type: 'HtmlScript'}).forEach(function (htmlScript, i, htmlScripts) {
                var dataMain = htmlScript.node.getAttribute('data-main');
                if (dataMain) {
                    var requireJsConfigFragments = [];
                    htmlScripts.slice(0, i).forEach(function (preceedingHtmlScript) {
                        if (preceedingHtmlScript.to && preceedingHtmlScript.to.isLoaded) {
                            Array.prototype.push.apply(requireJsConfigFragments, extractRequireJsConfigFragments(preceedingHtmlScript.to.parseTree, htmlAsset));
                        }
                    });
                    entryPoints.push({
                        htmlScript: htmlScript,
                        requireJsConfig: _.merge.apply(_, [{}].concat(requireJsConfigFragments))
                    });
                }
            });
        });
        if (entryPoints.length > 0) {
            try {
                requireJs = require('requirejs');
            } catch (e) {
                throw new Error(
                    'The graph contains ' + entryPoints.length + ' top-level data-main attribute' + (entryPoints.length === 1 ? '' : 's') +
                    ', but the requirejs package is not available. Please install requirejs in the the containing project.'
                );
            }

            var potentiallyOrphanedAssetsById = {};

            return Promise.map(entryPoints, function (entryPoint) {
                var requireJsConfig = entryPoint.requireJsConfig;
                var node = entryPoint.htmlScript.node;
                var dataMain = node.getAttribute('data-main');
                node.removeAttribute('data-main');
                var baseUrl = requireJsConfig.baseUrl;
                if (baseUrl) {
                    baseUrl = assetGraph.resolveUrl(entryPoint.htmlScript.from.nonInlineAncestor.url, baseUrl).replace(/^file:\/\//, '');
                } else {
                    baseUrl = urlTools.fileUrlToFsPath(assetGraph.root);
                    var lastIndexOfSlash = dataMain.lastIndexOf('/');
                    if (lastIndexOfSlash !== -1) {
                        baseUrl = assetGraph.resolveUrl(baseUrl, dataMain.slice(0, lastIndexOfSlash));
                        dataMain = dataMain.slice(lastIndexOfSlash + 1, dataMain.length);
                    }
                }
                baseUrl = baseUrl.replace(/\/?$/, '/'); // Ensure trailing slash
                var outBundleFile = getTemporaryFilePath({suffix: '.js'});
                var outCssFileName = outBundleFile.replace(/\.js$/, '.css');
                var requireJsOptimizeOptions = _.defaults({
                    siteRoot: urlTools.fileUrlToFsPath(assetGraph.root), // https://github.com/guybedford/require-css#siteroot-configuration
                    baseUrl: baseUrl,
                    name: dataMain,
                    out: outBundleFile,
                    generateSourceMaps: true,
                    preserveLicenseComments: false
                }, requireJsConfig);
                var dataAlmond = node.getAttribute('data-almond');
                if (dataAlmond) {
                    potentiallyOrphanedAssetsById[entryPoint.htmlScript.to.id] = entryPoint.htmlScript.to;
                    entryPoint.htmlScript.href = dataAlmond;
                    entryPoint.htmlScript.to = { url: dataAlmond };
                    node.removeAttribute('data-almond');
                }

                return new Promise(function (resolve) {
                    requireJs.optimize(requireJsOptimizeOptions, resolve); // Does not pass err as the first parameter
                }).then(function (buildResponse) {
                    //buildResponse is just a text output of the modules
                    //included. Load the built file for the contents.
                    //Use config.out to get the optimized file contents.
                    return fs.readFileAsync(outBundleFile, 'utf-8');
                }).then(function (contents) {
                    var sourceMapFileName;
                    contents = contents.replace(/\/\/[@#]\s*sourceMappingURL=([\w-\.]+)\s*$/, function ($0, sourceMapUrl) {
                        sourceMapFileName = pathModule.resolve(pathModule.dirname(outBundleFile), decodeURIComponent(sourceMapUrl));
                        return '';
                    });
                    var bundleAsset = new AssetGraph.JavaScript({
                        text: contents,
                        url: 'file://' + baseUrl + (dataMain ? dataMain + '-' : '') + 'bundle.js',
                        sourceMap: undefined
                    });
                    new AssetGraph.HtmlScript({
                        to: bundleAsset
                    }).attach(entryPoint.htmlScript.from, 'after', entryPoint.htmlScript);
                    assetGraph.addAsset(bundleAsset);
                    if (sourceMapFileName) {
                        return fs.readFileAsync(sourceMapFileName, 'utf-8').then(function (sourceMapContents) {
                            var sourceMap = JSON.parse(sourceMapContents);
                            sourceMap.file = '/' + urlTools.buildRelativeUrl(assetGraph.root, bundleAsset.url);
                            sourceMap.sources = sourceMap.sources.map(function (sourceFileName) {
                                return '/' + urlTools.buildRelativeUrl(assetGraph.root, 'file://' + baseUrl + sourceFileName);
                            });
                            bundleAsset.sourceMap = sourceMap;
                        }).finally(function () {
                            return fs.unlinkAsync(sourceMapFileName);
                        });
                    }
                }).then(function () {
                    return fs.statAsync(outCssFileName).catch(function () {}).then(function (stats) {
                        if (stats && stats.isFile()) {
                            return fs.readFileAsync(outCssFileName, 'utf-8').then(function (cssContents) {
                                if (cssContents) {
                                    var cssBundleAsset = new AssetGraph.Css({
                                        text: cssContents,
                                        url: 'file://' + baseUrl + (dataMain ? dataMain + '-' : '') + 'bundle.css',
                                        sourceMap: undefined
                                    });
                                    var htmlStyle = new AssetGraph.HtmlStyle({to: cssBundleAsset});
                                    var existingHtmlStyles = assetGraph.findRelations({from: entryPoint.htmlScript.from, type: 'HtmlStyle'});
                                    var lastExistingHtmlStyle = existingHtmlStyles[existingHtmlStyles.length - 1];
                                    htmlStyle.attach(entryPoint.htmlScript.from, lastExistingHtmlStyle ? 'after' : 'first', lastExistingHtmlStyle);
                                    assetGraph.addAsset(cssBundleAsset);
                                }
                            }).finally(function () {
                                fs.unlinkAsync(outCssFileName);
                            });
                        }
                    });
                }).finally(function () {
                    fs.unlinkAsync(outBundleFile);
                });
            }).then(function () {
                // Clean up require.js assets if nothing is referring to them any more
                Object.keys(potentiallyOrphanedAssetsById).forEach(function (assetId) {
                    var asset = potentiallyOrphanedAssetsById[assetId];
                    if (assetGraph.findRelations({to: asset}).length === 0) {
                        assetGraph.removeAsset(asset);
                    }
                });
            });
        }
    };
};
