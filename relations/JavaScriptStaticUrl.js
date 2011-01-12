/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function JavaScriptStaticUrl(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptStaticUrl, Base);

_.extend(JavaScriptStaticUrl.prototype, {
    remove: function () {
        this.stack.splice(relation.stack.indexOf(this.node), 1);
        delete this.node;
        delete this.stack;
    },

    setUrl: function (url) {
        this.node[1][2] = url;
    }
});

exports.JavaScriptStaticUrl = JavaScriptStaticUrl;
