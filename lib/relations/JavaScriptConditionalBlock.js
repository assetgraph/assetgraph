/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    deepClone = require('../deepClone'),
    Base = require('./Base').Base;

function JavaScriptConditionalBlock(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptConditionalBlock, Base);

_.extend(JavaScriptConditionalBlock.prototype, {
    _inline: function (cb) {
        var newNode = deepClone(this.to.parseTree);
        this.parentNode.splice(this.parentNode.indexOf(this.node), 1, newNode);
        this.node = newNode;
        process.nextTick(cb);
    },

    remove: function () {
        this.parentNode.splice(this.parentNode.indexOf(this.node), 1);
    }
});

exports.JavaScriptConditionalBlock = JavaScriptConditionalBlock;
