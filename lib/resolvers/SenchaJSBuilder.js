var fs = require('fs'),
    URL = require('url'),
    fileUtils = require('../fileUtils'),
    seq = require('seq'),
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

    resolveExtBase: function (pkg, fileNames, cb) {
        var that = this;
        return seq()
            .extend(fileNames)
            .parMap(function (url) {
                fs.readFile(fileUtils.fileUrlToFsPath(url), 'utf-8', this);
            })
            .seq(function () {
                cb(null, {
                    type: 'JavaScript',
                    isDirty: true,
                    decodedSrc: this.stack.join("\n"),
                    originalRelations: [], // Save the trouble of parsing it to find zero relations
                    url: URL.resolve(that.url, pkg.target)
                });
            })
            ['catch'](cb);
    },

    resolvePkg: function (pkg, cb) {
        var that = this,
            assetConfigs = [],
            fileNames = (pkg.files || []).map(function (fileDef) {
                return URL.resolve(that.url, fileDef.path + fileDef.name);
            });

        if (pkg.name === 'Ext Base') {
            // Special case for the ext-base.js package, which doesn't work when included as individual files
            return this.resolveExtBase(pkg, fileNames, cb);
        }

        seq()
            .extend(pkg.packages || [])
            .parMap(function (dependentPkgTargetFileName) {
                if (!that.pkgIndex[dependentPkgTargetFileName] && dependentPkgTargetFileName === 'ext-base.js') {
                    dependentPkgTargetFileName = 'adapter/ext/ext-base.js'; // pkgDeps bug in ExtJS 3.2
                }
                that.resolvePkg(that.pkgIndex[dependentPkgTargetFileName], this);
            })
            .seq(function () {
                Array.prototype.push.apply(assetConfigs, this.stack);
                this();
            })
            .set(fileNames)
            .flatten() // https://github.com/substack/node-seq/pull/9
            .parMap(function (url) {
                var assetConfig = {
                    url: url
                };
                if (/\.js$/.test(url)) {
                    assetConfig.originalRelations = [];
                }
                that.fixupAssetConfig(assetConfig, this);
            })
            .seq(function () {
                cb(null, assetConfigs.concat(this.stack));
            })
            ['catch'](cb);
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
