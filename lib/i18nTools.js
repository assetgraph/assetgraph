var _ = require('underscore'),
    seq = require('seq'),
    uglify = require('uglify-js'),
    uglifyAST = require('./uglifyAST'),
    i18nTools = {};

// Helper for getting a prioritized list of relevant locale ids from a specific locale id.
// For instance, "en_US" produces ["en_US", "en"]
i18nTools.expandLocaleIdToPrioritizedList = function (localeId) {
    var localeIds = [localeId];
    while (/_[^_]+$/.test(localeId)) {
        localeId = localeId.replace(/_[^_]+$/, '');
        localeIds.push(localeId);
    }
    return localeIds;
};

i18nTools.tokenizePattern = function (pattern) {
    var tokens = [];
    // Split pattern into tokens (return value of replace isn't used):
    pattern.replace(/\{(\d+)\}|((?:[^\\\{]|\\[\\\{])+)/g, function ($0, placeHolderNumberStr, text) {
        if (placeHolderNumberStr) {
            tokens.push({
                type: 'placeHolder',
                value: parseInt(placeHolderNumberStr, 10)
            });
        } else {
            tokens.push({
                type: 'text',
                value: text.replace(/\\([\{\}])/g, "$1")
            });
        }
    });
    return tokens;
};

i18nTools.patternToAST = function (pattern, placeHolderASTs) {
    var ast;
    i18nTools.tokenizePattern(pattern).forEach(function (token) {
        var term;
        if (token.type === 'placeHolder') {
            term = placeHolderASTs[token.value];
        } else {
            term = ['string', token.value];
        }
        if (ast) {
            ast = ['binary', '+', ast, term];
        } else {
            ast = term;
        }
    });
    return ast;
};

i18nTools.eachOneTrInAST = function (ast, lambda) {
    var q = [ast];
    while (q.length) {
        var node = q.pop();
        if (node[0] === 'call' && Array.isArray(node[1]) && node[1][0] === 'call' &&
            Array.isArray(node[1][1]) && node[1][1][0] === 'dot' &&  Array.isArray(node[1][1][1]) &&
            node[1][1][1][0] === 'name' && node[1][1][1][1] === 'one' &&
            (node[1][1][2] === 'trPattern')) {

            if (lambda('callTrPattern', node[1][2][0][1], node, node[1][2][1]) === false) { // type, key, node, defaultValueAST
                return;
            }
        } else if (node[0] === 'call' && Array.isArray(node[1]) && node[1][0] === 'dot' &&
                   Array.isArray(node[1][1]) && node[1][1][0] === 'name' && node[1][1][1] === 'one' &&
                   (node[1][2] === 'tr' || node[1][2] === 'trPattern')) {

            if (node[2].length === 0 || !Array.isArray(node[2][0]) || node[2][0][0] !== 'string') {
                console.warn("Invalid one." + node[1][2] + " syntax: " + uglify.uglify.gen_code(node));
            }
            if (lambda(node[1][2], node[2][0][1], node, node[2][1]) === false) { // type, key, node, defaultValueAST
                return;
            }
        }
        for (var i = 0 ; i < node.length ; i += 1) {
            if (Array.isArray(node[i])) {
                q.push(node[i]);
            }
        }
    }
};

i18nTools.extractAllKeysForLocaleFromI18NAssets = function (localeId, i18nAssets, cb) {
    var allKeys = {};
    seq()
        .extend(i18nAssets)
        .seqMap(function (i18nAsset) {
            i18nAsset.getParseTree(this);
        })
        .seq(function () {
            var prioritizedLocaleIds = i18nTools.expandLocaleIdToPrioritizedList(localeId),
                i18nSrcs = this.stack;
            i18nSrcs.forEach(function (i18nSrc) {
                _.keys(i18nSrc).forEach(function (key) {
                    var found = false;
                    for (var i = 0 ; i < prioritizedLocaleIds.length ; i += 1) {
                        if (prioritizedLocaleIds[i] in i18nSrc[key]) {
                            allKeys[key] = i18nSrc[key][prioritizedLocaleIds[i]];
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        console.warn("extractAllKeysForLocaleFromI18NAssets: Key " + key + " not found for " + localeId);
                    }
                });
            });
            cb(null, allKeys);
        })
        ['catch'](cb);
};

i18nTools.createOneTrReplacer = function (allKeys, localeId) { // localeId is optional and will only be used for warning messages
    return function (type, key, node, defaultValueAST) {
        var value = allKeys[key],
            valueAST;
        if (value === null || typeof value === 'undefined') {
            console.warn('i18nTools.createOneTrReplacer: Key ' + key + ' not found' + (localeId ? ' in ' + localeId : ''));
            if (defaultValueAST) {
                valueAST = defaultValueAST;
            } else {
                valueAST = ['string', '[!' + key + '!]'];
            }
        } else {
            valueAST = uglifyAST.objToAST(value);
        }
        if (type === 'callTrPattern') {
            // Replace one.trPattern('keyName')(placeHolderValue, ...) with a string concatenation:
            if (!Array.isArray(valueAST) || valueAST[0] !== 'string') {
                console.warn("Invalid one.trPattern syntax: " + value);
                return;
            }
            Array.prototype.splice.apply(node, [0, node.length].concat(i18nTools.patternToAST(valueAST[1], node[2])));
        } else if (type === 'tr') {
            Array.prototype.splice.apply(node, [0, node.length].concat(valueAST));
        } else if (type === 'trPattern') {
            if (!Array.isArray(valueAST) || valueAST[0] !== 'string') {
                console.warn("Invalid one.trPattern syntax: " + value);
                return;
            }
            var highestPlaceHolderNumber;
            i18nTools.tokenizePattern(valueAST[1]).forEach(function (token) {
                if (token.type === 'placeHolder' && (!highestPlaceHolderNumber || token.value > highestPlaceHolderNumber)) {
                    highestPlaceHolderNumber = token.value;
                }
            });
            var argumentNames = [],
                placeHolderASTs = [];
            for (var j = 0 ; j <= highestPlaceHolderNumber ; j += 1) {
                placeHolderASTs.push(['name', 'a' + j]);
                argumentNames.push('a' + j);
            }
            var returnExpressionAST = i18nTools.patternToAST(allKeys[key], placeHolderASTs);
            node.splice(0, node.length, 'function', null, argumentNames, [['return', returnExpressionAST]]);
        }
    };
};

_.extend(exports, i18nTools);
