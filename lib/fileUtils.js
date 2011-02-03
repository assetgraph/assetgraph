var fs = require('fs'),
    URL = require('url'),
    path = require('path'),
    error = require('./error'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = {};

fileUtils.buildRelativeUrl = function buildRelativeUrl(fromUrl, toUrl) {
    var minLength = Math.min(fromUrl.length, toUrl.length),
        commonPrefixLength = 0;
    while (commonPrefixLength < minLength && fromUrl[commonPrefixLength] === toUrl[commonPrefixLength]) {
        commonPrefixLength += 1;
    }
    var commonPrefix = fromUrl.substr(0, commonPrefixLength),
        commonPrefixMatch = commonPrefix.match(/^(file:\/\/|[^:]+:\/\/[^\/]+\/)/);

    if (commonPrefixMatch) {
        var fromFragments = fromUrl.substr(commonPrefixMatch[1].length).replace(/^\/+/, "").replace(/[^\/]+$/, "").split(/\//),
            toFragments = toUrl.substr(commonPrefixMatch[1].length).replace(/^\/+/, "").split(/\//);

        fromFragments.pop();

        var i = 0;
        while (i < fromFragments.length && i < toFragments.length && fromFragments[i] === toFragments[i]) {
            i += 1;
        }
        var relativeUrl = toFragments.slice(i).join("/");
        while (i < fromFragments.length) {
            relativeUrl = '../' + relativeUrl;
            i += 1;
        }
        return relativeUrl;
    } else {
        return toUrl; // No dice
    }
};

fileUtils.mkpath = function mkpath(dir, permissions, cb) {
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

fileUtils.fileUrlToFsPath = function fileUrlToFsPath(fileUrl) {
    // FIXME: Will be /C:/... on Windows, is that OK?
    return fileUrl.substr("file://".length);
};

fileUtils.fsPathToFileUrl = function fsPathToFileUrl(fsPath, forceDirectory) {
    // FIXME: Turn into /C:/... on Windows
    if (forceDirectory && !/\/$/.test(fsPath)) {
        // URL.resolve misbehaves if paths don't end with a slash (how would it know to do otherwise?)
        fsPath += "/";
    }
    if (fsPath[0] === '/') {
        return "file://" + fsPath;
    } else {
        // Interpret as relative to the current working dir
        return "file://" + path.join(process.cwd(), fsPath);
    }
};

// FIXME: Make flushable
var dirExistsCache = {},
    dirExistsWaitingQueue = {};

fileUtils.dirExistsCached = function dirExistsCached(fsPath, cb) {
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

fileUtils.findParentDirCached = function findParentDirCached(fromPath, parentDirName, cb) {
    var candidatePaths = [],
        fromPathFragments = fromPath.replace(/\/$/, "").split("/");

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
