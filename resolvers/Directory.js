var path = require('path'),
    _ = require('underscore');

var Directory = module.exports = function (config) {
    // Expects: config.baseUrl, config.root
    _.extend(this, config);
};

Directory.prototype = {
    resolve: function (relation, cb) {
        relation.url = path.join(this.baseUrl, relation.url);
        delete relation.label; // Hmm, maybe keep it around?
        process.nextTick(function () {
            cb(null, [relation]);
        });
    }
};
