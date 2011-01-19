/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function CacheManifestEntry(config) {
    Base.call(this, config);
}

util.inherits(CacheManifestEntry, Base);

_.extend(CacheManifestEntry.prototype, {
    setUrl: function (url) {
        this.node.url = url;
    }
});

exports.CacheManifestEntry = CacheManifestEntry;
