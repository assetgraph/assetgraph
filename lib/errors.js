const createError = require('createerror');

exports.ParseError = createError({ name: 'ParseError' });
exports.SyntaxError = createError({ name: 'SyntaxError' });
exports.NotImplementedError = createError({ name: 'NotImplementedError' });
exports.UglifyJsWarning = createError({ name: 'UglifyJsWarning' });
exports.PreconditionError = createError({ name: 'PreconditionError' });
