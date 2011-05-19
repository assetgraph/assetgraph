/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../util/error'),
    Base = require('./Base');

function CSSImport(config) {
    Base.call(this, config);
}

util.inherits(CSSImport, Base);

_.extend(CSSImport.prototype, {
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

module.exports = CSSImport;
