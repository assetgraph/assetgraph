var _ = require('underscore'),
    uglifyAST = {};

// JSON subset supported
uglifyAST.objToAST = function (obj) {
    if (obj === null || obj === true || obj === false) {
        return ['name', "" + obj];
    } else if (_.isArray(obj)) {
        return ['array', obj.map(uglifyAST.objToAST)];
    } else if (typeof obj === 'object') {
        return ['object', _.map(obj, function (value, key) {
            return [key, uglifyAST.objToAST(value)];
        })];
    } else if (_.isNumber(obj)) {
        return ['num', obj];
    } else if (_.isString(obj)) {
        return ['string', obj];
    } else {
        throw new Error("uglifyAST.objToAST: Cannot convert " + JSON.stringify(obj));
    }
};

// JSON subset supported
uglifyAST.astToObj = function (ast) {
    if (ast[0] === 'string' || ast[0] === 'num') {
        return ast[1];
    } else if (ast[0] === 'name') {
        if (ast[1] === 'false') {
            return false;
        } else if (ast[1] === 'true') {
            return true;
        } else if (ast[1] === 'null') {
            return null;
        } else {
            throw new Error('uglifyAST.astToObj: Unsupported ["name", ...] node');
        }
    } else if (ast[0] === 'object') {
        var obj = {};
        ast[1].forEach(function (keyAndValueArr) {
            obj[keyAndValueArr[0]] = uglifyAST.astToObj(keyAndValueArr[1]);
        });
        return obj;
    } else if (ast[0] === 'array') {
        return ast[1].map(uglifyAST.astToObj);
    } else {
        throw new Error("uglifyAST.astToObj: Cannot convert " + JSON.stringify(ast));
    }
};

_.extend(exports, uglifyAST);
