/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlVideoPoster(config) {
    Relation.call(this, config);
}

util.inherits(HtmlVideoPoster, Relation);

extendWithGettersAndSetters(HtmlVideoPoster.prototype, {
    get href() {
        return this.node.getAttribute('poster');
    },

    set href(href) {
        this.node.setAttribute('poster', href);
    },

    inline: function () {
        throw new Error("HtmlVideoPoster.inline(): Not supported.");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("HtmlVideoPoster.attach(): Not implemented.");
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlVideoPoster;
