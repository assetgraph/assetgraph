var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    _JSON = require('./JSON');

function SpriteConfiguration(config) {
    _JSON.call(this, config);
}

util.inherits(SpriteConfiguration, _JSON);

_.extend(SpriteConfiguration.prototype, {
    defaultExtension: null
});

module.exports = SpriteConfiguration;
