var path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    error = require('../error');

var FindParentDirectory = module.exports = function (config) {
    // Expects: config.root
    _.extend(this, config || {});

    // Maintain a cache so that we don't need to do the same lookups over and over:
    this.dirExistsCache = {};
};

FindParentDirectory.prototype = {
    dirExists: function (dir, cb) {
        // FIXME: Put cb in a queue if we're already checking
        var cache = this.dirExistsCache;
        if (dir in cache) {
            process.nextTick(function () {
                cb(null, cache[dir]);
            });
        } else {
            path.exists(dir, function (exists) {
                cache[dir] = exists;
                cb(null, exists);
            });
        }
    },

    resolve: function (relation, cb) {
        var This = this,
            candidateUrls = [];
        step(
            function () {
                var baseUrlFragments = relation.baseUrl.split("/");
                baseUrlFragments.forEach(function (baseUrlFragment, i) {
                    var candidateUrl = baseUrlFragments.slice(0, i).concat(relation.label).join("/");
                    candidateUrls.push(candidateUrl);
                    This.dirExists(path.join(This.root, candidateUrl), this.parallel());
                }, this);
            },
            error.passToFunction(cb, function () { // ...
                var bestCandidateIndex = _.toArray(arguments).lastIndexOf(true);
                if (bestCandidateIndex !== -1) {
                    relation.url = path.join(candidateUrls[bestCandidateIndex], relation.url);
                    delete relation.label; // Maybe not?
                    cb(null, [relation]);
                } else {
                    cb(new Error("Couldn't resolve label " + relation.label + " from " + relation.baseUrl));
                }
            })
        );
    }
};
