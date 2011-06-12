var vm = require('vm'),
    _ = require('underscore'),
    seq = require('seq'),
    passError = require('./passError'),
    traversal = require('../traversal'),
    uglify = require('uglify-js'),
    uglifyAst = require('./uglifyAst'),
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

i18nTools.patternToAst = function (pattern, placeHolderAsts) {
    var ast;
    i18nTools.tokenizePattern(pattern).forEach(function (token) {
        var term;
        if (token.type === 'placeHolder') {
            term = placeHolderAsts[token.value];
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

i18nTools.eachOneTrInAst = function (ast, lambda) {
    var q = [ast];
    while (q.length) {
        var node = q.pop();
        if (node[0] === 'call' && Array.isArray(node[1]) && node[1][0] === 'call' &&
            Array.isArray(node[1][1]) && node[1][1][0] === 'dot' &&  Array.isArray(node[1][1][1]) &&
            node[1][1][1][0] === 'name' && node[1][1][1][1] === 'one' &&
            (node[1][1][2] === 'trPattern')) {

            if (lambda('callTrPattern', node[1][2][0][1], node, node[1][2][1]) === false) { // type, key, node, defaultValueAst
                return;
            }
        } else if (node[0] === 'call' && Array.isArray(node[1]) && node[1][0] === 'dot' &&
                   Array.isArray(node[1][1]) && node[1][1][0] === 'name' && node[1][1][1] === 'one' &&
                   (node[1][2] === 'tr' || node[1][2] === 'trPattern')) {

            if (node[2].length === 0 || !Array.isArray(node[2][0]) || node[2][0][0] !== 'string') {
                console.warn("Invalid one." + node[1][2] + " syntax: " + uglify.uglify.gen_code(node));
            }
            if (lambda(node[1][2], node[2][0][1], node, node[2][1]) === false) { // type, key, node, defaultValueAst
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

i18nTools.getBootstrappedContext = function (assetGraph, htmlAsset, cb) {
    var context = vm.createContext();
    context.window = context;
    context.__defineSetter__('document', function () {});
    context.__defineGetter__('document', function () {
        assetGraph.markAssetDirty(true);
        return htmlAsset.parseTree;
    });

    var bootstrapperRelations = assetGraph.findRelations({from: htmlAsset, node: {id: 'oneBootstrapper'}, to: {type: 'JavaScript'}});

    if (bootstrapperRelations.length === 0) {
        return process.nextTick(function () {
            cb(null, context);
        });
    } else if (bootstrapperRelations.length > 1) {
        return cb(new Error("i18nTools.extractAllKeysForLocaleFromSubgraph: Unexpected number of One bootstrapper relations found: " + bootstrapRelations.length));
    }

    bootstrapperRelations[0].to.getParseTree(passError(cb, function (parseTree) {
        try {
            new vm.Script(uglify.uglify.gen_code(parseTree), "bootstrap code for " + (htmlAsset.url || "inline")).runInContext(context);
        } catch (e) {
            return cb(e);
        }
        cb(null, context);
    }));
}

// initialAsset must be Html or JavaScript
i18nTools.extractAllKeysFromSubgraph = function (assetGraph, initialAsset, cb) {
    seq.ap(
            traversal.collectAssetsPostOrder(assetGraph, initialAsset, {type: ['HtmlScript', 'JavaScriptOneInclude']}).filter(function (asset) {
                return asset.type === 'I18n';
            })
        )
        .parEach(function (i18nAsset) {
            i18nAsset.getParseTree(this.into(i18nAsset.id));
        })
        .seq(function () {
            cb(null, _.extend.apply(this, [{}].concat(_.values(this.vars))));
        })
        ['catch'](cb);
};

// initialAsset must be Html or JavaScript
i18nTools.extractAllKeysForLocaleFromSubgraph = function (assetGraph, localeId, initialAsset, cb) {
    i18nTools.extractAllKeysFromSubgraph(assetGraph, initialAsset, passError(cb, function (allKeys) {
        var prioritizedLocaleIds = i18nTools.expandLocaleIdToPrioritizedList(localeId),
            allKeysForLocale = {};
        _.keys(allKeys).forEach(function (key) {
            var found = false;
            for (var i = 0 ; i < prioritizedLocaleIds.length ; i += 1) {
                if (prioritizedLocaleIds[i] in allKeys[key]) {
                    allKeysForLocale[key] = allKeys[key][prioritizedLocaleIds[i]];
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.warn("extractAllKeysForLocaleFromI18nAssets: Key " + key + " not found for " + localeId);
            }
        });
        cb(null, allKeysForLocale);
    }));
};

i18nTools.createOneTrReplacer = function (allKeys, localeId) { // localeId is optional and will only be used for warning messages
    return function oneTrReplacer(type, key, node, defaultValueAst) {
        var value = allKeys[key],
            valueAst;
        if (value === null || typeof value === 'undefined') {
            console.warn('oneTrReplacer: Key ' + key + ' not found' + (localeId ? ' in ' + localeId : ''));
            if (defaultValueAst) {
                valueAst = defaultValueAst;
            } else {
                valueAst = ['string', '[!' + key + '!]'];
            }
        } else {
            valueAst = uglifyAst.objToAst(value);
        }
        if (type === 'callTrPattern') {
            // Replace one.trPattern('keyName')(placeHolderValue, ...) with a string concatenation:
            if (!Array.isArray(valueAst) || valueAst[0] !== 'string') {
                console.warn("oneTrReplacer: Invalid one.trPattern syntax: " + value);
                return;
            }
            Array.prototype.splice.apply(node, [0, node.length].concat(i18nTools.patternToAst(valueAst[1], node[2])));
        } else if (type === 'tr') {
            Array.prototype.splice.apply(node, [0, node.length].concat(valueAst));
        } else if (type === 'trPattern') {
            if (!Array.isArray(valueAst) || valueAst[0] !== 'string') {
                console.warn("oneTrReplacer: Invalid one.trPattern syntax: " + value);
                return;
            }
            var highestPlaceHolderNumber;
            i18nTools.tokenizePattern(valueAst[1]).forEach(function (token) {
                if (token.type === 'placeHolder' && (!highestPlaceHolderNumber || token.value > highestPlaceHolderNumber)) {
                    highestPlaceHolderNumber = token.value;
                }
            });
            var argumentNames = [],
                placeHolderAsts = [];
            for (var j = 0 ; j <= highestPlaceHolderNumber ; j += 1) {
                placeHolderAsts.push(['name', 'a' + j]);
                argumentNames.push('a' + j);
            }
            var returnExpressionAst = i18nTools.patternToAst(valueAst[1], placeHolderAsts);
            node.splice(0, node.length, 'function', null, argumentNames, [['return', returnExpressionAst]]);
        }
    };
};

_.extend(exports, i18nTools);
