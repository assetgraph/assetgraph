var createError = require('createerror');

['ParseError', 'SyntaxError', 'NotImplementedError', 'UglifyJsWarning', 'PreconditionError'].forEach(function (className) {
    exports[className] = createError({name: className});
});
