var createError = require('createerror');

['ParseError', 'SyntaxError', 'NotImplementedError', 'UglifyJsWarning'].forEach(function (className) {
    exports[className] = createError({name: className});
});
