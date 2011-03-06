/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function CSSBehavior(config) {
    Base.call(this, config);
}

util.inherits(CSSBehavior, Base);

_.extend(CSSBehavior.prototype, {
    remove: function () {
        this.cssRule.style.removeProperty('behavior');
        delete this.cssRule;
    },

    _setRawUrlString: function (url) {
        var cssUrlToken;
        // Quote if necessary:
        if (/^[a-z0-9\/\-_.]*$/i.test(url)) {
            cssUrlToken = "url(" + url + ")";
        } else {
            cssUrlToken = "url('" + url.replace(/([\'\"])/g, "\\$1") + "')";
        }
        this.cssRule.style.setProperty(this.propertyName, cssUrlToken);
    }
});

exports.CSSBehavior = CSSBehavior;
