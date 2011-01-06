/*global require, exports*/
var fs = require('fs'),
    error = require('./error');

exports.buildRelativeUrl = function(fromUrl, toUrl) {
    var fromFragments = fromUrl.split("/"),
        toFragments = toUrl.split("/"),
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

var defaultPermissions = parseInt('0666', 8);

exports.mkpath = function (dir, permissions, cb) {
    if (typeof permissions === 'function') {
        cb = permissions;
        permissions = parseInt('0666', 8);
    }
    fs.mkdir(dir, permissions, function (err) {
        if (err && err === process.ENOENT) {
            var parentDir = path.normalize(dir + "/..");
            if (parentDir !== '/' && parentDir !== '') {
                exports.mkpath(parentDir, permissions, error.passToFunction(cb, function () {
                    fs.mkdir(dir, permissions, cb);
                }));
                return;
            }
        }
        cb(err);
    });
};
