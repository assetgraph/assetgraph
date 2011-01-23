/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function JavaScriptIfEnvironment(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptIfEnvironment, Base);

_.extend(JavaScriptIfEnvironment.prototype, {
    remove: function () {
        this.parentNode.splice(this.parentNode.indexOf(this.node), 1);
    }
});

exports.JavaScriptIfEnvironment = JavaScriptIfEnvironment;
