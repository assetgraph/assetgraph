var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function CacheManifest(config) {
    Base.call(this, config);
}

util.inherits(CacheManifest, Base);

_.extend(CacheManifest.prototype, {
    contentType: 'text/cache-manifest'
});

exports.CacheManifest = CacheManifest;
