/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function CssImport(config) {
    Base.call(this, config);
}

util.inherits(CssImport, Base);

extendWithGettersAndSetters(CssImport.prototype, {
    get href() {
        return this.cssRule.href;
    },

    set href(href) {
        this.cssRule.href = href;
    },

    remove: function () {
        this.parentRule.deleteRule(this.parentRule.cssRules.indexOf(this.cssRule));
        delete this.cssRule;
    }
});

module.exports = CssImport;
