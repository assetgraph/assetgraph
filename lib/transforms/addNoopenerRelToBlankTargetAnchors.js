return function (assetGraph) {
    var externalAnchors = assetGraph.findRelations({
        type: 'HtmlAnchor',
        hrefType: 'absolute'
        // FIXME: also check that the relation is cross origin
    }).filter(function (relation) {
        return relation.node.getAttribute('target') === '_blank';
    });

    externalAnchors.forEach(function (relation) {
        var node = relation.node;
        var currentRel = node.getAttribute('rel');

        if (currentRel) {
            node.setAttribute('rel', [currentRel, 'noopener'].join(' '));
        } else {
            relation.node.setAttribute('rel', 'noopener');
        }

        relation.from.markDirty();
    });
};
