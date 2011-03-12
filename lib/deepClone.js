var _ = require('underscore');

module.exports = function deepClone (obj) {
    if (_.isArray(obj)) {
        return obj.map(deepClone);
    } else if (typeof obj === 'object' && obj !== null) {
        var result = {};
        _.each(obj, function (value, key) {
            result[key] = deepClone(value);
        });
        return result;
    } else {
        return obj;
    }
};
