module.exports = function () {
    var rulesPerStylesheetLimit = 4095,
        countRules = function (cssAsset) {
            var count = 0;

            // FIXME: Verify that this counting algorithm is identical to what IE does
            cssAsset.parseTree.cssRules.forEach(function (rule) {
                if (rule.selectorText) {
                    count += rule.selectorText.split(',').length;
                }
            });

            return count;
        },
        splitStyleSheet = function (cssAsset) {
            var output = [],
                accumulatedRules = 0,
                offset = 0,
                clone;

            cssAsset.parseTree.cssRules.forEach(function (rule, idx) {
                var selectors = rule.selectorText && rule.selectorText.split(',').length || 0;

                if (accumulatedRules + selectors < rulesPerStylesheetLimit) {
                    accumulatedRules += selectors;
                } else {
                    clone = cssAsset.clone();
                    clone.parseTree.cssRules = clone.parseTree.cssRules.slice(offset, idx);
                    clone.parseTree = clone.parseTree;

                    output.push(clone);

                    offset = idx;
                    accumulatedRules = selectors;
                }
            });

            clone = cssAsset.clone();
            clone.parseTree.cssRules = clone.parseTree.cssRules.slice(offset);
            clone.parseTree = clone.parseTree;

            output.push(clone);

            return output;
        };

    return function splitCssIfIeLimitIsReached(assetGraph) {
        assetGraph.findAssets({type: 'Css', isLoaded: true}).forEach(function (largeAsset) {
            var count = countRules(largeAsset),
                info,
                replacements;

            if (count > rulesPerStylesheetLimit) {
                replacements = splitStyleSheet(largeAsset);

                info = {
                    message: count + ' CSS rules, ' + (count - rulesPerStylesheetLimit) + ' would be ignored by IE9 and below. Splitting into ' + replacements.length + ' chunks to resolve the problem.',
                    asset: largeAsset
                };

                assetGraph.emit('info', info);

                // Update each html asset that includes this cssAsset
                largeAsset.incomingRelations.forEach(function (htmlStyle) {
                    replacements.forEach(function (cssAsset) {
                        new assetGraph.HtmlStyle({
                            to: cssAsset
                        }).attach(htmlStyle.from, 'before', htmlStyle);
                    });
                });
                assetGraph.removeAsset(largeAsset, true);
            }
        });
    };
};
