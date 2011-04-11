/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify-js'),
    error = require('../error'),
    deepCopy = require('../deepCopy'),
    Base = require('./Base');

function JavaScriptConditionalBlock(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptConditionalBlock, Base);

_.extend(JavaScriptConditionalBlock.prototype, {
    _inline: function (cb) {
        var that = this;
        that.to.getParseTree(error.passToFunction(cb, function (parseTree) {
            var newNode = ['block', deepCopy(parseTree[1][1])];
            that.parentNode.splice(that.parentNode.indexOf(that.node), 1, newNode);
            that.node = newNode;
            cb();
       }));
    },

    remove: function () {
        this.parentNode.splice(this.parentNode.indexOf(this.node), 1);
    }
});

module.exports = JavaScriptConditionalBlock;
