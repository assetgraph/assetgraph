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
            var count = countRules(cssAsset),
                output = [],
                clone,
                i,
                idx = 0,
                factor = Math.ceil(count / rulesPerStylesheetLimit),
                howMany = Math.floor(count / factor);

            for (i = 0; i < factor; i += 1) {
                clone = cssAsset.clone();
                if (i + 1 < factor) {
                    clone.parseTree.cssRules = clone.parseTree.cssRules.slice(idx, howMany);
                } else {
                    clone.parseTree.cssRules = clone.parseTree.cssRules.slice(idx);
                }
                clone.parseTree = clone.parseTree;
                clone.populate();
                idx += howMany;

                output.push(clone);
            }

            return output;
        };

    return function splitCssIfIeLimitIsReached(assetGraph) {
        assetGraph.findAssets({type: 'Css', isLoaded: true}).forEach(function (cssAsset) {
            var count = countRules(cssAsset),
                warning,
                replacements;

            if (count > rulesPerStylesheetLimit) {
                warning = new Error(count + ' CSS rules, ' + (count - rulesPerStylesheetLimit) + ' would be ignored by IE9 and below. Splitting into smaller chunks to resolve the problem.');
                warning.asset = cssAsset;

                assetGraph.emit('warn', warning);

                replacements = splitStyleSheet(cssAsset);

                // Update each html asset that includes this cssAsset
                cssAsset.incomingRelations.forEach(function (htmlStyle) {
                    replacements.forEach(function (cssAsset) {
                        new assetGraph.HtmlStyle({
                            to: cssAsset
                        }).attach(htmlStyle.from, 'before', htmlStyle);
                    });
                });

                assetGraph.removeAsset(cssAsset, true);
            }
        });
    };
};
