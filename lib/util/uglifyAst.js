var _ = require('underscore'),
    uglifyJs = require('uglify-js'),
    uglifyAst = {};

// JSON subset supported
uglifyAst.objToAst = function (obj) {
    if (obj === null || obj === true || obj === false) {
        return ['name', "" + obj];
    } else if (_.isArray(obj)) {
        return ['array', obj.map(uglifyAst.objToAst)];
    } else if (typeof obj === 'object') {
        return ['object', Object.keys(obj).sort().map(function (key) {
            return [key, uglifyAst.objToAst(obj[key])];
        })];
    } else if (_.isNumber(obj)) {
        return ['num', obj];
    } else if (_.isString(obj)) {
        return ['string', obj];
    } else {
        throw new Error("uglifyAst.objToAst: Cannot convert " + JSON.stringify(obj));
    }
};

// JSON subset supported
uglifyAst.astToObj = function (ast) {
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
            throw new Error('uglifyAst.astToObj: Unsupported ["name", ...] node');
        }
    } else if (ast[0] === 'object') {
        var obj = {};
        ast[1].forEach(function (keyAndValueArr) {
            obj[keyAndValueArr[0]] = uglifyAst.astToObj(keyAndValueArr[1]);
        });
        return obj;
    } else if (ast[0] === 'array') {
        return ast[1].map(uglifyAst.astToObj);
    } else {
        throw new Error("uglifyAst.astToObj: Cannot convert " + JSON.stringify(ast));
    }
};

uglifyAst.getFunctionBodyAst = function (lambda) {
    return uglifyJs.parser.parse("(" + lambda.toString() + ")")[1][0][1][3];
};

_.extend(exports, uglifyAst);
