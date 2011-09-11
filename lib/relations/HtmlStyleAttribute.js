/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlStyleAttribute(config) {
    Relation.call(this, config);
}

util.inherits(HtmlStyleAttribute, Relation);

extendWithGettersAndSetters(HtmlStyleAttribute.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute('style', this.to.text.replace(/^bogusselector\s*\{|}\s*$/g, ""));
        this.from.markDirty();
    },

    detach: function () {
        delete this.node;
        Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlStyleAttribute;
