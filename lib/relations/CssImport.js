var util = require('util'),
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
        throw new Error('CssImport.inline(): Not supported.');
    },

    attach: function () {
        throw new Error('CssImport.attach(): Not implemented.');
    },

    detach: function () {
        var ruleIndex = this.parentRule.cssRules.indexOf(this.cssRule);
        if (ruleIndex === -1) {
            throw new Error('relations.CssImport.remove: Rule not found in parent rule.');
        }
        this.parentRule.deleteRule(ruleIndex);
        this.cssRule = undefined;
        this.parentRule = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = CssImport;
