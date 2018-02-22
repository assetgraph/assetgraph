const createError = require('createerror');

for (const className of [
  'ParseError',
  'SyntaxError',
  'NotImplementedError',
  'UglifyJsWarning',
  'PreconditionError'
]) {
  exports[className] = createError({ name: className });
}
