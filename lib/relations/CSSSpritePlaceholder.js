/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    Base = require('./Base');

function CSSSpritePlaceholder(config) {
    Base.call(this, config);
}

util.inherits(CSSSpritePlaceholder, Base);

_.extend(CSSSpritePlaceholder.prototype, {
    remove: function () {
        ['selector-for-group', 'packer', 'image-format', 'background-color'].forEach(function (propertyName) {
            this.cssRule.style.removeProperty(assets.CSS.vendorPrefix + '-sprite-' + propertyName);
        }, this);
        delete this.cssRule;
    }
});

module.exports = CSSSpritePlaceholder;
