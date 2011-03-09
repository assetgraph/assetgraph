/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    query = require('../query'),
    Base = require('./Base').Base;

function CSSBehavior(config) {
    Base.call(this, config);
}

util.inherits(CSSBehavior, Base);

_.extend(CSSBehavior.prototype, {
    baseAssetQuery: {type: 'HTML', url: query.defined},

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
        this.cssRule.style.setProperty('behavior', cssUrlToken);
    }
});

exports.CSSBehavior = CSSBehavior;
