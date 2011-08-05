var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Json = require('./Json');

function I18n(config) {
    Json.call(this, config);
}

util.inherits(I18n, Json);

extendWithGettersAndSetters(I18n.prototype, {
    defaultExtension: '.i18n'
});

module.exports = I18n;
