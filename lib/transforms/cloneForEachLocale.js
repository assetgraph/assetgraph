var _ = require('underscore'),
    seq = require('seq'),
    error = require('../util/error'),
    query = require('../query'),
    i18nTools = require('../util/i18nTools');

module.exports = function (queryObj, localeIds) {
    return function cloneForEachLocale(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findAssets(_.extend({type: 'HTML'}, queryObj)))
            .parEach(function (originalHTMLAsset) {
                var callback = this,
                    subgraph = assetGraph.createSubgraph(originalHTMLAsset, {type: ['HTMLScript', 'JavaScriptStaticInclude']}),
                    nonInlineJavaScriptsToCloneById = {};

                // First note which JavaScript assets need to be cloned for each locale:
                seq.ap(assetGraph.findRelations({type: 'HTMLScript', from: originalHTMLAsset, to: {url: query.defined}}))
                    .parEach(function (htmlScript) {
                        htmlScript.to.getParseTree(this);
                    })
                    .parEach(function (htmlScript) {
                        var hasOneTr = false;
                        i18nTools.eachOneTrInAST(htmlScript.to.parseTree, function () {
                            nonInlineJavaScriptsToCloneById[htmlScript.to.id] = htmlScript.to;
                            return false;
                        });
                        this();
                    })
                    .set(localeIds)
                    .flatten() // https://github.com/substack/node-seq/pull/9
                    .parEach(function (localeId) {
                        assetGraph.cloneAsset(originalHTMLAsset, this.into(localeId));
                    })
                    .parEach(function (localeId) {
                        var localizedHTML = this.vars[localeId];
                        assetGraph.setAssetUrl(localizedHTML, originalHTMLAsset.url.replace(/(?:\.html)?$/, '.' + localeId + '.html'));
                        localizedHTML.getParseTree(this);
                    })
                    .parEach(function (localeId) {
                        var callback2 = this,
                            localizedHTML = this.vars[localeId],
                            document = localizedHTML.parseTree;
                        document.documentElement.setAttribute('lang', localeId);
                        assetGraph.markAssetDirty(localizedHTML);
                        i18nTools.extractAllKeysForLocaleFromHTMLAsset(assetGraph, localeId, localizedHTML, error.passToFunction(callback2, function (allKeys) {
                            seq.ap(assetGraph.findRelations({type: 'HTMLScript', from: localizedHTML}))
                                .parMap(function (htmlScript) {
                                    if (htmlScript.to.id in nonInlineJavaScriptsToCloneById) {
                                        assetGraph.cloneAsset(htmlScript.to, [htmlScript], this);
                                    } else {
                                        this(null, htmlScript.to);
                                    }
                                })
                                .parEach(function (javaScript) {
                                    javaScript.getParseTree(this);
                                })
                                .parEach(function (javaScript) {
                                    i18nTools.eachOneTrInAST(javaScript.parseTree, i18nTools.createOneTrReplacer(allKeys, localeId));
                                    assetGraph.markAssetDirty(javaScript);
                                    this();
                                })
                                .seq(function () {
                                    callback2();
                                })
                                ['catch'](callback2);
                        }));
                    })
                    .seq(function () {
                        // Remove the original HTML and those of the cloned JavaScript assets that become orphaned:
                        assetGraph.removeAsset(originalHTMLAsset);
                        _.values(nonInlineJavaScriptsToCloneById).forEach(function (javaScript) {
                            if (assetGraph.findRelations({to: javaScript}).length === 0) {
                                assetGraph.removeAsset(javaScript);
                            }
                        });
                        callback();
                    })
                    ['catch'](callback);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
