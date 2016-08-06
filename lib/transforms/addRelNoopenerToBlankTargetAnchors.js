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
