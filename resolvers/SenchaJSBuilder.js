var fs = require('fs'),
    URL = require('url'),
    fileUtils = require('../fileUtils'),
    step = require('step'),
    _ = require('underscore'),
    error = require('../error');

var SenchaJSBuilder = module.exports = function (config) {
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
    resolvePkg: function (pkg, cb) {
        var that = this,
            assetConfigs = [];
        step(
            function () {
                if (pkg.packages && pkg.packages.length > 0) {
                    pkg.packages.forEach(function (pkgTargetFileName) {
                        var callback = this.parallel();
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
                    return URL.parse(URL.resolve(that.url, fileDef.path + fileDef.name));
                });
                if (!urls.length) {
                    return cb(null, assetConfigs);
                }
                if (pkg.name === 'Ext Base') {
                    step(
                        function () {
                            var innerGroup = this.group();
                            urls.forEach(function (url) {
                                fs.readFile(fileUtils.fileUrlToFsPath(url), 'utf8', innerGroup());
                            });
                        },
                        error.passToFunction(cb, function (fileBodies, i) {
                            assetConfigs.push({
                                type: 'JavaScript',
                                dirty: true,
                                originalSrc: fileBodies.join("\n"),
                                originalRelations: [],
                                url: urls[i]
                            });
                            cb(null, assetConfigs);
                        })
                    );
                } else {
                    var cssUrls = [];
                    urls.forEach(function (url) {
                        if (/\.css$/.test(url.pathname)) {
                            cssUrls.push(url);
                        } else {
                            assetConfigs.push({
                                url: url,
                                originalRelations: []
                            });
                        }
                    });
                    if (cssUrls.length && /^Ext JS Library [23].\d.\d/.test(that.body.licenseText)) {
                        // Stupid ExtJS 3 has CSS url()s relative to the target paths of their
                        // bundles, NOT the source files!
                        // Issue reported here: http://www.extjs.com/forum/showthread.php?p=330222
                        // Work around it by around by substituting the url()s:
                        step(
                            function () {
                                var innerGroup = this.group();
                                cssUrls.forEach(function (cssUrl) {
                                    fs.readFile(fileUtils.fileUrlToFsPath(cssUrl), 'utf8', innerGroup());
                                });
                            },
                            error.passToFunction(cb, function (cssFileBodies) {
                                cssFileBodies.forEach(function (cssFileBody, i) {
                                    var assetConfig = {
                                        url: cssUrls[i],
                                        type: 'CSS'
                                    };
                                    assetConfig.originalSrc = cssFileBody.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/url\s*\(\s*/g, function () {
                                        assetConfig.dirty = true;
                                        return "url(../";
                                    });
                                    assetConfigs.push(assetConfig);
                                });
                                cb(null, assetConfigs);
                            })
                        );
                    } else {
                        cssUrls.forEach(function (cssUrl) {
                            assetConfigs.push({
                                url: cssUrl,
                                type: 'CSS'
                            });
                        });
                        cb(null, assetConfigs);
                    }
                }
            }
        );
    },

    resolve: function (url, cb) {
        if (url.pathname in this.pkgIndex) {
            this.resolvePkg(this.pkgIndex[url.pathname], cb);
        } else {
            var assetConfig = {
                url: URL.parse(URL.resolve(this.url, url.pathname))
            };
            process.nextTick(function () {
                cb(null, assetConfig);
            });
        }
    }
};
