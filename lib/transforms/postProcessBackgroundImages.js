var child_process = require('child_process'),
    fs = require('fs'),
    temp = require('temp'),
    _ = require('underscore'),
    seq = require('seq'),
    urlTools = require('../util/urlTools'),
    passError = require('../util/passError'),
    assets = require('../assets'),
    relations = require('../relations'),
    postProcessPropertyName = assets.Css.vendorPrefix + '-image-postprocess';

require('bufferjs');

function pipeThroughChildProcessAndBuffer(command, switches, src, cb) {
    var childProcess = child_process.spawn(command, switches),
        buffers = [];
    childProcess.stdout.on('data', function (buffer) {
        buffers.push(buffer);
    }).on('end', function () {
        cb(null, Buffer.concat(buffers));
    }).on('error', cb);
    childProcess.stdin.write(src);
}

var createFilter = {
    pngquant: function (argStr) {
        var numColors = 256,
            switches = [];
        if (argStr) {
            argStr.split(/\s+/).forEach(function (arg) {
                if (/^\d+$/.test(arg)) {
                    numColors = parseInt(arg, 10);
                } else if (/^-(?:nofs|nofloyd|ordered)$/.test(arg)) {
                    switches.push(arg);
                } else {
                    throw new Error("transforms.postProcessBackgroundImages: Invalid pngquant args: " + args);
                }
            });
        }
        switches.unshift(numColors);
        return function (src, cb) {
            pipeThroughChildProcessAndBuffer('pngquant', switches, src, cb);
        };
    },
    optipng: function (argStr) {
        var commandFragments = ['optipng'];
        if (/^\s*-o\d\s*$/.test(argStr)) {
            commandFragments.push(argStr);
        }
        return function (src, cb) {
            var tmpFileName = temp.path({suffix: '.png'});
            fs.writeFile(tmpFileName, src, null, passError(cb, function () {
                child_process.exec(commandFragments.join(" ") + " " + tmpFileName, passError(cb, function () {
                    fs.readFile(tmpFileName, null, function (err, processedSrc) {
                        fs.unlink(tmpFileName);
                        if (err) {
                            return cb(err);
                        }
                        cb(null, processedSrc);
                    });
                }));
            }));
        };
    },
    pngcrush: function (argStr) {
        var commandFragments = ['pngcrush', '-nofilecheck'];
        argStr.split(/\s+/).forEach(function (arg) {
            if (/^[\w\d\-\.]+$/.test(arg)) {
                commandFragments.push(arg);
            }
        });
        return function (src, cb) {
            var tmpFileName1 = temp.path({suffix: '.png'}),
                tmpFileName2 = temp.path({suffix: '.png'});
            fs.writeFile(tmpFileName1, src, null, passError(cb, function () {
                child_process.exec(commandFragments.join(" ") + " " + tmpFileName1 + " " + tmpFileName2, passError(cb, function () {
                    fs.readFile(tmpFileName2, null, function (err, processedSrc) {
                        fs.unlink(tmpFileName1);
                        fs.unlink(tmpFileName2);
                        if (err) {
                            return cb(err);
                        }
                        cb(null, processedSrc);
                    });
                }));
            }));
        };
    }
};

function applyFilters(buffer, filters, cb) {
    if (filters.length === 0) {
        return process.nextTick(function () {
            cb(null, buffer);
        });
    }

    var nextFilterNum = 0;
    function proceed () {
        if (nextFilterNum < filters.length) {
            var nextFilter = filters[nextFilterNum];
            nextFilterNum += 1;
            nextFilter(buffer, passError(cb, function (resultBuffer) {
                buffer = resultBuffer;
                proceed();
            }));
        } else {
            cb(null, buffer);
        }
    }
    proceed();
}

module.exports = function (queryObj) {
    return function postProcessBackgroundImages(assetGraph, cb) {
        var imageInfos = [];
        assetGraph.findRelations(_.extend({type: 'CssImage'}, queryObj)).forEach(function (relation) {
            var postProcessValue = relation.cssRule.style[postProcessPropertyName];
            if (postProcessValue) {
                if (/^_/.test(relation.propertyName)) {
                    console.warn("transforms.postProcessBackgroundImages warning: Skipping " + relation.propertyName);
                } else {
                    var imageInfo = {
                        filters: [],
                        asset: relation.to,
                        incomingRelations: [relation]
                    };
                    postProcessValue.match(/\w+(?:\([^\)]*\))?/g).forEach(function (commandStr) {
                        if (commandStr.toLowerCase() === 'ie6') {
                            imageInfo.ie6 = true;
                        } else {
                            var commandMatch = commandStr.match(/^(pngquant|pngcrush|optipng)(?:\(([^\)]*)\))?/);
                            if (commandMatch) {
                                imageInfo.filters.push(createFilter[commandMatch[1]](commandMatch[2]));
                            }
                        }
                    });
                    imageInfos.push(imageInfo);
                }
            }
        });
        if (imageInfos.length === 0) {
            return process.nextTick(cb);
        }
        seq(imageInfos)
            .parEach(function (imageInfo, i) {
                assetGraph.getAssetRawSrc(imageInfo.asset, this.into("" + i));
            })
            .parEach(function (imageInfo, i) {
                applyFilters(this.vars[i], imageInfo.filters, this.into("" + i));
            })
            .parEach(function (imageInfo, i) {
                var processedAsset = new assets.Png({
                    rawSrc: this.vars[i]
                });
                processedAsset.url = urlTools.resolveUrl(assetGraph.root, processedAsset.id + processedAsset.defaultExtension);
                assetGraph.addAsset(processedAsset);
                imageInfo.incomingRelations.forEach(function (incomingRelation) {
                    var style = incomingRelation.cssRule.style;
                    style.removeProperty(postProcessPropertyName);
                    if (imageInfo.ie6) {
                        // Designates that the processed image should only be used in IE6
                        // Keep the original relation and use the underscore hack for getting
                        // IE6 to fetch the processed version:
                        if (('_' + incomingRelation.propertyName) in style) {
                            throw new Error("transforms.postProcessBackgroundImages: Underscore hack already in use in Css rule");
                        }
                        style.setProperty('_' + incomingRelation.propertyName, 'url(...)', style.getPropertyPriority(incomingRelation.propertyName));
                        var relation = new relations.CssImage({
                            propertyName: '_' + incomingRelation.propertyName,
                            cssRule: incomingRelation.cssRule,
                            from: incomingRelation.from,
                            to: processedAsset
                        });
                        assetGraph.addRelation(relation, 'after', incomingRelation);
                        assetGraph.refreshRelationUrl(relation);
                    } else {
                        // All browsers should see the processed version, replace the old relation:
                        var relation = new relations.CssImage({
                            propertyName: incomingRelation.propertyName,
                            cssRule: incomingRelation.cssRule,
                            from: incomingRelation.from,
                            to: processedAsset
                        });
                        assetGraph.addRelation(relation, 'after', incomingRelation);
                        assetGraph.refreshRelationUrl(relation);
                        assetGraph.removeRelation(incomingRelation);
                    }
                    incomingRelation.from.markDirty();
                });
                // Remove original asset if it has become orphaned:
                if (!assetGraph.findRelations({to: imageInfo.asset}).length) {
                    assetGraph.removeAsset(imageInfo.asset);
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
