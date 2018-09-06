const urlModule = require('url');
const _ = require('lodash');
const crypto = require('crypto');
const ContentSecurityPolicy = require('../assets/ContentSecurityPolicy');

const directiveByRelationType = {
  HtmlStyle: 'styleSrc',
  CssImport: 'styleSrc',
  HtmlStyleAttribute: 'styleSrc',
  HtmlScript: 'scriptSrc',
  HtmlInlineEventHandler: 'scriptSrc',
  CssFontFaceSrc: 'fontSrc',
  HtmlObject: 'objectSrc',
  HtmlApplet: 'objectSrc',
  HtmlImage: 'imgSrc',
  CssImage: 'imgSrc',
  HtmlShortcutIcon: 'imgSrc',
  HtmlPictureSource: 'imgSrc',
  HtmlFluidIconLink: 'imgSrc',
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
  return str.replace(/[A-Z]/g, $0 => `-${$0.toLowerCase()}`);
}

function isNonceOrHash(sourceExpression) {
  return /^'nonce-|^'sha\d+-/.test(sourceExpression);
}

/* eslint-disable no-inner-declarations */
module.exports = (queryObj, { includePath = false, update = false, level }) => {
  return function reviewContentSecurityPolicy(assetGraph) {
    const infoObject = {};
    const includePathByDirective = {};
    if (includePath) {
      for (const directive of _.flatten(includePath)) {
        includePathByDirective[toCamelCase(directive)] = true;
      }
    }

    function originFromUrl(url, directive) {
      if (assetGraph.root && url.startsWith(assetGraph.root)) {
        // TODO: What about the canonical root?
        return "'self'";
      } else if (includePath === true || includePathByDirective[directive]) {
        return url.replace(/^https?:\/\//, '');
      } else {
        const urlObj = urlModule.parse(url);
        let host = urlObj.hostname;
        if (
          urlObj.port &&
          parseInt(urlObj.port, 10) !==
            { 'https:': 443, 'http:': 80 }[urlObj.protocol]
        ) {
          host += `:${urlObj.port}`;
        }
        return host;
      }
    }

    for (const htmlAsset of assetGraph.findAssets(
      queryObj || {
        type: 'Html',
        isInline: false,
        isFragment: false,
        isLoaded: true
      }
    )) {
      const htmlContentSecurityPolicies = assetGraph.findRelations({
        from: htmlAsset,
        type: 'HtmlContentSecurityPolicy'
      });
      for (const htmlContentSecurityPolicy of htmlContentSecurityPolicies) {
        const contentSecurityPolicy = htmlContentSecurityPolicy.to;
        const defaultSrc = contentSecurityPolicy.parseTree.defaultSrc;

        function supportsUnsafeInline(directive) {
          return contentSecurityPolicy.parseTree[directive]
            ? contentSecurityPolicy.parseTree[directive].includes(
                "'unsafe-inline'"
              )
            : defaultSrc &&
                ContentSecurityPolicy.directiveFallsBackToDefaultSrc(
                  directive
                ) &&
                defaultSrc.includes("'unsafe-inline'");
        }

        function supportsUnsafeHashedAttributes(directive) {
          return contentSecurityPolicy.parseTree[directive]
            ? contentSecurityPolicy.parseTree[directive].includes(
                "'unsafe-hashes'"
              )
            : defaultSrc &&
                ContentSecurityPolicy.directiveFallsBackToDefaultSrc(
                  directive
                ) &&
                defaultSrc.includes("'unsafe-hashes'");
        }

        function supportsHashSource(directive, hashSource) {
          return contentSecurityPolicy.parseTree[directive]
            ? contentSecurityPolicy.parseTree[directive].includes(hashSource)
            : defaultSrc &&
                ContentSecurityPolicy.directiveFallsBackToDefaultSrc(
                  directive
                ) &&
                defaultSrc.includes(hashSource);
        }

        function supportsData(directive) {
          return contentSecurityPolicy.parseTree[directive]
            ? contentSecurityPolicy.parseTree[directive].includes('data:')
            : defaultSrc &&
                ContentSecurityPolicy.directiveFallsBackToDefaultSrc(
                  directive
                ) &&
                defaultSrc.includes('data:');
        }

        function hasNonceOrHash(directive) {
          return contentSecurityPolicy.parseTree[directive]
            ? contentSecurityPolicy.parseTree[directive].some(isNonceOrHash)
            : defaultSrc &&
                ContentSecurityPolicy.directiveFallsBackToDefaultSrc(
                  directive
                ) &&
                defaultSrc.some(isNonceOrHash);
        }

        const disallowedRelationsByDirectiveAndOrigin = {};
        const seenNoncesByDirective = {};
        function noteAsset(asset, incomingRelation, directive) {
          directive =
            directive ||
            (incomingRelation &&
              directiveByRelationType[incomingRelation.type]);
          if (directive) {
            if (asset.isInline) {
              if (
                (directive === 'styleSrc' || directive === 'scriptSrc') &&
                (!supportsUnsafeInline(directive) || hasNonceOrHash(directive))
              ) {
                const incomingInlineRelation = asset.incomingInlineRelation;
                const isUnsafeHashedAttribute =
                  incomingInlineRelation &&
                  (incomingInlineRelation.type === 'HtmlStyleAttribute' ||
                    incomingInlineRelation.type === 'HtmlInlineEventHandler');
                if (isUnsafeHashedAttribute && !(level >= 3)) {
                  disallowedRelationsByDirectiveAndOrigin[directive] =
                    disallowedRelationsByDirectiveAndOrigin[directive] || {};
                  (disallowedRelationsByDirectiveAndOrigin[directive][
                    "'unsafe-inline'"
                  ] =
                    disallowedRelationsByDirectiveAndOrigin[directive][
                      "'unsafe-inline'"
                    ] || []).push(incomingRelation);
                } else {
                  // This is a smell, find out if we can get bogusselector and function bogus stripped from asset.text:
                  let rawSrc;
                  let encoding;
                  if (isUnsafeHashedAttribute) {
                    rawSrc = incomingInlineRelation.href;
                    encoding =
                      incomingInlineRelation.from.nonInlineAncestor.encoding;
                  } else {
                    rawSrc = asset.rawSrc;
                  }
                  const hashSource = `'sha256-${crypto
                    .createHash('sha256')
                    .update(rawSrc, encoding)
                    .digest('base64')}'`;
                  if (!supportsHashSource(directive, hashSource)) {
                    disallowedRelationsByDirectiveAndOrigin[directive] =
                      disallowedRelationsByDirectiveAndOrigin[directive] || {};
                    (disallowedRelationsByDirectiveAndOrigin[directive][
                      hashSource
                    ] =
                      disallowedRelationsByDirectiveAndOrigin[directive][
                        hashSource
                      ] || []).push(incomingRelation);
                  }
                  if (
                    isUnsafeHashedAttribute &&
                    !supportsUnsafeHashedAttributes(directive)
                  ) {
                    disallowedRelationsByDirectiveAndOrigin[directive] =
                      disallowedRelationsByDirectiveAndOrigin[directive] || {};
                    (disallowedRelationsByDirectiveAndOrigin[directive][
                      "'unsafe-hashes'"
                    ] =
                      disallowedRelationsByDirectiveAndOrigin[directive][
                        "'unsafe-hashes'"
                      ] || []).push(incomingRelation);
                  }
                }
              } else if (
                /^data:/.test(incomingRelation.href) &&
                !supportsData(directive)
              ) {
                disallowedRelationsByDirectiveAndOrigin[directive] =
                  disallowedRelationsByDirectiveAndOrigin[directive] || {};
                (disallowedRelationsByDirectiveAndOrigin[directive]['data:'] =
                  disallowedRelationsByDirectiveAndOrigin[directive]['data:'] ||
                  []).push(incomingRelation);
              }
            } else if (!contentSecurityPolicy.allows(directive, asset.url)) {
              disallowedRelationsByDirectiveAndOrigin[directive] =
                disallowedRelationsByDirectiveAndOrigin[directive] || {};
              const origin = originFromUrl(asset.url, directive);
              (disallowedRelationsByDirectiveAndOrigin[directive][origin] =
                disallowedRelationsByDirectiveAndOrigin[directive][origin] ||
                []).push(incomingRelation);
            }
            if (incomingRelation.from.type === 'Html') {
              const nonce = incomingRelation.node.getAttribute('nonce');
              if (nonce) {
                (seenNoncesByDirective[directive] =
                  seenNoncesByDirective[directive] || []).push(
                  `'nonce-${nonce}'`
                );
                if (update) {
                  incomingRelation.node.removeAttribute('nonce');
                  incomingRelation.from.markDirty();
                }
              }
            }
          }
        }

        const seenAssets = new Set();
        seenAssets.add(htmlAsset);
        assetGraph._traverse(
          htmlAsset,
          {
            type: {
              $nin: [
                'HtmlAnchor',
                'HtmlMetaRefresh',
                'JavaScriptSourceUrl',
                'JavaScriptSourceMappingUrl',
                'CssSourceUrl',
                'CssSourceMappingUrl'
              ]
            }
          },
          (asset, incomingRelation) => {
            seenAssets.add(asset.id);
            if (incomingRelation && incomingRelation.type === 'HttpRedirect') {
              // Work backwards through all the seen assets to find all relevant paths through this redirect:
              const seenRelations = new Set();
              const queue = [
                ...incomingRelation.from.incomingRelations.filter(relation =>
                  seenAssets.has(relation.from)
                )
              ];
              while (queue.length > 0) {
                const relation = queue.shift();
                if (!seenRelations.has(relation)) {
                  seenRelations.add(relation.id);
                  if (relation.type === 'HttpRedirect') {
                    queue.push(
                      ...relation.from.incomingRelations.filter(relation => {
                        return (
                          seenAssets.has(relation.from) &&
                          !seenRelations.has(relation)
                        );
                      })
                    );
                  } else {
                    noteAsset(
                      asset,
                      incomingRelation,
                      directiveByRelationType[relation.type]
                    );
                  }
                }
              }
            } else {
              noteAsset(asset, incomingRelation);
            }
          }
        );

        const directives = _.uniq([
          ...Object.keys(disallowedRelationsByDirectiveAndOrigin),
          ...Object.keys(seenNoncesByDirective),
          ...Object.keys(contentSecurityPolicy.parseTree)
        ]);

        infoObject[contentSecurityPolicy.id] = {
          additions: disallowedRelationsByDirectiveAndOrigin
        };

        for (const directive of directives) {
          let originsToAdd = Object.keys(
            disallowedRelationsByDirectiveAndOrigin[directive] || {}
          );
          let existingOrigins;
          if (contentSecurityPolicy.parseTree[directive]) {
            existingOrigins = contentSecurityPolicy.parseTree[directive];
          } else if (
            ContentSecurityPolicy.directiveFallsBackToDefaultSrc(directive) &&
            contentSecurityPolicy.parseTree.defaultSrc
          ) {
            existingOrigins = contentSecurityPolicy.parseTree.defaultSrc;
          } else {
            existingOrigins = [];
          }
          let origins = [...originsToAdd];
          if (update) {
            if (originsToAdd.includes("'unsafe-inline'")) {
              assetGraph.warn(
                new Error(
                  `${htmlAsset.urlOrDescription} contains one or more inline ${
                    directive === 'styleSrc'
                      ? 'style attributes'
                      : 'event handlers'
                  }, which cannot be whitelisted with CSP level 2 except via 'unsafe-inline', which almost defeats the purpose of having a CSP\n` +
                    "The 'unsafe-hashes' CSP3 keyword will allow it, but at the time of writing the spec is not finalized and no browser implements it."
                )
              );
            }
            origins = _.uniq([...origins, ...existingOrigins]);
            let noncesWereRemoved = false;
            const seenNonces = seenNoncesByDirective[directive] || [];
            const originsWithNoncesSubtracted = _.difference(origins, [
              "'nonce-developmentonly'",
              ...seenNonces
            ]);
            if (originsWithNoncesSubtracted.length < origins.length) {
              noncesWereRemoved = true;
            }
            origins = originsWithNoncesSubtracted;

            // If we're removing 'nonce-developmentonly' when 'unsafe-inline' is in effect and there are no other
            // nonces or hashes whitelisted, add the sha256 hash of the empty string to the list of allowed origins.
            // This prevents 'unsafe-inline' from taking effect in CSP2+ compliant browsers that would otherwise
            // ignore 'unsafe-inline' when at least one nonce or hash is present for the directive.
            // https://www.w3.org/TR/CSP3/#match-element-to-source-list
            if (
              noncesWereRemoved &&
              origins.includes("'unsafe-inline'") &&
              !origins.some(isNonceOrHash)
            ) {
              origins.push(
                "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='"
              );
            } else {
              const nonceOrHashOrigins = origins.filter(isNonceOrHash);
              // Add 'unsafe-inline' unless all the nonceOrHashOrigins were added
              // because of relations that require 'unsafe-hashes'
              if (
                nonceOrHashOrigins.length > 0 &&
                !origins.includes("'unsafe-inline'")
              ) {
                if (
                  !nonceOrHashOrigins.every(hashSource => {
                    const relations =
                      disallowedRelationsByDirectiveAndOrigin[directive] &&
                      disallowedRelationsByDirectiveAndOrigin[directive][
                        hashSource
                      ];
                    return (
                      relations &&
                      relations.every(
                        relation =>
                          relation.type === 'HtmlInlineEventHandler' ||
                          relation.type === 'HtmlStyleAttribute'
                      )
                    );
                  })
                ) {
                  origins.push("'unsafe-inline'");
                }
              }
            }
            if (level < 2) {
              origins = origins.filter(origin => !isNonceOrHash(origin));
            }
            if (origins.length > 1) {
              const indexOfNoneToken = origins.indexOf("'none'");
              if (indexOfNoneToken !== -1) {
                origins.splice(indexOfNoneToken, 1);
              }
            }
            if (
              directive !== 'defaultSrc' &&
              defaultSrc &&
              ContentSecurityPolicy.directiveFallsBackToDefaultSrc(directive) &&
              _.difference(defaultSrc, origins).length === 0 &&
              _.difference(origins, defaultSrc).length === 0
            ) {
              delete contentSecurityPolicy.parseTree[directive];
            } else {
              contentSecurityPolicy.parseTree[directive] = origins.sort();
            }
            contentSecurityPolicy.markDirty();
          } else {
            let allowedOrigins = contentSecurityPolicy.parseTree[directive];
            let directiveInEffect = directive;
            if (!allowedOrigins) {
              if (
                directive !== 'frameAncestors' &&
                contentSecurityPolicy.parseTree.defaultSrc
              ) {
                directiveInEffect = 'defaultSrc';
                allowedOrigins = contentSecurityPolicy.parseTree.defaultSrc;
              } else {
                allowedOrigins = ["'none'"];
              }
            }
            for (const nonWhitelistedOrigin of origins) {
              let relations =
                disallowedRelationsByDirectiveAndOrigin[directive][
                  nonWhitelistedOrigin
                ];
              if (relations) {
                relations = relations.filter(relation => {
                  let nonce;
                  if (relation.from.type === 'Html') {
                    nonce = relation.node.getAttribute('nonce');
                  }
                  return !nonce || !allowedOrigins.includes(`'nonce-${nonce}'`);
                });
                if (relations.length > 0) {
                  if (nonWhitelistedOrigin === "'unsafe-hashes'") {
                    if (level >= 3) {
                      assetGraph.warn(
                        new Error(
                          `${
                            htmlAsset.urlOrDescription
                          }: Missing ${fromCamelCase(
                            directive
                          )} 'unsafe-hashes':\n  ${relations
                            .map(asset => asset.to.urlOrDescription)
                            .join('\n  ')}`
                        )
                      );
                    }
                  } else {
                    assetGraph.warn(
                      new Error(
                        `${htmlAsset.urlOrDescription}: ${
                          relations.length === 1
                            ? 'An asset violates'
                            : `${relations.length} relations violate`
                        } the ${fromCamelCase(
                          directiveInEffect
                        )} ${allowedOrigins.join(
                          ' '
                        )} Content-Security-Policy directive:\n  ${relations
                          .map(asset => asset.to.urlOrDescription)
                          .join('\n  ')}`
                      )
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
    return infoObject;
  };
};
