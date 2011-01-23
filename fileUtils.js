/*global require, exports*/
var fs = require('fs'),
    path = require('path'),
    error = require('./error'),
    step = require('step'),
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

fileUtils.fileUrlToPathName = function (fileUrl) {
    // FIXME: Will be /C:/... on Windows
    return fileUrl.pathname.substr(2);
};

// FIXME: Make flushable
var dirExistsCache = {},
    dirExistsWaitingQueue = {};

fileUtils.dirExistsCached = function (fsPath, cb) {
    if (fsPath in dirExistsCache) {
        process.nextTick(function () {
            cb(null, dirExistsCache[fsPath]);
        });
    } else if (fsPath in dirExistsWaitingQueue) {
        dirExistsWaitingQueue[fsPath].push(cb);
    } else {
        dirExistsWaitingQueue[fsPath] = [cb];
        path.exists(fsPath, function (exists) {
            dirExistsCache[fsPath] = exists;
            dirExistsWaitingQueue[fsPath].forEach(function (waitingCallback) {
                waitingCallback(null, exists);
            });
            delete dirExistsWaitingQueue[fsPath];
        });
    }
};

fileUtils.findParentDirCached = function (fromPath, parentDirName, cb) {
    if (typeof fromPath === 'object') {
        fromPath = fileUtils.fileUrlToPathName(fromPath);
    }
    var candidatePaths = [],
        fromPathFragments = fromPath.split("/");

    step(
        function () {
            fromPathFragments.forEach(function (fromPathFragment, i) {
                // FIXME: Stop at caller's definition of root?
                var candidatePath = fromPathFragments.slice(0, i+1).concat(parentDirName).join("/");
                candidatePaths.push(candidatePath);
                fileUtils.dirExistsCached(candidatePath, this.parallel());
            }, this);
        },
        error.passToFunction(cb, function () { // ...
            var bestCandidateIndex = _.toArray(arguments).lastIndexOf(true);
            if (bestCandidateIndex === -1) {
                return cb(new Error("fileUtils.findParentDirCached: Couldn't find a parent dir named " + parentDirName + " from " + fromPath));
            }
            cb(null, candidatePaths[bestCandidateIndex]);
        })
    );
};

_.extend(exports, fileUtils);
