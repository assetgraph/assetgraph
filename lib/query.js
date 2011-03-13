var _ = require('underscore'),
    query = {
        indices: {
            relation: ['type', 'from', 'to'],
            asset: ['type', 'isInitial']
        }
    };

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

query.createPrefixMatcher = function (prefix) {
    return function (value) {
        return typeof value === 'string' && value.indexOf(prefix) === 0;
    };
};

query.queryAssetGraph = function (assetGraph, objType, queryObj) {
    var numFields = 0,
        shortestIndexLookup;
    _.each(queryObj || {}, function (fieldQueryObj, fieldName) {
        numFields += 1;
        var indexLookup;
        if (query.indices[objType].indexOf(fieldName) !== -1) {
            if (_.isArray(fieldQueryObj) && fieldQueryObj.every(function (item) {
                // Don't attempt index lookups if the array contains a query.not or something even worse:
                return item.isAsset || item.isRelation || /^(?:string|boolean|number)$/.test(item);
            })) {
                indexLookup = [];
                fieldQueryObj.forEach(function (value) {
                    Array.prototype.push.apply(indexLookup, assetGraph._lookupIndex(objType, fieldName, value));
                });
            } else {
                var queryType = typeof fieldQueryObj;
                if (queryType === 'string' || queryType === 'boolean' || queryType === 'number' || fieldQueryObj.isAsset || fieldQueryObj.isRelation) {
                    indexLookup = assetGraph._lookupIndex(objType, fieldName, fieldQueryObj);
                }
            }
            if (indexLookup && (!shortestIndexLookup || indexLookup.length < shortestIndexLookup.length)) {
                shortestIndexLookup = indexLookup;
            }
        }
    });
    if (shortestIndexLookup && numFields === 1) {
        return [].concat(shortestIndexLookup);
    } else {
        return (shortestIndexLookup || assetGraph[objType + 's']).filter(query.queryObjToMatcherFunction(queryObj));
    }
};

// Helpers that allow queries like:
// assetGraph.findRelations({
//    from: {
//        type: query.not(['HTML', 'CSS'])
//    },
//    to: {
//        url: query.defined
//    }
// });

query.not = function (value) {
    var valueMatcher = query.createValueMatcher(value);
    return function (obj) {
        return !valueMatcher(obj);
    };
};

query.defined = function (value) {
    return typeof value !== 'undefined';
};

query.undefined = function (value) {
    return typeof value === 'undefined';
};

_.extend(exports, query);
