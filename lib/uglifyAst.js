var _ = require('underscore'),
    uglifyAst = {};

uglifyAst.objToAst = function (obj) {
    if (_.isArray(obj)) {
        return ['array', obj.map(uglifyAst.objToAst)];
    } else if (typeof obj === 'object') {
        return ['object', _.map(obj, function (value, key) {
            return [key, uglifyAst.objToAst(value)];
        })];
    } else if (_.isNumber(obj)) {
        return ['num', obj];
    } else if (_.isString(obj)) {
        return ['string', obj];
    } else if (obj === null || obj === true || obj === false) {
        return ['name', "" + obj];
    } else {
        throw new Error("uglifyAst.objToAst: Cannot convert " + obj);
    }
};

_.extend(exports, uglifyAst);
