/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptAmdRequire(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptAmdRequire, Relation);

extendWithGettersAndSetters(JavaScriptAmdRequire.prototype, {
    get baseAssetQuery() {
        var that = this;
        return function (asset) {
            if (/^(?:[^!]*!)?\.\//.test(that.node[1])) { // Is it module-relative?
                return asset.type === 'JavaScript';
            } else {
                // Non-module-relative: Make sure that the href is relative to the first ancestor that has an incoming HtmlRequireJsMain relation:
                return asset.type === 'Html' || (asset.type === 'JavaScript' && asset.incomingRelations.some(function (incomingRelation) {
                    return incomingRelation.type === 'HtmlRequireJsMain';
                }));
            }
        };
    },

    get href() {
        var href = this.node[1].replace(/^(?:[^!]*!)?(?:\.\/)?/, ""); // Strip foo! prefix and ./
        if (!/\.\w+/.test(href)) {
            href += ".js";
        }
        return href;
    },

    set href(href) {
        var matchExistingPrefix = this.node[1].match(/^([^!]*\!)?(.*)$/),
            existingPrefix = '',
            existingHrefWithoutPrefix;
        if (matchExistingPrefix) {
            existingPrefix = matchExistingPrefix[1];
            existingHrefWithoutPrefix = matchExistingPrefix[2];
        }
        var existingHrefIsModuleRelative = /^\.\//.test(existingHrefWithoutPrefix);

        this.node[1] = existingPrefix + (existingHrefIsModuleRelative ? './' : '') + href.replace(/\.js$/, "");
    },

    inline: function () {
        throw new Error("JavaScriptAmdRequire.inline(): Not supported");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("JavaScriptAmdRequire.attach(): Not supported");
    },

    detach: function () {
        var i = this.arrayNode[1].indexOf(this.node);
        if (i === -1) {
            throw new Error("relations.JavaScriptAmdRequire.detach: this.node not found in module array of this.requireCallNode.");
        }
        this.arrayNode[1].splice(i, 1);
        // FIXME: Omit require if module array is emptied?
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptAmdRequire;
