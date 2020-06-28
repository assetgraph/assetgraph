/**
 * This jsdoc plugin removes all comments that import other files at part of a type definition
 * Jsdoc doesn't support this syntax, but it is needed for typescript typings
 */
exports.handlers = {
  jsdocCommentFound: function(e) {
    if (
      e.comment.includes('@typedef {import(') ||
      e.comment.includes('@type {typeof import(')
    ) {
      e.comment = '';
    }
  }
};
