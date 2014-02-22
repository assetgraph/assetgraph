module.exports = function (queryObj) {
    return function browserPopulate(assetGraph, cb) {
        assetGraph._browserPopulate(queryObj || {type: 'Html', isFragment: false}, {type: assetGraph.query.not('HtmlAnchor')}, cb);
    };
};
