/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

// Used for both require([dep1, dep2], function () {}) and define([dep1, dep2], function () {})
function JavaScriptAmdRequire(config) {
    Relation.call(this, config);
}

JavaScriptAmdRequire.extractHrefFromRequireItem = function (requireItem) {
    var prefixStripped = requireItem.replace(/^[^!]*!/, "");
    if (/\.\w+$/.test(prefixStripped)) {
        return prefixStripped;
    } else {
        return prefixStripped + '.js';
    }
};

JavaScriptAmdRequire.updateHrefOfRequireItem = function (requireItem, newHref) {
    newHref = newHref.replace(/\.js/, ""); // .js is implicit
    var matchPrefix = requireItem.match(/^([^!]*!)/);
    if (matchPrefix) {
        return matchPrefix[1] + newHref;
    } else {
        return newHref;
    }
};

util.inherits(JavaScriptAmdRequire, Relation);

extendWithGettersAndSetters(JavaScriptAmdRequire.prototype, {
    // Hack: Make sure that the href is relative to the first ancestor that has an incoming HtmlRequireJsMain relation:
    baseAssetQuery: function (asset) {
        return asset.type === 'JavaScript' && asset.incomingRelations.some(function (incomingRelation) {
            return incomingRelation.type === 'HtmlRequireJsMain';
        });
    },

    get href() {
        return JavaScriptAmdRequire.extractHrefFromRequireItem(this.node[1]);
    },

    set href(href) {
        this.node[1] = JavaScriptAmdRequire.updateHrefOfRequireItem(this.node[1], href);
    },

    inline: function () {
        throw new Error("JavaScriptAmdRequire.inline(): Not supported");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("JavaScriptAmdRequire.attach(): Not supported");
    },

    detach: function () {
        var i = this.requireCallNode[2][0][1].indexOf(this.node);
        if (i === -1) {
            throw new Error("relations.JavaScriptAmdRequire.detach: this.node not found in module array of this.requireCallNode.");
        }
        this.requireCallNode[2][0][1].splice(i, 1);
        // FIXME: Omit require if module array is emptied?
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptAmdRequire;
