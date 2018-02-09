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

module.exports = () => {
  return function addRelNoopenerToBlankTargetAnchors(assetGraph) {
    const externalAnchors = assetGraph.findRelations({
      type: 'HtmlAnchor',
      crossorigin: true,
      node: node => node.getAttribute('target') === '_blank'
    });

    for (const relation of externalAnchors) {
      const node = relation.node;
      const currentRel = node.getAttribute('rel');

      if (typeof currentRel === 'string') {
        const rels = currentRel.split(' ').map(str => str.toLowerCase());

        // Bail out if 'noopener' or 'opener' is already set
        if (rels.includes('noopener') || rels.includes('opener')) {
          return;
        }

        node.setAttribute('rel', [...rels, 'noopener'].join(' '));
      } else {
        node.setAttribute('rel', 'noopener');
      }

      relation.from.markDirty();
    }
  };
};
