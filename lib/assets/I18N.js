var util = require('util'),
    _ = require('underscore'),
    error = require('../util/error'),
    _JSON = require('./JSON');

function I18N(config) {
    _JSON.call(this, config);
}

util.inherits(I18N, _JSON);

_.extend(I18N.prototype, {
    defaultExtension: '.i18n'
});

module.exports = I18N;
