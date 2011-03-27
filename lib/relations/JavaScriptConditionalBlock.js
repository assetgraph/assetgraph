/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify-js'),
    Base = require('./Base');

function JavaScriptConditionalBlock(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptConditionalBlock, Base);

_.extend(JavaScriptConditionalBlock.prototype, {
    _inline: function (src) {
        var newNode = uglify.parser.parse(src)[1][1];
        this.parentNode.splice(this.parentNode.indexOf(this.node), 1, newNode);
        this.node = newNode;
    },

    remove: function () {
        this.parentNode.splice(this.parentNode.indexOf(this.node), 1);
    }
});

module.exports = JavaScriptConditionalBlock;
