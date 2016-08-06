module.exports = function () {
    return function addRelNoopenerToBlankTargetAnchors(assetGraph) {
        var externalAnchors = assetGraph.findRelations({
            type: 'HtmlAnchor',
            crossorigin: true
        }, true).filter(function (relation) {
            return relation.node.getAttribute('target') === '_blank';
        });

        externalAnchors.forEach(function (relation) {
            var node = relation.node;
            var currentRel = node.getAttribute('rel');

            if (typeof currentRel === 'string') {
                var rels = currentRel.split(' ').map(function (str) {
                    return str.toLowerCase();
                });

                if (rels.indexOf('noopener') === -1) {
                    node.setAttribute('rel', rels.concat('noopener').join(' '));
                }

            } else {
                relation.node.setAttribute('rel', 'noopener');
            }

            relation.from.markDirty();
        });
    };
};
