var crypto = require('crypto');

module.exports = function (queryObj, options) {
    options = options || {};
    var algorithm = options.algorithm || 'sha256';
    return function reviewSubResourceIntegrity(assetGraph) {
        assetGraph.findAssets(queryObj || { type: 'Html', isInline: false, isFragment: false, isLoaded: true }).forEach(function (htmlAsset) {
            var changed = false;
            assetGraph.findRelations({from: htmlAsset, type: ['HtmlStyle', 'HtmlScript'], to: {isInline: false, isLoaded: true}}).forEach(function (relation) {
                var integrityFragments;
                var foundMatch;
                if (relation.node.hasAttribute('integrity')) {
                    integrityFragments = relation.node.getAttribute('integrity').split(' ').map(function (hash) {
                        return hash.replace(/^sha/i, 'sha');
                    });
                    integrityFragments.forEach(function (integrityFragment) {
                        var matchIntegrityFragment = integrityFragment.match(/^(sha(?:256|384|512))-(.*)/);
                        if (matchIntegrityFragment) {
                            var algorithmName = matchIntegrityFragment[1];
                            var hash = matchIntegrityFragment[2];
                            if (crypto.createHash(algorithmName).update(relation.to.rawSrc).digest('base64') === hash) {
                                foundMatch = integrityFragment;
                            } else if (options.single) {
                                assetGraph.emit(
                                    'warn',
                                    new Error(htmlAsset.urlOrDescription + ': integrity hash does not match that of the linked resource (' + relation.to.urlOrDescription + ') ' + integrityFragment)
                                );
                            }
                        } else {
                            assetGraph.emit(
                                'warn',
                                new Error(htmlAsset.urlOrDescription + ': Cannot parse hash in integrity attribute: ' + integrityFragment)
                            );
                        }
                    });
                    if (!foundMatch && !options.single) {
                        assetGraph.emit(
                            'warn',
                            new Error(htmlAsset.urlOrDescription + ': integrity attribute ' + integrityFragments.join(' ') + ' does not match the linked resource: ' + relation.to.urlOrDescription)
                        );
                    }
                } else {
                    integrityFragments = [];
                }
                if (options.update) {
                    var hash = algorithm + '-' + crypto.createHash(algorithm).update(relation.to.rawSrc).digest('base64');
                    if (options.single) {
                        relation.node.setAttribute('integrity', hash);
                        changed = true;
                    } else if (integrityFragments.indexOf(hash) === -1) {
                        integrityFragments.push(hash);
                        relation.node.setAttribute('integrity', integrityFragments.join(' '));
                        changed = true;
                    }
                }
            });
            if (changed) {
                htmlAsset.markDirty();
            }
        });
    };
};
