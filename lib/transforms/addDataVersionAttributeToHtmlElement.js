var _ = require('lodash'),
    childProcess = require('child_process');

module.exports = function (queryObj, version) {
    return function addDataVersionAttributeToHtmlElement(assetGraph, cb) {
        function proceed() {
            if (version) {
                assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
                    var documentElement = htmlAsset.parseTree.documentElement;
                    if (documentElement) {
                        documentElement.setAttribute('data-version', version.replace(/\{0\}/g, documentElement.getAttribute('data-version') || ''));
                        htmlAsset.markDirty();
                    }
                });
            }
            cb();
        }

        if (typeof version === 'undefined') {
            // Try to derive a version tag from git:
            childProcess.exec('git describe --long --tags --always --dirty', function (err, stdout, stderr) {
                if (!err) {
                    version = stdout.replace(/^[\s\n\r]+|[\s\r\n]+$/g, '');
                }
                proceed();
            });
        } else {
            proceed();
        }
    };
};
