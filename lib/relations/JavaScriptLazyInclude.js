/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function JavaScriptLazyInclude(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptLazyInclude, Base);

_.extend(JavaScriptLazyInclude.prototype, {
    _getRawUrlString: function () {
        return this.node[1][2][0][1];
    },

    _setRawUrlString: function (url) {
        this.node[1][2][0][1] = url;
    },

    remove: function () {
        this.stack.splice(relation.stack.indexOf(this.node), 1);
        delete this.node;
        delete this.stack;
    }
});

module.exports = JavaScriptLazyInclude;
