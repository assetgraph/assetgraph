/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlInlineScriptTemplate(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlInlineScriptTemplate, HtmlRelation);

extendWithGettersAndSetters(HtmlInlineScriptTemplate.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        if (!this.node.firstChild) {
            this.node.appendChild(this.from.parseTree.createTextNode());
        }
        this.node.firstChild.nodeValue = this.to.text;
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('script');
        this.node.setAttribute('type', 'text/html');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);

        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlInlineScriptTemplate;
