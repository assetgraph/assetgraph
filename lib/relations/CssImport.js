/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function CssImport(config) {
    Base.call(this, config);
}

util.inherits(CssImport, Base);

_.extend(CssImport.prototype, {
    _getRawUrlString: function () {
        return this.cssRule.href;
    },

    _setRawUrlString: function (url) {
        this.cssRule.href = url;
    },

    remove: function () {
        this.parentRule.deleteRule(this.parentRule.cssRules.indexOf(this.cssRule));
        delete this.cssRule;
    }
});

module.exports = CssImport;
