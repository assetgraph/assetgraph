var fs = require('fs'),
    constants = process.ENOENT ? process : require('constants'),
    URL = require('url'),
    glob = require('glob'),
    path = require('path'),
    error = require('./error'),
    seq = require('seq'),
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
        if (err && err.errno === constants.EEXIST) {
            // Success!
            return cb();
        }
        if (err && err.errno === constants.ENOENT) {
            var parentDir = path.normalize(dir + "/..");
            if (parentDir !== '/' && parentDir !== '') {
                fileUtils.mkpath(parentDir, permissions, error.passToFunction(cb, function () {
                    fs.mkdir(dir, permissions, function (err) {
                        if (!err || err.errno === constants.EEXIST) {
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

fileUtils.mkpathAndWriteFile = function mkpathAndWriteFile(fileName, contents, encoding, cb) {
    fs.writeFile(fileName, contents, encoding, function (err) {
        if (err && err.errno === constants.ENOENT) {
            fileUtils.mkpath(path.dirname(fileName), error.passToFunction(cb, function () {
                fs.writeFile(fileName, contents, encoding, cb);
            }));
        } else {
            cb(err);
        }
    });
};

fileUtils.ensureTrailingSlash = function ensureTrailingSlash(str) { // url or path
    return (str.lastIndexOf("/") + 1 === str.length) ? str : str + '/';
};

fileUtils.fileUrlToFsPath = function fileUrlToFsPath(fileUrl) {
    // FIXME: Will be /C:/... on Windows, is that OK?
    return fileUrl.substr("file://".length);
};

fileUtils.fsFilePathToFileUrl = function fsFilePathToFileUrl(fsFilePath) {
    // FIXME: Turn into /C:/... on Windows
    if (fsFilePath[0] === '/') {
        return "file://" + fsFilePath;
    } else {
        // Interpret as relative to the current working dir
        return "file://" + path.join(process.cwd(), fsFilePath);
    }
};

// Wrapper around fsFilePathToFileUrl that makes sure that the resulting file: url ends in a slash.
// URL.resolve misbehaves if they don't (how would it know to do otherwise?)
fileUtils.fsDirToFileUrl = function fsDirToFileUrl(fsDir) {
    return fileUtils.fsFilePathToFileUrl(/\/$/.test(fsDir) ? fsDir : fsDir + '/');
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

    seq()
        .extend(fromPathFragments)
        .parMap(function (fromPathFragment, i) {
            // FIXME: Stop at caller's definition of root?
            var candidatePath = fromPathFragments.slice(0, i+1).concat(parentDirName).join("/");
            candidatePaths.push(candidatePath);
            fileUtils.dirExistsCached(candidatePath, this);
        })
        .seq(function () {
            var bestCandidateIndex = this.stack.lastIndexOf(true);
            if (bestCandidateIndex === -1) {
                return cb(new Error("fileUtils.findParentDirCached: Couldn't find a parent dir named " + parentDirName + " from " + fromPath));
            }
            cb(null, candidatePaths[bestCandidateIndex]);
        })
        ['catch'](cb);
};

fileUtils.makeFileUrlMatcher = function makeFileUrlMatcher() { // ...
    var matchers = _.flatten(arguments).map(function (fsPattern) {
        if (!/^\//.test(fsPattern)) {
            fsPattern = path.join(process.cwd(), fsPattern);
        }
        return function (url) {
            return /^file:/.test(url) && glob.fnmatch(fsPattern, fileUtils.fileUrlToFsPath(url));
        };
    });
    if (matchers.length === 1) {
        return matchers[0];
    } else {
        return function (url) {
            for (var i = 0 ; i < matchers.length ; i += 1) {
                if (matchers[i](url)) {
                    return true;
                }
            }
            return false;
        };
    }
};

// This sucks and is badly named. It tries to "calculate backwards" from an absolute url to a relative
// url at the same "level" as another relative url, possible containing wildcards. Yuck.
// inferRelativeUrl("bla/*/quux.json", "file:///here/is/the/bla/thing/quux.json"); // "bla/thing/quux.json"
fileUtils.inferRelativeUrl = function inferRelativeUrl(relativeUrl, absoluteUrl) {
    return absoluteUrl.match(new RegExp("(" + relativeUrl.replace(/\./g, "\\.").replace(/\*/g, "([^\/]+)") + ")$"))[1];
};

_.extend(exports, fileUtils);
