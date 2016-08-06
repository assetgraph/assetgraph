/**
 * This transform adds rel="noopener" to HTML anchor tags if:
 * - The anchor points at a cross origin target
 * - The anchor opens in a new window using target="_blank"
 * - The anchor does not have rel="opener" set as an attribute
 *
 * This is a security feature that disallows the target site access
 * to navigate the origin page using window.opener.location = 'newUrl'.
 *
 * It also removes performance problems in some Chrome versions.
 *
 * See https://jakearchibald.com/2016/performance-benefits-of-rel-noopener/
 */

module.exports = function () {
    return function addRelNoopenerToBlankTargetAnchors(assetGraph) {
        var externalAnchors = assetGraph.findRelations({
            type: 'HtmlAnchor',
            crossorigin: true,
            node: function (node) {
                return node.getAttribute('target') === '_blank';
            }
        }, true);

        externalAnchors.forEach(function (relation) {
            var node = relation.node;
            var currentRel = node.getAttribute('rel');

            if (typeof currentRel === 'string') {
                var rels = currentRel.split(' ').map(function (str) {
                    return str.toLowerCase();
                });

                // Bail out if 'noopener' is already set
                if (rels.indexOf('noopener') !== -1) {
                    return;
                }

                // bail out if 'opener' is explicitly set
                if (rels.indexOf('opener') !== -1) {
                    return;
                }

                node.setAttribute('rel', rels.concat('noopener').join(' '));
            } else {
                node.setAttribute('rel', 'noopener');
            }

            relation.from.markDirty();
        });
    };
};
