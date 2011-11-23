/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    JavaScriptAmdRequire = require('./JavaScriptAmdRequire');

function JavaScriptAmdDefine(config) {
    JavaScriptAmdRequire.call(this, config);
}

util.inherits(JavaScriptAmdDefine, JavaScriptAmdRequire);

module.exports = JavaScriptAmdDefine;
