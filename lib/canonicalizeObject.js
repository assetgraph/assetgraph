module.exports = function canonicalizeObject(obj, numLevels) {
  if (typeof numLevels !== 'number') {
    numLevels = Infinity;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject, numLevels - 1);
  } else if (typeof obj === 'object' && obj !== null && numLevels > 0) {
    const sortedObj = {};
    for (const key of Object.keys(obj).sort()) {
      sortedObj[key] = canonicalizeObject(obj[key], numLevels - 1);
    }
    return sortedObj;
  } else {
    return obj;
  }
};
