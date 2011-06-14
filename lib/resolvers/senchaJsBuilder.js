var fs = require('fs'),
    urlTools = require('../util/urlTools'),
    seq = require('seq'),
    _ = require('underscore'),
    passError = require('../util/passError');

module.exports = function (fileUrl) {
    var matchJSBUrl = fileUrl.match(/^(.*\/)[^\/]*\.jsb([23])$/);

    if (!matchJSBUrl) {
        throw new Error("resolvers.SenchaJsBuilder: Url must end in .jsb2 or .jsb3: " + url);
    }
    var baseUrl = matchJSBUrl[1],
        jsbVersion = parseInt(matchJSBUrl[2], 10),
        jsbBody = JSON.parse(fs.readFileSync(urlTools.fileUrlToFsPath(fileUrl), 'utf-8')),
        pkgIndex = {};

    if (jsbVersion === 2) {
        jsbBody.packages = jsbBody.pkgs;
        delete jsbBody.pkgs;
    }

    jsbBody.builds = jsbBody.builds || [];

    ['packages', 'builds'].forEach(function (sectionName) {
        if (sectionName in jsbBody) {
            jsbBody[sectionName].forEach(function (pkg) {
                if (jsbVersion === 2) {
                    pkg.packages = pkg.pkgDeps;
                    delete pkg.pkgDeps;
                    pkg.target = pkg.file;
                    delete pkg.file;
                    pkg.files = pkg.fileIncludes.map(function (fileInclude) {
                        return {
                            path: fileInclude.path.replace(/^src\/ext-core/, "../ext-core"), // FIXME
                            name: fileInclude.text
                        };
                    });
                    delete pkg.fileIncludes;
                }
                pkgIndex[pkg.name] = pkgIndex[pkg.target] = pkg;
                if ('id' in pkg) {
                    pkgIndex[pkg.id] = pkg;
                }
            });
       }
    });

    function fixupAssetConfig(assetConfig, cb) {
        if (/\bresources\/.*\.css$/.test(assetConfig.url) && /^Ext JS Library [23].\d.\d/.test(jsbBody.licenseText)) {
            // Stupid ExtJS 3 has Css url()s relative to the target paths of their
            // bundles, NOT the source files!
            // Issue reported here: http://www.extjs.com/forum/showthread.php?p=330222
            // Work around it by around by substituting the url()s:

            fs.readFile(urlTools.fileUrlToFsPath(assetConfig.url), 'utf-8', passError(cb, function (src) {
                assetConfig.type = 'Css';
                assetConfig.decodedSrc = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/url\s*\(\s*/g, function () {
                    assetConfig.isDirty = true;
                    assetConfig.fixedUpExtJS = true;
                    return "url(../";
                });
                assetConfig.isResolved = true;
                cb(null, assetConfig);
            }));
        } else {
            process.nextTick(function () {
                cb(null, assetConfig);
            });
        }
    }

    function resolveExtBase(pkg, fileNames, cb) {
        seq(fileNames)
            .parMap(function (url) {
                fs.readFile(urlTools.fileUrlToFsPath(url), 'utf-8', this);
            })
            .unflatten()
            .seq(function (decodedSrcs) {
                cb(null, {
                    type: 'JavaScript',
                    isResolved: true,
                    isDirty: true,
                    fixedUpExtJS: true,
                    decodedSrc: decodedSrcs.join("\n"),
                    originalRelations: [], // Save the trouble of parsing it to find zero relations
                    url: urlTools.resolveUrl(baseUrl, pkg.target)
                });
            })
            ['catch'](cb);
    }

    function resolvePkg(pkg, cb) {
        var assetConfigs = [],
            fileNames = (pkg.files || []).map(function (fileDef) {
                return urlTools.resolveUrl(baseUrl, fileDef.path + fileDef.name);
            });

        if (pkg.name === 'Ext Base') {
            // Special case for the ext-base.js package, which doesn't work when included as individual files
            return resolveExtBase(pkg, fileNames, cb);
        }

        seq(pkg.packages || [])
            .parMap(function (dependentPkgTargetFileName) {
                if (!pkgIndex[dependentPkgTargetFileName] && dependentPkgTargetFileName === 'ext-base.js') {
                    dependentPkgTargetFileName = 'adapter/ext/ext-base.js'; // pkgDeps bug in ExtJS 3.2
                }
                resolvePkg(pkgIndex[dependentPkgTargetFileName], this);
            })
            .unflatten()
            .seq(function (resolvedAssetConfigs) {
                Array.prototype.push.apply(assetConfigs, resolvedAssetConfigs);
                this();
            })
            .set(fileNames)
            .parMap(function (url) {
                var assetConfig = {
                    url: url
                };
                if (/\.js$/.test(url)) {
                    assetConfig.originalRelations = [];
                }
                fixupAssetConfig(assetConfig, this);
            })
            .unflatten()
            .seq(function (fixedUpAssetConfigs) {
                cb(null, assetConfigs.concat(fixedUpAssetConfigs));
            })
            ['catch'](cb);
    }

    return function senchaJsBuilder(assetConfig, fromUrl, cb) {
        var labelRelativePath = assetConfig.url.replace(/^[^:]*:/, '');
        if (labelRelativePath in pkgIndex) {
            resolvePkg(pkgIndex[labelRelativePath], cb);
        } else {
            fixupAssetConfig({url: urlTools.resolveUrl(baseUrl, labelRelativePath)}, cb);
        }
    };
};
