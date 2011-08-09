/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    query = require('../query'),
    Base = require('./Base');

function CssBehavior(config) {
    Base.call(this, config);
}

util.inherits(CssBehavior, Base);

extendWithGettersAndSetters(CssBehavior.prototype, {
    baseAssetQuery: {type: 'Html', url: query.isDefined},

    get href() {
        var matchUrl = this.cssRule.style[this.propertyName].match(/\burl\((\'|\"|)([^\'\"]+?)\1\)|$/);
        if (matchUrl) {
            return matchUrl[2];
        }
        // Else return undefined
    },

    set href(href) {
        var cssUrlToken;
        // Quote if necessary:
        if (/^[a-z0-9\/\-_.]*$/i.test(href)) {
            cssUrlToken = "url(" + href + ")";
        } else {
            cssUrlToken = "url('" + href.replace(/([\'\"])/g, "\\$1") + "')";
        }
        this.cssRule.style[this.propertyName] = cssUrlToken;
    },

    remove: function () {
        this.cssRule.style.removeProperty(this.propertyName);
        delete this.cssRule;
    }
});

module.exports = CssBehavior;
