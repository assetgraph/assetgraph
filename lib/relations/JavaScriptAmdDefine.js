var util = require('util'),
    JavaScriptAmdRequire = require('./JavaScriptAmdRequire');

function JavaScriptAmdDefine(config) {
    JavaScriptAmdRequire.call(this, config);
}

util.inherits(JavaScriptAmdDefine, JavaScriptAmdRequire);

module.exports = JavaScriptAmdDefine;
