var objectLiteralParse = require('./3rdparty/js-object-literal-parse');

var assetGraphConditions = module.exports = {};

function parseSingleQuotedString(str) {
    return JSON.parse('"' + str.replace(/^'|'$/g, '').replace(/\\?"/g, '\\"') + '"');
}

function parseArrayOfSingleQuotedStrings(str) {
    return str.replace(/^\[|\]$/g, '').split(/,\s+/).map(parseSingleQuotedString);
}

function parseValue(str) {
    if (/^\[/.test(str)) {
        return parseArrayOfSingleQuotedStrings(str);
    } else {
        return parseSingleQuotedString(str);
    }
}

assetGraphConditions.parse = function (node) {
    var assetGraphConditionsAttributeValue = node && node.getAttribute('data-assetgraph-conditions');
    if (assetGraphConditionsAttributeValue) {
        var obj = {};
        objectLiteralParse(assetGraphConditionsAttributeValue).forEach(function (keyAndValue) {
            obj[keyAndValue[0]] = parseValue(keyAndValue[1]);
        });
        return obj;
    }
};

function singleQuoteString(str) {
    return "'" + str.replace(/'/g, "\\'") + "'";
}

assetGraphConditions.stringify = function (obj) {
    return Object.keys(obj).map(function (key) {
        return (/[^a-z]/.test(key) ? singleQuoteString(key) : key) + ': ' + (Array.isArray(obj[key]) ? '[' + obj[key].map(singleQuoteString).join(', ') + ']' : singleQuoteString(obj[key]));
    }).join(', ');
};
