/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlRequireJsMain(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlRequireJsMain, HtmlRelation);

extendWithGettersAndSetters(HtmlRequireJsMain.prototype, {
    get href() {
        return this.node.getAttribute('data-main') + '.js';
    },

    set href(href) {
        this.node.setAttribute('data-main', href.replace(/\.js$/, ""));
    },

    inline: function () {
        throw new Error("relations.HtmlRequireJsMain.inline: Not supported.");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("relations.HtmlRequireJsMain.attach: Not supported.");
    },

    detach: function () {
        this.node.removeAttribute('data-main');
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlRequireJsMain;
