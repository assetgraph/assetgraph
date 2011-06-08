var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Json = require('./Json');

function I18n(config) {
    Json.call(this, config);
}

util.inherits(I18n, Json);

_.extend(I18n.prototype, {
    defaultExtension: '.i18n'
});

module.exports = I18n;
