var _ = require('lodash'),
    query = module.exports = {};

query.createValueMatcher = function (value) {
    if (typeof value === 'function') {
        return value;
    } else if (_.isRegExp(value)) {
        return function matchRegExp(obj) {
            return value.test(obj);
        };
    } else if (_.isArray(value)) {
        return function matchArrayMember(obj) {
            return value.indexOf(obj) !== -1;
        };
    } else if (Buffer.isBuffer(value)) {
        return function matchBuffer(obj) {
            var i;
            for (i = 0 ; i < obj.length ; i += 1) {
                if (obj[i] !== value[i]) {
                    return false;
                }
            }
            return i === value.length;
        };
    } else if (typeof value === 'object' && value !== null && !value.isAsset && !value.isRelation) {
        return query.queryObjToMatcherFunction(value);
    } else { // Asset or relation or primitive value
        return function matchEqual(obj) {
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
        return function matchPropertyValue(obj) {
            return obj && valueMatcher(obj[key]);
        };
    });
    if (matchers.length === 0) {
        // Make sure that a everything is matched if queryObj is falsy, undefined or {}
        // Amazingly, this is a useful special case.
        return function matchEverything() {
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

query.createPrefixMatcher = function (prefix) {
    return function (value) {
        return typeof value === 'string' && value.indexOf(prefix) === 0;
    };
};

query.queryAssetGraph = function (assetGraph, objType, queryObj, candidates) {
    queryObj = queryObj || {};
    var filters = [];
    if (typeof queryObj === 'function') {
        filters.push(queryObj);
    } else {
        _.each(queryObj || {}, function (fieldQueryObj, fieldName) {
            if (objType === 'asset' && (fieldName === 'incoming' || fieldName === 'outgoing')) {
                filters.push(function (asset) {
                    var relationQueryObj = _.clone(fieldQueryObj);
                    relationQueryObj[fieldName === 'incoming' ? 'to' : 'from'] = asset;
                    return assetGraph.findRelations(relationQueryObj).length > 0;
                });
            }
        });
        var filteredQueryObj = {};
        for (var propertyName in queryObj) {
            if (propertyName !== 'incoming' && propertyName !== 'outgoing') {
                filteredQueryObj[propertyName] = queryObj[propertyName];
            }
        }
        filters.unshift(query.queryObjToMatcherFunction(filteredQueryObj));
    }
    var result = candidates || assetGraph['_' + objType + 's'];

    filters.forEach(function (filter) {
        result = result.filter(filter);
    });
    return result;
};

// Helpers that allow queries like:
// assetGraph.findRelations({
//    from: {
//        type: query.not(['Html', 'Css'])
//    }
// });

query.not = function (value) {
    // Warn against subtle mistakes like query.not('HtmlAnchor', 'HtmlImage') which would otherwise silently ignore the second argument.
    if (arguments.length > 1) {
        throw new Error('query.not: More than one argument provided, did you mean to pass an array?');
    }
    var valueMatcher = query.createValueMatcher(value);
    return function (obj) {
        return !valueMatcher(obj);
    };
};

query.or = function () { // ...
    if (arguments.length < 2) {
        throw new Error('query.or: Two or more arguments must be provided');
    }
    var valueMatchers = _.toArray(arguments).map(query.createValueMatcher);
    return function or(obj) {
        return valueMatchers.some(function (matcher) {
            return matcher(obj);
        });
    };
};

query.and = function () { // ...
    if (arguments.length < 2) {
        throw new Error('query.and: Two or more arguments must be provided');
    }
    var valueMatchers = _.toArray(arguments).map(query.createValueMatcher);
    return function and(obj) {
        return valueMatchers.every(function (matcher) {
            return matcher(obj);
        });
    };
};
