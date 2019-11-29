/**
 * This jsdoc plugin marks all members and methods starting with underscores as private
 */
exports.handlers = {
  newDoclet: function({ doclet }) {
    if (typeof doclet.name === 'string') {
      if (doclet.name.startsWith('_')) {
        doclet.ignore = true;
      }
    }
  }
};
