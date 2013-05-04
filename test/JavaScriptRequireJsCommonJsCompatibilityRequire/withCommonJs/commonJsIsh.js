require('./loadedViaCommonJs1'); // This should be interpreted as a JavaScriptCommonJsRequire

define(function (require, exports, module) {
    var foo = require('somewhere/foo');
    exports.someNumber = 18;
    exports.foo = foo;
});

require('./loadedViaCommonJs2'); // This should be interpreted as a JavaScriptCommonJsRequire
