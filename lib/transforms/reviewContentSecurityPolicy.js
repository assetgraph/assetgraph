var urlModule = require('url');
var _ = require('lodash');
var crypto = require('crypto');

var directiveByRelationType = {
    HtmlStyle: 'styleSrc',
    CssImport: 'styleSrc',
    HtmlScript: 'scriptSrc',
    CssFontFaceSrc: 'fontSrc',
    HtmlObject: 'objectSrc',
    HtmlApplet: 'objectSrc',
    HtmlImage: 'imgSrc',
    CssImage: 'imgSrc',
    HtmlShortcutIcon: 'imgSrc',
    HtmlPictureSource: 'imgSrc',
    HtmlFluidIcon: 'imgSrc',
    SrcSetEntry: 'imgSrc',
    HtmlLogo: 'imgSrc',
    HtmlAppleTouchStartupImage: 'imgSrc',
    HtmlVideoPoster: 'imgSrc',
    HtmlVideo: 'mediaSrc',
    HtmlAudio: 'mediaSrc',
    HtmlFrame: 'frameSrc',
    HtmlIFrame: 'frameSrc',
    HtmlCacheManifest: 'manifestSrc'
};

function fromCamelCase(str) {
    return str.replace(/[A-Z]/g, function ($0) {
        return '-' + $0.toLowerCase();
    });
}

module.exports = function (queryObj, options) {
    options = options || {};
    return function reviewContentSecurityPolicy(assetGraph) {
        function originFromUrl(url) {
            if (assetGraph.root && url.indexOf(assetGraph.root) === 0) {
                return '\'self\'';
            } else {
                return urlModule.parse(url).hostname;
            }
        }

        assetGraph.findAssets(queryObj || { type: 'Html', isInline: false, isFragment: false, isLoaded: true }).forEach(function (htmlAsset) {
            var htmlContentSecurityPolicies = assetGraph.findRelations({from: htmlAsset, type: 'HtmlContentSecurityPolicy'});
            htmlContentSecurityPolicies.forEach(function (htmlContentSecurityPolicy) {
                var contentSecurityPolicy = htmlContentSecurityPolicy.to;
                var defaultSrc = contentSecurityPolicy.parseTree.defaultSrc;

                function supportsUnsafeInline(directive) {
                    return (
                        contentSecurityPolicy.parseTree[directive] ?
                            contentSecurityPolicy.parseTree[directive].indexOf('\'unsafe-inline\'') !== -1 :
                            defaultSrc && defaultSrc.indexOf('\'unsafe-inline\'') !== -1
                    );
                }

                var disallowedRelationsByDirectiveAndOrigin = {};
                var seenNoncesByDirective = {};
                assetGraph.eachAssetPostOrder(htmlAsset, {type: assetGraph.query.not(['HtmlAnchor', 'HtmlMetaRefresh', 'HtmlCacheManifest', 'JavaScriptSourceUrl', 'JavaScriptSourceMappingUrl', 'JavaScriptSourceMap'])}, function (asset, incomingRelation) {
                    var directive = incomingRelation && directiveByRelationType[incomingRelation.type];
                    if (directive) {
                        if (asset.isInline) {
                            if ((directive === 'styleSrc' || directive === 'scriptSrc') && !supportsUnsafeInline(directive)) {
                                disallowedRelationsByDirectiveAndOrigin[directive] = disallowedRelationsByDirectiveAndOrigin[directive] || {};
                                var hashSource = '\'sha256-' + crypto.createHash('sha256').update(asset.rawSrc).digest('base64') + '\'';
                                (disallowedRelationsByDirectiveAndOrigin[directive][hashSource] = disallowedRelationsByDirectiveAndOrigin[directive][hashSource] || []).push(incomingRelation);
                            } else if (/^data:/.test(incomingRelation.href)) {
                                disallowedRelationsByDirectiveAndOrigin[directive] = disallowedRelationsByDirectiveAndOrigin[directive] || {};
                                (disallowedRelationsByDirectiveAndOrigin[directive]['data:'] = disallowedRelationsByDirectiveAndOrigin[directive]['data:'] || []).push(incomingRelation);
                            }
                        } else if (!contentSecurityPolicy.allows(directive, asset.url)) {
                            disallowedRelationsByDirectiveAndOrigin[directive] = disallowedRelationsByDirectiveAndOrigin[directive] || {};
                            var origin = originFromUrl(asset.url);
                            (disallowedRelationsByDirectiveAndOrigin[directive][origin] = disallowedRelationsByDirectiveAndOrigin[directive][origin] || []).push(incomingRelation);
                        }
                        if (incomingRelation.from.type === 'Html') {
                            var nonce = incomingRelation.node.getAttribute('nonce');
                            if (nonce) {
                                (seenNoncesByDirective[directive] = seenNoncesByDirective[directive] || []).push('\'nonce-' + nonce + '\'');
                                if (options.update) {
                                    incomingRelation.node.removeAttribute('nonce');
                                    incomingRelation.from.markDirty();
                                }
                            }
                        }
                    }
                });

                var directives = _.uniq(Object.keys(disallowedRelationsByDirectiveAndOrigin).concat(Object.keys(seenNoncesByDirective)));

                directives.forEach(function (directive) {
                    var origins = Object.keys(disallowedRelationsByDirectiveAndOrigin[directive] || {});
                    if (options.update) {
                        if (contentSecurityPolicy.parseTree[directive]) {
                            origins = _.uniq(origins.concat(contentSecurityPolicy.parseTree[directive]));
                        } else if (contentSecurityPolicy.parseTree.defaultSrc) {
                            origins = _.uniq(origins.concat(contentSecurityPolicy.parseTree.defaultSrc));
                        }
                        if (seenNoncesByDirective[directive]) {
                            origins = _.difference(origins, seenNoncesByDirective[directive]);
                        }
                        if (origins.length > 1) {
                            var indexOfNoneToken = origins.indexOf('\'none\'');
                            if (indexOfNoneToken !== -1) {
                                origins.splice(indexOfNoneToken, 1);
                            }
                        }
                        if (defaultSrc && _.difference(defaultSrc, origins).length === 0 && _.difference(origins, defaultSrc).length === 0) {
                            delete contentSecurityPolicy.parseTree[directive];
                        } else {
                            contentSecurityPolicy.parseTree[directive] = origins.sort();
                        }
                        contentSecurityPolicy.markDirty();
                    } else {
                        var allowedOrigins = contentSecurityPolicy.parseTree[directive];
                        var directiveInEffect = directive;
                        if (!allowedOrigins) {
                            if (directive !== 'frameAncestors' && contentSecurityPolicy.parseTree.defaultSrc) {
                                directiveInEffect = 'defaultSrc';
                                allowedOrigins = contentSecurityPolicy.parseTree.defaultSrc;
                            } else {
                                allowedOrigins = ['\'none\''];
                            }
                        }
                        origins.forEach(function (nonWhitelistedOrigin) {
                            var relations = disallowedRelationsByDirectiveAndOrigin[directive][nonWhitelistedOrigin];
                            if (relations) {
                                relations = relations.filter(function (relation) {
                                    var nonce;
                                    if (relation.from.type === 'Html') {
                                        nonce = relation.node.getAttribute('nonce');
                                    }
                                    return !nonce || allowedOrigins.indexOf('\'nonce-' + nonce + '\'') === -1;
                                });
                                if (relations.length > 0) {
                                    assetGraph.emit(
                                        'warn',
                                        new Error(
                                            htmlAsset.urlOrDescription + ': ' + (relations.length === 1 ? 'An asset violates' : relations.length + ' relations violate') + ' the ' + fromCamelCase(directiveInEffect) + ' ' + allowedOrigins.join(' ') + ' Content-Security-Policy directive:\n  ' +
                                            relations.map(function (asset) {
                                                return asset.to.urlOrDescription;
                                            }).join('\n  ')
                                        )
                                    );
                                }
                            }
                        });
                    }
                });
            });
        });
    };
};
