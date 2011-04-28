var _ = require('underscore');

function Directory(config) {
    // Expects: config.url
    _.extend(this, config);
}

Directory.prototype = {
    resolve: function (labelRelativePath, cb) {
        var assetConfig = {
            url: this.url + labelRelativePath
        };
        process.nextTick(function () {
            cb(null, assetConfig);
        });
    }
};

module.exports = Directory;
