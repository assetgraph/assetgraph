var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    JavaScriptAmdRequire = require('./JavaScriptAmdRequire');

function JavaScriptAmdDefine(config) {
    JavaScriptAmdRequire.call(this, config);
}

util.inherits(JavaScriptAmdDefine, JavaScriptAmdRequire);

module.exports = JavaScriptAmdDefine;
