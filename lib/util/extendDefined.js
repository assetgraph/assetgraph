/**
 * @param {Object<string, any>} target
 * @param {...Object<string, any>} sources
 */
module.exports = function extendDefined(target, ...sources) {
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value !== 'undefined') {
        target[key] = value;
      }
    }
  }

  return target;
};
