/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    query = require('../query'),
    Base = require('./Base');

function JavaScriptOneGetText(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptOneGetText, Base);

extendWithGettersAndSetters(JavaScriptOneGetText.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false},

    get href() {
        return this.node[2][0][1];
    },

    set href(href) {
        this.node[2][0][1] = href;
    }
});

module.exports = JavaScriptOneGetText;
