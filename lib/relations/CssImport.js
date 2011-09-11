/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CssImport(config) {
    Relation.call(this, config);
}

util.inherits(CssImport, Relation);

extendWithGettersAndSetters(CssImport.prototype, {
    get href() {
        return this.cssRule.href;
    },

    set href(href) {
        this.cssRule.href = href;
    },

    inline: function () {
        throw new Error("CssImport.inline(): Not supported.");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("CssImport.attach(): Not implemented.");
    },

    detach: function () {
        var ruleIndex = this.parentRule.cssRules.indexOf(this.cssRule);
        if (ruleIndex === -1) {
            throw new Error("relations.CssImport.remove: Rule not found in parent rule.");
        }
        this.parentRule.deleteRule(ruleIndex);
        delete this.cssRule;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = CssImport;
