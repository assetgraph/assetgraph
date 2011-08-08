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
    baseAssetQuery: {type: 'Html', url: query.isDefined},

    get href() {
        return this.node[2][0][1];
    },

    set href(url) {
        this.node[2][0][1] = url;
    }
});

module.exports = JavaScriptOneGetText;
