var _ = require('lodash');

module.exports = function (queryObj, setAsyncAttribute, setDeferAttribute) {
    return function setAsyncOrDeferOnHtmlScripts(assetGraph) {
        if (setAsyncAttribute || setDeferAttribute) {
            assetGraph.findRelations(_.extend({type: 'HtmlScript'}, queryObj)).forEach(function (htmlScript) {
                if (setAsyncAttribute) {
                    htmlScript.node.setAttribute('async', 'async');
                }
                if (setDeferAttribute) {
                    htmlScript.node.setAttribute('defer', 'defer');
                }
            });
        }
    };
};
