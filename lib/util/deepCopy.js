var _ = require('underscore');

module.exports = function deepCopy(obj) {
    if (_.isArray(obj)) {
        return obj.map(deepCopy);
    } else if (typeof obj === 'object' && obj !== null) {
        var result = {};
        _.each(obj, function (value, key) {
            result[key] = deepCopy(value);
        });
        return result;
    } else {
        return obj;
    }
};
