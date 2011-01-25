exports.addCDNPrefix = function addCDNPrefix(siteGraph, prefix, cb) {
    siteGraph.relations.forEach(function (relation) {
        if (relation.to.url &&
            relation.type === 'CSSBackgroundImage' ||
            relation.type === 'HTMLShortcutIcon' ||
            relation.type === 'HTMLImage' ||
            relation.type === 'HTMLScript' ||
            relation.type === 'HTMLStyle') {

            relation.setUrl(prefix + relation.to.url);
        }
        cb(null, siteGraph);
    });
};
