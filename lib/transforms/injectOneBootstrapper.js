var _ = require('underscore'),
    seq = require('seq'),
    uglifyAST = require('../util/uglifyAST'),
    assets = require('../assets'),
    relations = require('../relations'),
    i18nTools = require('../util/i18nTools');

function bootstrapCode() {
    window.one = window.one || {};

    one.localeId = document && document.documentElement && document.documentElement.getAttribute('lang');

    one.getStaticUrl = function (url) { // , placeHolderValue1, placeHolderValue2, ...
        var placeHolderValues = Array.prototype.slice.call(arguments, 1);
        return url.replace(/\*/g, function () {
            return placeHolderValues.shift();
        });
    };

    (function installOneDevelopmentMode() {
        one.include = function () {};

        // Helper for getting a prioritized list of relevant locale ids from a specific locale id.
        // For instance, "en_US" produces ["en_US", "en"]
        function expandLocaleIdToPrioritizedList(localeId) {
            if (!localeId) {
                return [];
            }
            var localeIds = [localeId];
            while (/_[^_]+$/.test(localeId)) {
                localeId = localeId.replace(/_[^_]+$/, '');
                localeIds.push(localeId);
            }
            return localeIds;
        }

        var prioritizedLocaleIds = expandLocaleIdToPrioritizedList(one.localeId);

        one.tr = function (key, defaultValue) {
            var keyByLocaleId = one.i18nKeys[key];
            if (keyByLocaleId) {
                for (var i = 0 ; i < prioritizedLocaleIds.length ; i += 1) {
                    if (typeof keyByLocaleId[prioritizedLocaleIds[i]] !== 'undefined') {
                        return keyByLocaleId[prioritizedLocaleIds[i]];
                    }
                }
            }
            return defaultValue || '[!' + key + '!]';
        };

        one.trPattern = function (key, defaultPattern) {
            var pattern = defaultPattern,
                keyByLocaleId = one.i18nKeys[key];
            for (var i = 0 ; i < prioritizedLocaleIds.length ; i += 1) {
                if (typeof keyByLocaleId[prioritizedLocaleIds[i]] !== 'undefined') {
                    pattern = keyByLocaleId[prioritizedLocaleIds[i]];
                    break;
                }
            }
            return function () { // placeHolderValue, ...
                var placeHolderValues = arguments;
                // FIXME: The real ICU syntax uses different escaping rules, either adapt or remove support
                return pattern.replace(/\{(\d+)\}|((?:[^\{\\]|\\[\\\{])+)/g, function ($0, placeHolderNumberStr, text) {
                    if (placeHolderNumberStr) {
                        return placeHolderValues[placeHolderNumberStr];
                    } else {
                        return text.replace(/\\([\\\{])/g, "$1");
                    }
                });
            };
        };
    }());
}

module.exports = function (queryObj) {
    if (!queryObj) {
        throw new Error("transforms.injectOneBootstrapper: The 'queryObj' parameter is required.");
    }
    return function injectOneBootstrapper(assetGraph, cb) {
        seq.ap(assetGraph.findAssets(queryObj))
            .parEach(function (initialAsset) {
                if (initialAsset.type !== 'HTML' && initialAsset.type !== 'JavaScript') {
                    return this(new Error('transforms.injectOneBootstrapper: queryObj must only match HTML and JavaScript assets, but got ' + initialAsset));
                }
                i18nTools.extractAllKeysFromSubgraph(assetGraph, initialAsset, this.into(initialAsset.id));
            })
            .parEach(function (initialAsset) {
                var statementASTs = uglifyAST.getFunctionBodyAST(bootstrapCode),
                    allLanguageKeys = this.vars[initialAsset.id];
                // Add one.i18nKeys assignment to the end of the installDevelopmentMode function body:
                statementASTs[statementASTs.length - 1][1][1][3].push([
                    "stat",
                    [
                        "assign",
                        true,
                        [
                            "dot",
                            [
                                "name",
                                "one"
                            ],
                            "i18nKeys"
                        ],
                        uglifyAST.objToAST(allLanguageKeys)
                    ]
                ]);
                var bootstrapAsset = new assets.JavaScript({parseTree: ['toplevel', statementASTs]});
                bootstrapAsset.url = assetGraph.root + "oneBootstrapper.js"; // Just so assetGraph.inlineAsset won't refuse
                assetGraph.addAsset(bootstrapAsset);
                if (initialAsset.type === 'HTML') {
                    var htmlScript = new relations.HTMLScript({
                        from: initialAsset,
                        to: bootstrapAsset
                    });
                    assetGraph.attachAndAddRelation(htmlScript, 'first');
                    htmlScript.node.setAttribute('id', 'oneBootstrapper');
                    assetGraph.inlineRelation(htmlScript, this);
                } else { // initialAsset.type === 'JavaScript'
                    assetGraph.attachAndAddRelation(new relations.JavaScriptStaticInclude({
                        from: initialAsset,
                        to: bootstrapAsset
                    }), 'first');
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
