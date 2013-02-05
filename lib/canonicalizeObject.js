module.exports = function canonicalizeObject(obj, numLevels) {
    if (typeof numLevels !== 'number') {
        numLevels = Infinity;
    }
    if (Array.isArray(obj)) {
        return obj.map(canonicalizeObject, numLevels - 1);
    } else if (typeof obj === 'object' && obj !== null && numLevels > 0) {
        var sortedObj = {};
        Object.keys(obj).sort().forEach(function (key) {
            sortedObj[key] = canonicalizeObject(obj[key], numLevels - 1);
        });
        return sortedObj;
    } else {
        return obj;
    }
};
