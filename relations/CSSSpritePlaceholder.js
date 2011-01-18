/*global require, exports*/
var util = require('util'),
    Buffer = require('buffer').Buffer,
    _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    Base = require('./Base').Base;

function CSSSpritePlaceholder(config) {
    Base.call(this, config);
}

util.inherits(CSSSpritePlaceholder, Base);

_.extend(CSSSpritePlaceholder.prototype, {
    remove: function () {
        this.cssRule[assets.CSS.vendorPrefix + '-sprite-selector-for-group'] = null;
        delete this.cssRule;
    }
});

exports.CSSSpritePlaceholder = CSSSpritePlaceholder;
