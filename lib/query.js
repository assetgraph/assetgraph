var _ = require('underscore'),
    query = {};

query.createValueMatcher = function (value) {
    if (typeof value === 'function') {
        return value;
    } else if (_.isRegExp(value)) {
        return function (obj) {
            return value.test(obj);
        };
    } else if (_.isArray(value)) {
        return function (obj) {
            return value.indexOf(obj) !== -1;
        };
    } else if (typeof value === 'object' && !value.isAsset && !value.isRelation) {
        return query.queryObjToMatcherFunction(value);
    } else { // Asset or relation or primitive value
        return function (obj) {
            return obj === value;
        };
    }
};

query.queryObjToMatcherFunction = function (queryObj) {
    if (typeof queryObj === 'function') {
        return queryObj;
    }
    var matchers = _.map(queryObj || {}, function (value, key) {
        var valueMatcher = query.createValueMatcher(value);
        return function (obj) {
            return valueMatcher(obj[key]);
        };
    });
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
            return matchers.every(function (matcher) {
                return matcher(obj);
            });
        };
    }
};

// Helpers that allow queries like:
// assetGraph.findRelations({
//    from: {
//        type: query.not(['HTML', 'CSS'])
//    },
//    to: {
//        url: query.exists
//    }
// });

query.not = function (value) {
    var valueMatcher = query.createValueMatcher(value);
    return function (obj) {
        return !valueMatcher(obj);
    };
};

query.exists = function (value) {
    return typeof value !== 'undefined';
};

_.extend(exports, query);
