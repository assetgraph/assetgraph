const _ = require('lodash');

module.exports = (queryObj, setAsyncAttribute, setDeferAttribute) => {
    return function setAsyncOrDeferOnHtmlScripts(assetGraph) {
        if (setAsyncAttribute || setDeferAttribute) {
            for (const htmlScript of assetGraph.findRelations(_.extend({type: 'HtmlScript'}, queryObj))) {
                if (setAsyncAttribute) {
                    htmlScript.node.setAttribute('async', 'async');
                }
                if (setDeferAttribute) {
                    htmlScript.node.setAttribute('defer', 'defer');
                }
            }
        }
    };
};
