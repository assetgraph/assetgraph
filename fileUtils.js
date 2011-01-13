/*global require, exports*/
var fs = require('fs'),
    path = require('path'),
    error = require('./error'),
    _ = require('underscore'),
    fileUtils = {};

fileUtils.splitUrl = function(url) {
    if (url === '.' || url === '') {
        return [];
    } else {
        return url.split("/");
    }
};

fileUtils.buildRelativeUrl = function(fromUrl, toUrl) {
    var fromFragments = fileUtils.splitUrl(fromUrl),
        toFragments = fileUtils.splitUrl(toUrl),
        relativeUrlFragments = [];
    // The last part of the criterion looks broken, shouldn't it be fromFragments[0] === toFragments[0] ?
    // -- but it's a direct port of what the perl code has done all along.
    while (fromFragments.length && toFragments.length && fromFragments[fromFragments.length-1] === toFragments[0]) {
        fromFragments.pop();
        toFragments.shift();
    }
    for (var i=0 ; i<fromFragments.length ; i++) {
        relativeUrlFragments.push('..');
    }
    [].push.apply(relativeUrlFragments, toFragments);
    return relativeUrlFragments.join("/");
};

fileUtils.dirnameNoDot = function (url) {
    var dirname = path.dirname(url);
    return (dirname === '.' ? "" : dirname);
};

fileUtils.mkpath = function (dir, permissions, cb) {
    if (typeof permissions === 'function') {
        cb = permissions;
        permissions = parseInt('0777', 8); // Stupid JSLint
    }
    fs.mkdir(dir, permissions, function (err) {
        if (err && err.errno === process.EEXIST) {
            // Success!
            return cb();
        }
        if (err && err.errno === process.ENOENT) {
            var parentDir = path.normalize(dir + "/..");
            if (parentDir !== '/' && parentDir !== '') {
                fileUtils.mkpath(parentDir, permissions, error.passToFunction(cb, function () {
                    fs.mkdir(dir, permissions, cb);
                }));
                return;
            }
        }
        cb(err);
    });
};

_.extend(exports, fileUtils);
