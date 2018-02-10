module.exports = function extendDefined(target) {
  // ...
  for (let i = 1; i < arguments.length; i += 1) {
    const source = arguments[i];
    for (const key in source) {
      if (typeof source[key] !== 'undefined') {
        target[key] = source[key];
      }
    }
  }
  return target;
};
