var util = require('util'),
    fs = require('fs'),
    _ = require('underscore'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    Base = require('./Base');

function SpriteConfiguration(config) {
    Base.call(this, config);
}

util.inherits(SpriteConfiguration, Base);

module.exports = SpriteConfiguration;
