const sift = require('sift');

function preprocessQueryObj(queryObj) {
  if (typeof queryObj === 'object' && queryObj) {
    if (queryObj.constructor === Object) {
      const result = {};
      for (const key of Object.keys(queryObj)) {
        result[key] = preprocessQueryObj(queryObj[key]);
      }
      return result;
    } else {
      if (queryObj.id) {
        // Assume Asset or Relation instance
        return { id: queryObj.id };
      } else {
        // Maybe RegExp
        return queryObj;
      }
    }
  } else if (Array.isArray(queryObj)) {
    return queryObj.map(preprocessQueryObj);
  } else {
    // Primitive value
    return queryObj;
  }
}

module.exports = function compileQuery(queryObj = {}) {
  return sift(preprocessQueryObj(queryObj));
};
