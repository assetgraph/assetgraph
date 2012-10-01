/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptShimRequire(config) {
    if (config.href) {
        this._href = config.href;
        delete config.href;
    }
    Relation.call(this, config);
}

util.inherits(JavaScriptShimRequire, Relation);

extendWithGettersAndSetters(JavaScriptShimRequire.prototype, {
    get baseAssetQuery() {
        var that = this;
        return function (asset) {
            // http://requirejs.org/docs/api.html#jsfiles
            // A .js extension indicates that the href is relative to the Html asset:
            if (/\.js$/.test(that._href)) {
                return asset.type === 'Html';
            } else {
                // Relative to the main module: Find the first JavaScript with an incoming HtmlRequireJsMain relation,
                // and stop if encountering an Html asset, just to be safe:
                return asset.type === 'Html' || (asset.type === 'JavaScript' && asset.incomingRelations.some(function (incomingRelation) {
                    return incomingRelation.type === 'HtmlRequireJsMain';
                }));
            }
        };
    },

    get href() {
        var href = this._href.replace(/^(?:[^!]*!)?(?:\.\/)?/, ""); // Strip foo! prefix and ./
        if (!/^text!/.test(this._href) && !/\.(?:ko|txt|js|json|css|less)$/.test(href)) { // Hmm, this cannot be the correct criterion
            href += ".js";
        }
        return href;
    },

    set href(href) {
        var matchExistingPrefix = this._href.match(/^([^!]*\!)?(.*)$/),
            existingPrefix = '',
            existingHrefWithoutPrefix;
        if (matchExistingPrefix) {
            existingPrefix = matchExistingPrefix[1] || '';
            existingHrefWithoutPrefix = matchExistingPrefix[2];
        }
        var existingHrefIsModuleRelative = !/^(?:\/|https?:)|\.js$/.test(existingHrefWithoutPrefix);

        if (existingHrefIsModuleRelative) {
            this._href = existingPrefix + href;
        } else {
            this._href = existingPrefix + href.replace(/\.js$/, '');
        }
    },

    inline: function () {
        throw new Error("JavaScriptShimRequire.inline(): Not supported");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("JavaScriptShimRequire.attach(): Not supported");
    }
});

module.exports = JavaScriptShimRequire;
