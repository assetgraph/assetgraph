var path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    error = require('../../../error');

var SenchaJSBuilder = module.exports = function (config) {
    // Expects: config.url, config.body, config.root
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
        var This = this,
            assetConfigs = [];
        step(
            function () {
                if (pkg.pkgDeps && pkg.pkgDeps.length > 0) {
                    pkg.pkgDeps.forEach(function (pkgTargetFileName) {
                        var callback = this.parallel();
                        This.resolvePkg(This.pkgIndex[pkgTargetFileName], error.passToFunction(cb, function (pkgAssetConfigs) {
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
                    return path.join(This.url, fileDef.path, fileDef.name);
                });
                if (pkg.name === 'Ext Base') {
                    step(
                        function () {
                            var innerGroup = this.group();
                            urls.forEach(function (url) {
                                fs.readFile(path.join(This.root, url), 'utf8', innerGroup());
                            });
                        },
                        error.passToFunction(cb, function (fileBodies) {
                            assetConfigs.push({
                                type: 'JavaScript',
                                src: fileBodies.join("\n"),
                                pointers: {},
                                originalUrl: path.join(This.url, pkg.target)
                            });
                            cb(null, assetConfigs);
                        })
                    );
               } else {
                    var cssUrls = [];
                    urls.forEach(function (url) {
                        if (/\.css$/.test(url)) {
                            cssUrls.push(url);
                        } else {
                            assetConfigs.push({
                                // originalUrl: ...
                                url: url,
                                pointers: {}
                            });
                        }
                    });
                    if (cssUrls.length && /^Ext JS Library [23].\d.\d/.test(This.body.licenceText)) {
                        // Stupid ExtJS 3 has CSS url()s relative to the target paths of their
                        // bundles, NOT the source files!
                        // Issue reported here: http://www.extjs.com/forum/showthread.php?p=330222
                        // Work around it by around by substituting the url()s:
                        step(
                            function () {
                                var innerGroup = this.group();
                                cssUrls.forEach(function (cssUrl) {
                                    fs.readFile(path.join(This.root, cssUrl), 'utf8', innerGroup());
                                });
                            },
                            error.passToFunction(cb, function (cssFileBodies) {
                                cssFileBodies.forEach(function (cssFileBody, i) {
                                    assetConfigs.push({
                                        originalUrl: path.join(This.url, cssUrls[i]),
                                        type: 'CSS',
                                        src: cssFileBody.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/url\s*\(\s*/g, function () {
                                            return "url(..";
                                        })
                                    });
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

    resolve: function (assetConfig, label, baseUrl, cb) {
        if (assetConfig.url in this.pkgIndex) {
            this.resolvePkg(this.pkgIndex[assetConfig.url], cb);
        } else {
            assetConfig.url = path.join(this.url, assetConfig.url);
            process.nextTick(function () {
                cb(null, [assetConfig]);
            });
        }
    }
};
