const urlModule = require('url');
const _ = require('lodash');
const crypto = require('crypto');
const ContentSecurityPolicy = require('../assets/ContentSecurityPolicy');

const directiveByRelationType = {
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
    HtmlApplicationManifest: 'manifestSrc',
    JavaScriptFetch: 'connectSrc'
};

function toCamelCase(str) {
    return str.replace(/-([a-z])/g, ($0, ch) => ch.toUpperCase());
}

function fromCamelCase(str) {
    return str.replace(/[A-Z]/g, $0 => '-' + $0.toLowerCase());
}

function isNonceOrHash(sourceExpression) {
    return /^'nonce-|^'sha\d+-/.test(sourceExpression);
}

module.exports = (queryObj, options) => {
    options = options || {};
    return function reviewContentSecurityPolicy(assetGraph) {
        const includePathByDirective = {};
        if (options.includePath) {
            for (const directive of _.flatten(options.includePath)) {
                includePathByDirective[toCamelCase(directive)] = true;
            }
        }

        function originFromUrl(url, directive, isInProtocolRelativeContext) {
            if (assetGraph.root && url.startsWith(assetGraph.root)) {
                return '\'self\'';
            } else if (options.includePath === true || includePathByDirective[directive]) {
                if (isInProtocolRelativeContext) {
                    return url.replace(/^https?:\/\//, '');
                } else {
                    return url;
                }
            } else {
                const urlObj = urlModule.parse(url);
                let host = urlObj.hostname;
                if (urlObj.port && parseInt(urlObj.port, 10) !== {'https:': 443, 'http:': 80}[urlObj.protocol]) {
                    host += ':' + urlObj.port;
                }

                if (isInProtocolRelativeContext) {
                    return host;
                } else {
                    return urlObj.protocol + '//' + host;
                }
            }
        }

        for (const htmlAsset of assetGraph.findAssets(queryObj || { type: 'Html', isInline: false, isFragment: false, isLoaded: true })) {
            const htmlContentSecurityPolicies = assetGraph.findRelations({from: htmlAsset, type: 'HtmlContentSecurityPolicy'});
            for (const htmlContentSecurityPolicy of htmlContentSecurityPolicies) {
                const contentSecurityPolicy = htmlContentSecurityPolicy.to;
                const defaultSrc = contentSecurityPolicy.parseTree.defaultSrc;

                function supportsUnsafeInline(directive) {
                    return (
                        contentSecurityPolicy.parseTree[directive] ?
                            contentSecurityPolicy.parseTree[directive].includes('\'unsafe-inline\'') :
                            defaultSrc && ContentSecurityPolicy.directiveFallsBackToDefaultSrc(directive) && defaultSrc.includes('\'unsafe-inline\'')
                    );
                }

                function hasNonceOrHash(directive) {
                    return (
                        contentSecurityPolicy.parseTree[directive] ?
                            contentSecurityPolicy.parseTree[directive].some(isNonceOrHash) :
                            defaultSrc && ContentSecurityPolicy.directiveFallsBackToDefaultSrc(directive) && defaultSrc.some(isNonceOrHash)
                    );
                }

                const disallowedRelationsByDirectiveAndOrigin = {};
                const seenNoncesByDirective = {};

                function noteAsset(asset, incomingRelation, isInProtocolRelativeContext, directive) {
                    directive = directive || (incomingRelation && directiveByRelationType[incomingRelation.type]);
                    if (directive) {
                        if (asset.isInline) {
                            if ((directive === 'styleSrc' || directive === 'scriptSrc') && (!supportsUnsafeInline(directive) || hasNonceOrHash(directive))) {
                                disallowedRelationsByDirectiveAndOrigin[directive] = disallowedRelationsByDirectiveAndOrigin[directive] || {};
                                const hashSource = '\'sha256-' + crypto.createHash('sha256').update(asset.rawSrc).digest('base64') + '\'';
                                (disallowedRelationsByDirectiveAndOrigin[directive][hashSource] = disallowedRelationsByDirectiveAndOrigin[directive][hashSource] || []).push(incomingRelation);
                            } else if (/^data:/.test(incomingRelation.href)) {
                                disallowedRelationsByDirectiveAndOrigin[directive] = disallowedRelationsByDirectiveAndOrigin[directive] || {};
                                (disallowedRelationsByDirectiveAndOrigin[directive]['data:'] = disallowedRelationsByDirectiveAndOrigin[directive]['data:'] || []).push(incomingRelation);
                            }
                        } else if (!contentSecurityPolicy.allows(directive, asset.url)) {
                            disallowedRelationsByDirectiveAndOrigin[directive] = disallowedRelationsByDirectiveAndOrigin[directive] || {};
                            const origin = originFromUrl(asset.url, directive, isInProtocolRelativeContext);
                            (disallowedRelationsByDirectiveAndOrigin[directive][origin] = disallowedRelationsByDirectiveAndOrigin[directive][origin] || []).push(incomingRelation);
                        }
                        if (incomingRelation.from.type === 'Html') {
                            const nonce = incomingRelation.node.getAttribute('nonce');
                            if (nonce) {
                                (seenNoncesByDirective[directive] = seenNoncesByDirective[directive] || []).push('\'nonce-' + nonce + '\'');
                                if (options.update) {
                                    incomingRelation.node.removeAttribute('nonce');
                                    incomingRelation.from.markDirty();
                                }
                            }
                        }
                    }
                }

                const isSeenByAssetId = {
                    [htmlAsset.id]: true
                };
                const protocolRelativeStack = [false];
                assetGraph._traverse(htmlAsset, {type: assetGraph.query.not(['HtmlAnchor', 'HtmlMetaRefresh', 'JavaScriptSourceUrl', 'JavaScriptSourceMappingUrl', 'CssSourceUrl', 'CssSourceMappingUrl'])}, (asset, incomingRelation) => {
                    const isInProtocolRelativeContext = protocolRelativeStack[protocolRelativeStack.length - 1] || (incomingRelation && incomingRelation.hrefType === 'protocolRelative');
                    protocolRelativeStack.push(isInProtocolRelativeContext);
                    isSeenByAssetId[asset.id] = true;
                    if (incomingRelation && incomingRelation.type === 'HttpRedirect') {
                        // Work backwards through all the seen assets to find all relevant paths through this redirect:
                        const isSeenByRelationId = {};
                        const queue = [].concat(incomingRelation.from.incomingRelations.filter(
                            relation => isSeenByAssetId[relation.from.id]
                        ));
                        while (queue.length > 0) {
                            const relation = queue.shift();
                            if (!isSeenByRelationId[relation.id]) {
                                isSeenByRelationId[relation.id] = true;
                                if (relation.type === 'HttpRedirect') {
                                    queue.push(...relation.from.incomingRelations.filter(relation => {
                                        return isSeenByAssetId[relation.from.id] && !isSeenByRelationId[relation.id];
                                    }));
                                } else {
                                    noteAsset(asset, incomingRelation, isInProtocolRelativeContext, directiveByRelationType[relation.type]);
                                }
                            }
                        }
                    } else {
                        noteAsset(asset, incomingRelation, isInProtocolRelativeContext);
                    }
                }, () => protocolRelativeStack.pop());

                const directives = _.uniq(
                    Object.keys(disallowedRelationsByDirectiveAndOrigin)
                        .concat(Object.keys(seenNoncesByDirective))
                        .concat(Object.keys(contentSecurityPolicy.parseTree))
                );

                if (options.infoObject) {
                    options.infoObject[contentSecurityPolicy.id] = {
                        additions: disallowedRelationsByDirectiveAndOrigin
                    };
                }

                for (const directive of directives) {
                    let origins = Object.keys(disallowedRelationsByDirectiveAndOrigin[directive] || {});
                    if (options.update) {
                        if (contentSecurityPolicy.parseTree[directive]) {
                            origins = _.uniq(origins.concat(contentSecurityPolicy.parseTree[directive]));
                        } else if (ContentSecurityPolicy.directiveFallsBackToDefaultSrc(directive) && contentSecurityPolicy.parseTree.defaultSrc) {
                            origins = _.uniq(origins.concat(contentSecurityPolicy.parseTree.defaultSrc));
                        }
                        let noncesWereRemoved = false;
                        const originsWithNoncesSubtracted = _.difference(origins, ["'nonce-developmentonly'"].concat(seenNoncesByDirective[directive]));
                        if (originsWithNoncesSubtracted.length < origins.length) {
                            noncesWereRemoved = true;
                        }
                        origins = originsWithNoncesSubtracted;

                        // If we're removing 'nonce-developmentonly' when 'unsafe-inline' is in effect and there are no other
                        // nonces or hashes whitelisted, add the sha256 hash of the empty string to the list of allowed origins.
                        // This prevents 'unsafe-inline' from taking effect in CSP2+ compliant browsers that would otherwise
                        // ignore 'unsafe-inline' when at least one nonce or hash is present for the directive.
                        // https://www.w3.org/TR/CSP3/#match-element-to-source-list
                        if (noncesWereRemoved && origins.includes("'unsafe-inline'") && !origins.some(isNonceOrHash)) {
                            origins.push("'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='");
                        } else if (origins.some(isNonceOrHash) && !origins.includes("'unsafe-inline'")) {
                            origins.push("'unsafe-inline'");
                        }
                        if (options.level < 2) {
                            origins = origins.filter(origin => !isNonceOrHash(origin));
                        }
                        if (origins.length > 1) {
                            const indexOfNoneToken = origins.indexOf('\'none\'');
                            if (indexOfNoneToken !== -1) {
                                origins.splice(indexOfNoneToken, 1);
                            }
                        }
                        if (directive !== 'defaultSrc' && defaultSrc && ContentSecurityPolicy.directiveFallsBackToDefaultSrc(directive) && _.difference(defaultSrc, origins).length === 0 && _.difference(origins, defaultSrc).length === 0) {
                            delete contentSecurityPolicy.parseTree[directive];
                        } else {
                            contentSecurityPolicy.parseTree[directive] = origins.sort();
                        }
                        contentSecurityPolicy.markDirty();
                    } else {
                        let allowedOrigins = contentSecurityPolicy.parseTree[directive];
                        let directiveInEffect = directive;
                        if (!allowedOrigins) {
                            if (directive !== 'frameAncestors' && contentSecurityPolicy.parseTree.defaultSrc) {
                                directiveInEffect = 'defaultSrc';
                                allowedOrigins = contentSecurityPolicy.parseTree.defaultSrc;
                            } else {
                                allowedOrigins = ['\'none\''];
                            }
                        }
                        for (const nonWhitelistedOrigin of origins) {
                            let relations = disallowedRelationsByDirectiveAndOrigin[directive][nonWhitelistedOrigin];
                            if (relations) {
                                relations = relations.filter(relation => {
                                    let nonce;
                                    if (relation.from.type === 'Html') {
                                        nonce = relation.node.getAttribute('nonce');
                                    }
                                    return !nonce || !allowedOrigins.includes('\'nonce-' + nonce + '\'');
                                });
                                if (relations.length > 0) {
                                    assetGraph.emit(
                                        'warn',
                                        new Error(
                                            htmlAsset.urlOrDescription + ': ' + (relations.length === 1 ? 'An asset violates' : relations.length + ' relations violate') + ' the ' + fromCamelCase(directiveInEffect) + ' ' + allowedOrigins.join(' ') + ' Content-Security-Policy directive:\n  ' +
                                            relations.map(asset => asset.to.urlOrDescription).join('\n  ')
                                        )
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    };
};
