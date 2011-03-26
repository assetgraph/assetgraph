var fs = require('fs'),
    URL = require('url'),
    fileUtils = require('../fileUtils'),
    step = require('step'),
    _ = require('underscore'),
    error = require('../error');

function SenchaJSBuilder(config) {
    // Expects: config.url, config.body
    _.extend(this, config);
    if (this.version !== 2 && this.version !== 3) {
        throw new Error("SenchaJSBuilder: Unsupported version: " + this.version);
    }

    this.pkgIndex = {};
    if (this.version === 2) {
        this.body.packages = this.body.pkgs;
        delete this.body.pkgs;
    }

    this.body.builds = this.body.builds || [];

    ['packages', 'builds'].forEach(function (sectionName) {
        if (sectionName in this.body) {
            this.body[sectionName].forEach(function (pkg) {
                if (this.version === 2) {
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
                this.pkgIndex[pkg.name] = this.pkgIndex[pkg.target] = pkg;
                if ('id' in pkg) {
                    this.pkgIndex[pkg.id] = pkg;
                }
            }, this);
       }
    }, this);
};

SenchaJSBuilder.prototype = {
    fixupAssetConfig: function (assetConfig, cb) {
        if (/\bresources\/.*\.css$/.test(assetConfig.url) && /^Ext JS Library [23].\d.\d/.test(this.body.licenseText)) {
            // Stupid ExtJS 3 has CSS url()s relative to the target paths of their
            // bundles, NOT the source files!
            // Issue reported here: http://www.extjs.com/forum/showthread.php?p=330222
            // Work around it by around by substituting the url()s:

            fs.readFile(fileUtils.fileUrlToFsPath(assetConfig.url), 'utf-8', error.passToFunction(cb, function (src) {
                assetConfig.type = 'CSS';
                assetConfig.decodedSrc = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/url\s*\(\s*/g, function () {
                    assetConfig.isDirty = true;
                    return "url(../";
                });
                cb(null, assetConfig);
            }));
        } else {
            process.nextTick(function () {
                cb(null, assetConfig);
            });
        }
    },

    resolvePkg: function (pkg, cb) {
        var that = this,
            assetConfigs = [];
        step(
            function () {
                if (pkg.packages && pkg.packages.length > 0) {
                    pkg.packages.forEach(function (pkgTargetFileName) {
                        var callback = this.parallel();
                        if (!that.pkgIndex[pkgTargetFileName] && pkgTargetFileName === 'ext-base.js') {
                            pkgTargetFileName = 'adapter/ext/ext-base.js'; // pkgDeps bug in ExtJS 3.2
                        }
                        that.resolvePkg(that.pkgIndex[pkgTargetFileName], error.passToFunction(cb, function (pkgAssetConfigs) {
                            [].push.apply(assetConfigs, pkgAssetConfigs);
                            callback();
                        }));
                    }, this);
                } else {
                    process.nextTick(this);
                }
            },
            function () {
                var urls = (pkg.files || []).map(function (fileDef) {
                    return URL.resolve(that.url, fileDef.path + fileDef.name);
                });
                if (!urls.length) {
                    return cb(null, assetConfigs);
                }
                if (pkg.name === 'Ext Base') {
                    // Special case for the ext-base.js package, which doesn't work when included as individual files
                    return step(
                        function () {
                            var innerGroup = this.group();
                            urls.forEach(function (url) {
                                fs.readFile(fileUtils.fileUrlToFsPath(url), 'utf-8', innerGroup());
                            });
                        },
                        error.passToFunction(cb, function (fileBodies, i) {
                            assetConfigs.push({
                                type: 'JavaScript',
                                isDirty: true,
                                decodedSrc: fileBodies.join("\n"),
                                originalRelations: [], // Save the trouble of parsing it to find zero relations
                                url: URL.resolve(that.url, pkg.target)
                            });
                            cb(null, assetConfigs);
                        })
                    );
                }
                var group = this.group();
                urls.forEach(function (url) {
                    var assetConfig = {
                        url: url
                    };
                    if (/\.js$/.test(url)) {
                        assetConfig.originalRelations = [];
                    }
                    that.fixupAssetConfig(assetConfig, group());
                });
            },
            error.passToFunction(cb, function (fixedAssetConfigs) {
                cb(null, assetConfigs.concat(fixedAssetConfigs));
            })
        );
    },

    resolve: function (labelRelativePath, cb) {
        if (labelRelativePath in this.pkgIndex) {
            this.resolvePkg(this.pkgIndex[labelRelativePath], cb);
        } else {
            this.fixupAssetConfig({
                url: URL.resolve(this.url, labelRelativePath)
            }, cb);
        }
    }
};

module.exports = SenchaJSBuilder;
