var createError = require('createerror');

['ParseError', 'SyntaxError', 'NotImplementedError'].forEach(function (className) {
    exports[className] = createError({name: className});
});
