/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function JavaScriptStaticInclude(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptStaticInclude, Base);

_.extend(JavaScriptStaticInclude.prototype, {
    remove: function () {
        this.stack.splice(this.stack.indexOf(this.node), 1);
        delete this.node;
        delete this.stack;
    },

    setUrl: function (url) {
        this.node[1][2][0][1] = url;
    }
});

exports.JavaScriptStaticInclude = JavaScriptStaticInclude;
