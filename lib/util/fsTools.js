var fs = require('fs'),
    Path = require('path'),
    constants = process.ENOENT ? process : require('constants'),
    _ = require('underscore'),
    seq = require('seq'),
    passError = require('passerror'),
    fsTools = {};

fsTools.mkpath = function mkpath(dir, permissions, cb) {
    if (typeof permissions === 'function') {
        cb = permissions;
        permissions = parseInt('0777', 8); // Stupid JSLint
    }
    fs.mkdir(dir, permissions, function (err) {
        if (err && (err.code === 'EEXIST' || err.errno === constants.EEXIST)) {
            // Success!
            return cb();
        }
        if (err && (err.code === 'ENOENT' || err.errno === constants.ENOENT)) {
            var parentDir = Path.normalize(dir + "/..");
            if (parentDir !== '/' && parentDir !== '') {
                fsTools.mkpath(parentDir, permissions, passError(cb, function () {
                    fs.mkdir(dir, permissions, function (err) {
                        if (!err || err.code === 'EEXIST' || err.errno === constants.EEXIST) {
                            // Success!
                            return cb();
                        }
                        cb(err);
                    });
                }));
                return;
            }
        }
        cb(err);
    });
};

fsTools.mkpathAndWriteFile = function mkpathAndWriteFile(fileName, contents, encoding, cb) {
    fs.writeFile(fileName, contents, encoding, function (err) {
        if (err && (err.code === 'ENOENT' || err.errno === constants.ENOENT)) {
            fsTools.mkpath(Path.dirname(fileName), passError(cb, function () {
                fs.writeFile(fileName, contents, encoding, cb);
            }));
        } else {
            cb(err);
        }
    });
};

// FIXME: Make flushable
var dirExistsCache = {},
    dirExistsWaitingQueue = {};

fsTools.dirExistsCached = function dirExistsCached(fsPath, cb) {
    if (fsPath in dirExistsCache) {
        process.nextTick(function () {
            cb(null, dirExistsCache[fsPath]);
        });
    } else if (fsPath in dirExistsWaitingQueue) {
        dirExistsWaitingQueue[fsPath].push(cb);
    } else {
        dirExistsWaitingQueue[fsPath] = [cb];
        fs.stat(fsPath, function (err, stats) {
            var isDirectory = !err && stats.isDirectory();
            if (err && (err.code === 'ENOENT' || err.errno === contstants.ENOENT)) {
                err = null;
            }
            dirExistsCache[fsPath] = isDirectory;
            dirExistsWaitingQueue[fsPath].forEach(function (waitingCallback) {
                waitingCallback(err, isDirectory);
            });
            delete dirExistsWaitingQueue[fsPath];
        });
    }
};

fsTools.findParentDirCached = function findParentDirCached(fromPath, parentDirName, cb) {
    var candidatePaths = [],
        fromPathFragments = fromPath.replace(/\/$/, "").split("/");

    seq(fromPathFragments)
        .parMap(function (fromPathFragment, i) {
            // FIXME: Stop at caller's definition of root?
            var candidatePath = fromPathFragments.slice(0, i+1).concat(parentDirName).join("/");
            candidatePaths.push(candidatePath);
            fsTools.dirExistsCached(candidatePath, this);
        })
        .unflatten()
        .seq(function (dirExistsResults) {
            var bestCandidateIndex = dirExistsResults.lastIndexOf(true);
            if (bestCandidateIndex === -1) {
                return cb(new Error("fsTools.findParentDirCached: Couldn't find a parent dir named " + parentDirName + " from " + fromPath));
            }
            cb(null, candidatePaths[bestCandidateIndex]);
        })
        ['catch'](cb);
};

_.extend(exports, fsTools);
