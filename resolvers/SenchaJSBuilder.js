var path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    error = require('../error');

var SenchaJSBuilder = module.exports = function (config) {
    // Expects: config.root, config.body
    _.extend(this, config);

    if (this.version !== 2 && this.version !== 3) {
        throw "SenchaJSBuilder: Unsupported version: " + this.version;
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
            relations = [];
        step(
            function () {
                if (pkg.pkgDeps && pkg.pkgDeps.length > 0) {
                    pkg.pkgDeps.forEach(function (pkgTargetFileName) {
                        var callback = this.parallel();
                        This.resolvePkg(This.pkgIndex[pkgTargetFileName], error.passToFunction(cb, function (pkgRelations) {
                            [].push.apply(relations, pkgRelations);
                            callback();
                        }));
                    }, this);
                } else {
                    process.nextTick(this);
                }
            },
            function () {
                var urls = (pkg.files || []).map(function (fileDef) {
                    return path.join(This.baseUrl, fileDef.path, fileDef.name);
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
                            relations.push({
                                type: 'JavaScript',
                                assetPointers: {}, // Huhm...
                                inlineData: fileBodies.join("\n"),
                                originalUrl: path.join(This.baseUrl, pkg.target)
                            });
                            cb(null, relations);
                        })
                    );
               } else {
                    var cssUrls = [];
                    urls.forEach(function (url) {
                        if (/\.css$/.test(url)) {
                            cssUrls.push(url);
                        } else {
                            relations.push({
                                // originalUrl: ...
                                assetPointers: {}, // Huhm...
                                url: url
                            });
                        }
                    });
                    if (cssUrls.length && /^Ext JS Library [23].\d.\d/.test(This.body.licenceText)) {
                        // Stupid ExtJS 3 has CSS url()s relative to the target paths of their target
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
                                    relations.push({
                                        type: 'CSS',
                                        originalUrl: path.join(This.baseUrl, cssUrls[i]),
                                        inlineData: cssFileBody.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/url\s*\(\s*/g, function () {
                                            return "url(..";
                                        })
                                    });
                                });
                                cb(null, relations);
                            })
                        );
                    } else {
                        cssUrls.forEach(function (cssUrl) {
                            relations.push({
                                type: 'CSS',
                                url: cssUrl
                            });
                        });
                        cb(null, relations);
                    }
                }
            }
        );
    },

    resolve: function (pointer, cb) {
        var This = this,
            pkg = this.pkgIndex[pointer.url];
        if (pkg) {
            this.resolvePkg(pkg, error.passToFunction(cb, function (relations) {
                relations.forEach(function (relation) {
                    relation.pointer = pointer;
                });
                cb(null, relations);
            }));
        } else {
            process.nextTick(function () {
                cb(null, [{
                    pointer: pointer,
                    url: path.join(This.baseUrl, pointer.url)
                }]);
            });
        }
    }
};
