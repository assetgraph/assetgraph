var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    canonicalizeObject = require('../canonicalizeObject'),
    Json = require('./Json');

function I18n(config) {
    Json.call(this, config);
}

util.inherits(I18n, Json);

extendWithGettersAndSetters(I18n.prototype, {
    contentType: null, // Avoid reregistering application/json

    supportedExtensions: ['.i18n'],

    prettyPrint: function () {
        Json.prototype.prettyPrint.call(this);
        this._parseTree = canonicalizeObject(this._parseTree, 2);
    }
});

module.exports = I18n;
