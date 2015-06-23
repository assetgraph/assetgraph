var util = require('util'),
    _ = require('lodash'),
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
        var svgText = Array.prototype.map.call(this.to.parseTree.documentElement.childNodes, function (svgElementChildNode) {
            return svgElementChildNode.toString();
        }).join('');

        var isSeenByAttributeName = {};
        for (var i = 0; i < this.to.parseTree.documentElement.attributes.length; i += 1) {
            var attribute = this.to.parseTree.documentElement.attributes[i];
            this.node.setAttribute(attribute.name, attribute.value);
            isSeenByAttributeName[attribute.name] = true;
        }

        _.pluck(this.node.attributes, 'name').forEach(function (attributeName) {
            if (!isSeenByAttributeName[attributeName]) {
                this.node.removeAttribute(attributeName);
            }
        }, this);

        this.node.innerHTML = svgText;
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error('Not implemented');
    }
});

module.exports = HtmlInlineScriptTemplate;
