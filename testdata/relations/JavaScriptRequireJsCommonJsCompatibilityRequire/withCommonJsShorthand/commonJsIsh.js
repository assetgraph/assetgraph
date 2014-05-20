require('./loadedViaCommonJs1'); // This should be interpreted as a JavaScriptCommonJsRequire

define(function (require) {
    var foo = require('somewhere/foo');

    return foo;
});

require('./loadedViaCommonJs2'); // This should be interpreted as a JavaScriptCommonJsRequire
