var _ = require('underscore'),
    seq = require('seq'),
    passError = require('../util/passError'),
    query = require('../query'),
    i18nTools = require('../util/i18nTools');

module.exports = function (queryObj, localeIds) {
    return function cloneForEachLocale(assetGraph, cb) {
        seq.ap(assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)))
            .parEach(function (originalHtmlAsset) {
                var callback = this,
                    subgraph = assetGraph.createSubgraph(originalHtmlAsset, {type: ['HtmlScript', 'JavaScriptOneInclude']}),
                    nonInlineJavaScriptsToCloneById = {};

                // First note which JavaScript assets need to be cloned for each locale:
                seq.ap(assetGraph.findRelations({type: 'HtmlScript', from: originalHtmlAsset, to: {url: query.isDefined}}))
                    .parEach(function (htmlScript) {
                        htmlScript.to.getParseTree(this);
                    })
                    .parEach(function (htmlScript) {
                        var hasOneTr = false;
                        i18nTools.eachOneTrInAst(htmlScript.to.parseTree, function () {
                            nonInlineJavaScriptsToCloneById[htmlScript.to.id] = htmlScript.to;
                            return false;
                        });
                        this();
                    })
                    .set(localeIds)
                    .flatten() // https://github.com/substack/node-seq/pull/9
                    .parEach(function (localeId) {
                        assetGraph.cloneAsset(originalHtmlAsset, this.into(localeId));
                    })
                    .parEach(function (localeId) {
                        var localizedHtml = this.vars[localeId];
                        assetGraph.setAssetUrl(localizedHtml, originalHtmlAsset.url.replace(/(?:\.html)?$/, '.' + localeId + '.html'));
                        localizedHtml.getParseTree(this);
                    })
                    .parEach(function (localeId) {
                        var callback2 = this,
                            localizedHtml = this.vars[localeId],
                            document = localizedHtml.parseTree;
                        document.documentElement.setAttribute('lang', localeId);
                        assetGraph.markAssetDirty(localizedHtml);
                        i18nTools.extractAllKeysForLocaleFromSubgraph(assetGraph, localeId, localizedHtml, passError(callback2, function (allKeys) {
                            seq.ap(assetGraph.findRelations({type: 'HtmlScript', from: localizedHtml}))
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
                                    i18nTools.eachOneTrInAst(javaScript.parseTree, i18nTools.createOneTrReplacer(allKeys, localeId));
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
                        // Remove the original Html and those of the cloned JavaScript assets that become orphaned:
                        assetGraph.removeAsset(originalHtmlAsset);
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
