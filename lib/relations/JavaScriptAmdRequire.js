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
            if (/^(?:.*!)?(?:\/|\.\.?\/)/.test(that.node.value)) {
                // Relative dependency
                return asset.type === 'JavaScript';
            } else if (/\.js$/.test(that.node.value)) {
                // http://requirejs.org/docs/api.html#jsfiles
                // A .js extension indicates that the href is relative to the Html asset:
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
        var href = this.node.value.replace(/^(?:[^!]*!)?/, ""); // Strip foo! prefix
        if (!/^text!/.test(this.node.value) && !/\.(?:ko|html|txt|js|json|css|less)$/.test(href)) { // Hmm, this cannot be the correct criterion
            href += ".js";
        }
        return href.replace(/^\.\//, '');
    },

    set href(href) {
        var matchExistingHref = this.node.value.match(/^(.*!)?(.*)$/),
            existingPrefix = '',
            existingHrefWithoutPrefix;
        if (matchExistingHref) {
            existingPrefix = matchExistingHref[1] || '';
            existingHrefWithoutPrefix = matchExistingHref[2];
        }
        var existingHrefIsRelative = /^\/|^\.\.?\//.test(existingHrefWithoutPrefix);
        if (existingHrefIsRelative && !/^\//.test(href)) {
            href = "./" + href;
        }
        this.node.value = existingPrefix + href.replace(/\.js$/, '');
    },

    inline: function () {
        throw new Error("JavaScriptAmdRequire.inline(): Not supported");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("JavaScriptAmdRequire.attach(): Not supported");
    },

    detach: function () {
        var i = this.arrayNode.elements.indexOf(this.node);
        if (i === -1) {
            throw new Error("relations.JavaScriptAmdRequire.detach: this.node not found in module array of this.requireCallNode.");
        }
        this.arrayNode.elements.splice(i, 1);
        var argumentsNode = this.callNode.args,
            functionNode = argumentsNode[argumentsNode.length - 1];
        functionNode.argnames.splice(i, 1);
        return Relation.prototype.detach.call(this);
    },

    refreshHref: function () {
        // Doesn't make any sense for module names, so only do something for relative references:
        if (/\.\w+$/.test(this.node.value) || /^(.*!)?(?:\/|\.\.?\/)/.test(this.node.value)) {
            Relation.prototype.refreshHref.call(this);
        }
    }
});

module.exports = JavaScriptAmdRequire;
