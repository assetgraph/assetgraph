var _ = require('underscore'),
    query = {};

query.valueToMatcherFunction = function (value, fieldName) {
    if (typeof value === 'function') {
        return function (obj) {
            return value(obj[fieldName]);
        };
    } else if (_.isRegExp(value)) {
        return function (obj) {
            return value.test(obj[fieldName]);
        };
    } else if (_.isArray(value)) {
        if (value[0] === query.not) {
            var invertedMatcherFunction = query.valueToMatcherFunction(value[1], fieldName);
            return function (obj) {
                return !invertedMatcherFunction(obj);
            };
        } else {
            return function (obj) {
                return value.indexOf(obj[fieldName]) !== -1;
            };
        }
    } else if (typeof value === 'object' && !value.isAsset && !value.isRelation) {
        var fieldMatcher = query.queryObjToMatcherFunction(value);
        return function (obj) {
            return fieldMatcher(obj[fieldName]);
        };
    } else { // Asset or relation or primitive value
        return function (obj) {
            return obj[fieldName] === value;
        };
    }
};

query.queryObjToMatcherFunction = function (queryObj) {
    if (typeof queryObj === 'function') {
        return queryObj;
    }
    var matchers = _.map(queryObj || {}, query.valueToMatcherFunction);
    if (matchers.length === 0) {
        // Make sure that a everything is matched if queryObj is falsy, undefined or {}
        // Amazingly, this is a useful special case.
        return function () {
            return true;
        };
    } else if (matchers.length === 1) {
        return matchers[0];
    } else {
        return function (obj) {
            return matchers.every(function (matcher) {return matcher(obj);});
        };
    }
};

query.not = function (value) {
    return [query.not, value]; // Will be recognized by value.createValueMatcher which will negate the return value of the match
};

query.exists = function (value) {
    return typeof value !== 'undefined';
};

_.extend(exports, query);
