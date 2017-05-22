/* eslint no-redeclare: "off", block-scoped-var: "off" */
const _ = require('lodash');
const esprima = require('esprima');
const JSDOM = require('jsdom').JSDOM;
const htmlMinifier = require('html-minifier');
const errors = require('../errors');
const Text = require('./Text');
const JavaScript = require('./JavaScript');
const mozilla = require('source-map');
const AssetGraph = require('../AssetGraph');

function extractEncodingFromText(text) {
    let metaCharset;
    for (const metaTagString of (text.match(/<meta[^>]+>/ig) || [])) {
        if (/\bhttp-equiv=([\"\']|)\s*Content-Type\s*\1/i.test(metaTagString)) {
            const matchContent = metaTagString.match(/\bcontent=([\"\']|)\s*text\/html;\s*charset=([\w\-]*)\s*\1/i);
            if (matchContent) {
                metaCharset = matchContent[2];
            }
        } else {
            const matchSimpleCharset = metaTagString.match(/\bcharset=([\"\']|)\s*([\w\-]*)\s*\1/i);
            if (matchSimpleCharset) {
                metaCharset = matchSimpleCharset[2];
            }
        }
    }
    return metaCharset; // Will be undefined if not found
}

class Html extends Text {
    init(config = {}) {
        super.init(config);
        if (typeof config.isFragment !== 'undefined') {
            this._isFragment = config.isFragment;
            config.isFragment = undefined;
        }
    }

    get encoding() {
        if (!this._encoding) {
            // An explicit encoding (Content-Type header, data: url charset, assetConfig) takes precedence, but if absent we should
            // look for a <meta http-equiv='Content-Type' ...> tag with a charset before falling back to the defaultEncoding (utf-8)
            if (typeof this._text === 'string') {
                this._encoding = extractEncodingFromText(this._text) || this.defaultEncoding;
            } else if (this._rawSrc) {
                this._encoding = extractEncodingFromText(this._rawSrc.toString('binary', 0, Math.min(1024, this._rawSrc.length))) || this.defaultEncoding;
            } else {
                this._encoding = this.defaultEncoding;
            }
        }
        return this._encoding;
    }

    set encoding(encoding) {
        // An intended side effect of getting this.parseTree before deleting this._rawSrc is that we're sure
        // that the raw source has been decoded into this._text before the original encoding is thrown away.
        const parseTree = this.parseTree;
        if (parseTree.head) {
            const existingMetaElements = parseTree.head.getElementsByTagName('meta');
            let contentTypeMetaElement;
            for (let i = 0 ; i < existingMetaElements.length ; i += 1) {
                const metaElement = existingMetaElements[i];
                if (metaElement.hasAttribute('charset') || /^content-type$/i.test(metaElement.getAttribute('http-equiv'))) {
                    contentTypeMetaElement = metaElement;
                    break;
                }
            }
            if (!contentTypeMetaElement) {
                contentTypeMetaElement = parseTree.createElement('meta');
                parseTree.head.insertBefore(contentTypeMetaElement, parseTree.head.firstChild);
                this.markDirty();
            }
            if (contentTypeMetaElement.hasAttribute('http-equiv')) {
                if ((contentTypeMetaElement.getAttribute('content') || '').toLowerCase() !== 'text/html; charset=' + encoding) {
                    contentTypeMetaElement.setAttribute('content', 'text/html; charset=' + encoding);
                    this.markDirty();
                }
            } else {
                // Simple <meta charset="...">
                if (contentTypeMetaElement.getAttribute('charset') !== encoding) {
                    contentTypeMetaElement.setAttribute('charset', encoding);
                    this.markDirty();
                }
            }
        }
        if (encoding !== this.encoding) {
            this._encoding = encoding;
            this.markDirty();
        }
    }

    unload() {
        super.unload();
        this._templateReplacements = {};
    }

    get text() {
        if (typeof this._text !== 'string') {
            if (this._parseTree) {
                this._text = this.isFragment ? this._parseTree.innerHTML : this._serialize();
                const templateReplacements = this._templateReplacements;
                this._text = Object.keys(templateReplacements).reduce(
                    (text, key) => text.replace(key, templateReplacements[key]),
                    this._text
                );
            } else {
                this._text = this._getTextFromRawSrc();
            }
            if (this.isMinified) {
                this._text = htmlMinifier.minify(this._text, _.defaults(this.htmlMinifierOptions || {}, {
                    // https://github.com/kangax/html-minifier#options-quick-reference
                    maxLineLength: Infinity,
                    collapseWhitespace: true,
                    collapseBooleanAttributes: true,
                    removeEmptyAttributes: true,
                    removeAttributeQuotes: true,
                    // useShortDoctype: true, // Replaces any DOCTYPE with the HTML5 one.
                    // removeOptionalTags: true, // Omits </head>, </body>, </html> etc. Too obtrusive?
                    removeComments: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    ignoreCustomComments: [
                        /^\s*\/?(?:ko|hz)(?:\s|$)/,
                        /^ASSETGRAPH DOCUMENT (?:START|END) MARKER$|^#|^\[if|^<!\[endif\]|^esi/
                    ]
                }));
            }
        }
        return this._text;
    }

    set text(text) {
        this.unload();

        this._text = text;
        if (this.assetGraph) {
            this.populate();
        }
        this.markDirty();
    }

    get parseTree() {
        if (!this._parseTree) {
            let text;
            if (typeof this._text === 'string') {
                text = this._text;
            } else {
                text = this._getTextFromRawSrc();
            }
            const templateReplacements = this._templateReplacements = {};
            text = text.replace(/<([%\?])[^\1]*?\1>/g, function (match, sub1, offset) {
                const key = '⋖' + offset + '⋗';
                templateReplacements[key] = match;
                return key;
            });

            const isFragment = this.isFragment;
            let document;
            try {
                const jsdom = new JSDOM(isFragment ? '<body>' + text + '</body>' : text, {
                    includeNodeLocations: true,
                    runScripts: 'outside-only'
                });
                document = jsdom.window.document;
                this._serialize = jsdom.serialize.bind(jsdom);
                this._nodeLocation = jsdom.nodeLocation.bind(jsdom);
            } catch (e) {
                const err = new errors.ParseError({message: 'Parse error in ' + this.urlOrDescription + '\n' + e.message, asset: this});
                if (this.assetGraph) {
                    this.assetGraph.emit('warn', err);
                } else {
                    throw err;
                }
            }
            if (isFragment) {
                // Install the properties of document on the HtmlBodyElement used as the parse tree:
                for (const propertyName in document) {
                    if (!(propertyName in document.body) && propertyName !== 'head') {
                        if (typeof document[propertyName] === 'function') {
                            document.body[propertyName] = document[propertyName].bind(document);
                        } else {
                            document.body[propertyName] = document[propertyName];
                        }
                    }
                }
                this._parseTree = document.body;
            } else {
                this._parseTree = document;
            }
        }
        return this._parseTree;
    }

    set parseTree(parseTree) {
        this.unload();
        this._parseTree = parseTree;
        this.markDirty();
    }

    get isFragment() {
        if (typeof this._isFragment === 'undefined' && this.isLoaded) {
            if (this._parseTree) {
                const document = this.parseTree;
                this._isFragment = !document.doctype && !document.body &&
                    document.getElementsByTagName('head').length === 0;
            } else {
                this._isFragment = !/<html/i.test(this.text);
            }
        }
        return this._isFragment;
    }

    set isFragment(isFragment) {
        this._isFragment = isFragment;
    }

    _createSourceMapForInlineScriptOrStylesheet(element) {
        const nonInlineAncestor = this.nonInlineAncestor;
        const sourceUrl = this.sourceUrl || (nonInlineAncestor ? nonInlineAncestor.url : this.url);
        let location;
        if (element.firstChild) {
            location = this._nodeLocation(element.firstChild);
        } else {
            // Empty script or stylesheet
            location = this._nodeLocation(element).endTag;
        }
        const sourceMapGenerator = new mozilla.SourceMapGenerator({file: this.nonInlineAncestor.url});
        const text = element.firstChild ? element.firstChild.nodeValue : '';
        let generatedLineNumber = 1;
        let generatedColumnNumber = 0;
        let previousChar;
        let originalLineNumber = location.line;
        let originalColumnNumber = location.col;
        let hasAddedMappingForTheCurrentLine = false;
        function addMapping() {
            sourceMapGenerator.addMapping({
                generated: {
                    line: generatedLineNumber,
                    column: generatedColumnNumber
                },
                original: {
                    line: originalLineNumber,
                    column: originalColumnNumber
                },
                source: sourceUrl
            });
        }
        addMapping();
        for (let i = 0 ; i < text.length ; i += 1) {
            const ch = text.charAt(i);
            if (ch === '\n') {
                if (previousChar !== '\r') {
                    originalLineNumber += 1;
                    generatedLineNumber += 1;
                    generatedColumnNumber = 0;
                    originalColumnNumber = 0;
                    hasAddedMappingForTheCurrentLine = false;
                }
            } else if (ch === '\r') {
                if (previousChar !== '\n') {
                    originalLineNumber += 1;
                    generatedLineNumber += 1;
                    generatedColumnNumber = 0;
                    originalColumnNumber = 0;
                    hasAddedMappingForTheCurrentLine = false;
                }
            } else {
                if (!hasAddedMappingForTheCurrentLine && !/\s/.test(ch)) {
                    addMapping();
                }
                originalColumnNumber += 1;
                generatedColumnNumber += 1;
            }
            previousChar = ch;
        }
        addMapping();
        return sourceMapGenerator.toJSON();
    }

    findOutgoingRelationsInParseTree() {
        const outgoingRelations = super.findOutgoingRelationsInParseTree();
        const currentConditionalComments = [];
        function addOutgoingRelation(outgoingRelation) {
            if (currentConditionalComments.length > 0) {
                outgoingRelation.conditionalComments = [].concat(currentConditionalComments);
            }
            outgoingRelations.push(outgoingRelation);
        }

        if (this.parseTree.documentElement && this.parseTree.documentElement.hasAttribute('manifest')) {
            addOutgoingRelation(new AssetGraph.HtmlCacheManifest({
                from: this,
                to: {
                    url: this.parseTree.documentElement.getAttribute('manifest')
                },
                node: this.parseTree.documentElement
            }));
        }
        let manifestFound = false;
        const queue = [this.parseTree];
        while (queue.length > 0) {
            const node = queue.shift();
            let traverse = true;
            if (node.nodeType === node.ELEMENT_NODE) {
                for (const attribute of Array.from(node.attributes)) {
                    if (/^on/i.test(attribute.nodeName)) {
                        addOutgoingRelation(new AssetGraph.HtmlInlineEventHandler({
                            from: this,
                            attributeName: attribute.nodeName,
                            to: new JavaScript({
                                isExternalizable: false,
                                serializationOptions: {
                                    semicolons: true,
                                    side_effects: false,
                                    newline: '',
                                    indent_level: 0
                                },
                                text: 'function bogus() {' + attribute.nodeValue + '}'
                            }),
                            node
                        }));
                    }
                }

                const nodeName = node.nodeName.toLowerCase();
                if (nodeName === 'script') {
                    const type = node.getAttribute('type');

                    if (!type || type === 'text/javascript') {
                        const src = node.getAttribute('src');
                        if (src) {
                            addOutgoingRelation(new AssetGraph.HtmlScript({
                                from: this,
                                to: {
                                    url: src
                                },
                                node
                            }));
                        } else {
                            addOutgoingRelation(new AssetGraph.HtmlScript({
                                from: this,
                                to: new (require('./JavaScript'))({
                                    sourceMap: this._createSourceMapForInlineScriptOrStylesheet(node),
                                    text: node.firstChild ? node.firstChild.nodeValue : ''
                                }),
                                node
                            }));
                        }
                    } else if (type === 'text/html' || type === 'text/ng-template') {
                        addOutgoingRelation(new AssetGraph.HtmlInlineScriptTemplate({
                            from: this,
                            to: new Html({
                                isExternalizable: false,
                                text: node.innerHTML || ''
                            }),
                            node
                        }));
                    }
                } else if (nodeName === 'template') {
                    traverse = false;
                    addOutgoingRelation(new AssetGraph.HtmlTemplate({
                        from: this,
                        to: new Html({
                            isFragment: true,
                            isInline: true,
                            text: node.innerHTML || ''
                        }),
                        node
                    }));
                } else if (nodeName === 'style') {
                    addOutgoingRelation(new AssetGraph.HtmlStyle({
                        from: this,
                        to: new (require('./Css'))({
                            sourceMap: this._createSourceMapForInlineScriptOrStylesheet(node),
                            text: node.firstChild ? node.firstChild.nodeValue : ''
                        }),
                        node
                    }));
                } else if (nodeName === 'link') {
                    if (node.hasAttribute('rel') && node.hasAttribute('href')) {
                        const rel = node.getAttribute('rel');
                        if (/(?:^| )stylesheet(?:$| )/i.test(rel)) {
                            addOutgoingRelation(new AssetGraph.HtmlStyle({
                                from: this,
                                to: {
                                    url: node.getAttribute('href')
                                },
                                node
                            }));
                        } else if (/(?:^| )(?:apple-touch-icon(?:-precomposed)?|icon)(?:$| )/i.test(rel)) { // Also catches rel="shortcut icon"
                            addOutgoingRelation(new AssetGraph.HtmlShortcutIcon({
                                from: this,
                                to: {
                                    url: node.getAttribute('href')
                                },
                                node
                            }));
                        } else if (/(?:^| )apple-touch-startup-image(?:$| )/i.test(rel)) {
                            addOutgoingRelation(new AssetGraph.HtmlAppleTouchStartupImage({
                                from: this,
                                to: {
                                    url: node.getAttribute('href')
                                },
                                node
                            }));
                        } else if (/(?:^| )alternate(?:$| )/i.test(rel)) {
                            const assetConfig = { url: node.getAttribute('href') };
                            if (node.hasAttribute('type')) {
                                assetConfig.contentType = node.getAttribute('type');
                            }
                            addOutgoingRelation(new AssetGraph.HtmlAlternateLink({
                                from: this,
                                to: assetConfig,
                                node
                            }));
                        } else if (/(?:^| )manifest(?:$| )/i.test(rel)) {
                            // Application Manifests
                            // See http://www.w3.org/TR/appmanifest/#using-a-link-element-to-link-to-a-manifest
                            if (!manifestFound) {
                                const assetConfig = {
                                    type: 'ApplicationManifest',
                                    url: node.getAttribute('href')
                                };
                                addOutgoingRelation(new AssetGraph.HtmlApplicationManifest({
                                    from: this,
                                    to: assetConfig,
                                    node
                                }));

                                manifestFound = true;
                            } else {
                                const err = new Error('Multiple ApplicationManifest relations. Only one per document is allowed. See http://www.w3.org/TR/appmanifest/#h-note4');
                                err.asset = this;
                                err.node = node;

                                this.assetGraph.emit('warn', err);
                            }
                        } else if (/(?:^| )serviceworker(?:$| )/i.test(rel)) {
                            // https://w3c.github.io/ServiceWorker/#link-type-serviceworker
                            addOutgoingRelation(new AssetGraph.HtmlServiceWorkerRegistration({
                                from: this,
                                to: {
                                    url: node.getAttribute('href')
                                },
                                node,
                                scope: node.getAttribute('scope')
                            }));
                        } else if (/(?:^| )author(?:$| )/i.test(rel)) {
                            const assetConfig = { url: node.getAttribute('href') };
                            if (node.hasAttribute('type')) {
                                assetConfig.contentType = node.getAttribute('type');
                            }
                            addOutgoingRelation(new AssetGraph.HtmlAuthorLink({
                                from: this,
                                to: assetConfig,
                                node
                            }));
                        } else if (/(?:^| )search(?:$| )/i.test(rel)) {
                            const assetConfig = {url: node.getAttribute('href') };
                            if (node.hasAttribute('type')) {
                                assetConfig.contentType = node.getAttribute('type');
                            }
                            addOutgoingRelation(new AssetGraph.HtmlSearchLink({
                                from: this,
                                to: assetConfig,
                                node
                            }));
                        } else if (/(?:^| )dns-prefetch(?:$| )/i.test(rel)) {
                            addOutgoingRelation(new AssetGraph.HtmlDnsPrefetchLink({
                                from: this,
                                to: {
                                    url: node.getAttribute('href')
                                },
                                node
                            }));
                        } else if (/(?:^| )preconnect(?:$| )/i.test(rel)) {
                            addOutgoingRelation(new AssetGraph.HtmlPreconnectLink({
                                from: this,
                                to: {
                                    url: node.getAttribute('href')
                                },
                                node
                            }));
                        } else if (/(?:^| )prerender(?:$| )/i.test(rel)) {
                            addOutgoingRelation(new AssetGraph.HtmlPrerenderLink({
                                from: this,
                                to: {
                                    url: node.getAttribute('href')
                                },
                                node
                            }));
                        } else if (/(?:^| )prefetch(?:$| )/i.test(rel)) {
                            const assetConfig = { url: node.getAttribute('href') };

                            const relationConfig = {
                                from: this,
                                to: assetConfig,
                                node
                            };

                            if (node.getAttribute('as')) {
                                relationConfig.as = node.getAttribute('as');
                            }

                            addOutgoingRelation(new AssetGraph.HtmlPrefetchLink(relationConfig));
                        } else if (/(?:^| )preload(?:$| )/i.test(rel)) {
                            const assetConfig = { url: node.getAttribute('href') };

                            if (node.hasAttribute('type')) {
                                assetConfig.contentType = node.getAttribute('type');
                            }

                            const relationConfig = {
                                from: this,
                                to: assetConfig,
                                node
                            };

                            if (node.getAttribute('as')) {
                                relationConfig.as = node.getAttribute('as');
                            }

                            addOutgoingRelation(new AssetGraph.HtmlPreloadLink(relationConfig));
                        } else if (/(?:^| )fluid-icon(?:$| )/i.test(rel)) {
                            const assetConfig = { url: node.getAttribute('href') };
                            if (node.hasAttribute('type')) {
                                assetConfig.contentType = node.getAttribute('type');
                            }
                            addOutgoingRelation(new AssetGraph.HtmlFluidIconLink({
                                from: this,
                                to: assetConfig,
                                node
                            }));
                        } else if (/(?:^| )logo(?:$| )/i.test(rel)) {
                            const assetConfig = { url: node.getAttribute('href') };
                            if (node.hasAttribute('type')) {
                                assetConfig.contentType = node.getAttribute('type');
                            }
                            addOutgoingRelation(new AssetGraph.HtmlLogo({
                                from: this,
                                to: assetConfig,
                                node
                            }));
                        } else if (/import/i.test(rel)) {
                            // HtmlImport specification: http://w3c.github.io/webcomponents/spec/imports/
                            addOutgoingRelation(new AssetGraph.HtmlImport({
                                from: this,
                                to: {
                                    url: node.getAttribute('href'),
                                    type: 'Html',
                                    // Web Compoonents are explicitly not to be treated as HTML fragments
                                    // Override automated isFragment resolving here
                                    isFragment: false
                                },
                                node
                            }));
                        }
                    }
                } else if (nodeName === 'meta') {
                    if (/^refresh$/i.test(node.getAttribute('http-equiv'))) {
                        const content = node.getAttribute('content');
                        const matchContent = content && content.match(/^\d+;\s*url\s*=\s*(.*?)\s*$/);
                        if (matchContent) {
                            addOutgoingRelation(new AssetGraph.HtmlMetaRefresh({
                                from: this,
                                to: {
                                    url: matchContent[1]
                                },
                                node
                            }));
                        }
                    } else if (/^og:(?:url|image|audio|video)(?:(?:$|:)(?:url|secure_url|$))/.test(node.getAttribute('property')) && node.hasAttribute('content')) {
                        addOutgoingRelation(new AssetGraph.HtmlOpenGraph({
                            from: this,
                            to: {
                                url: node.getAttribute('content')
                            },
                            node,
                            ogProperty: node.getAttribute('property')
                        }));
                    } else if (node.getAttribute('name') === 'msapplication-config' && node.hasAttribute('content')) {
                        addOutgoingRelation(new AssetGraph.HtmlMsApplicationConfig({
                            from: this,
                            to: {
                                type: 'MsApplicationConfig',
                                url: node.getAttribute('content')
                            },
                            node
                        }));
                    } else if (node.getAttribute('name') === 'msapplication-TileImage' && node.hasAttribute('content')) {
                        addOutgoingRelation(new AssetGraph.HtmlMsApplicationTileImageMeta({
                            from: this,
                            to: {
                                url: node.getAttribute('content')
                            },
                            node
                        }));
                    } else {
                        const httpEquivAttributeValue = node.getAttribute('http-equiv');
                        if (/^Content-Security-Policy(?:-Report-Only)?$/i.test(httpEquivAttributeValue)) {
                            const contentAttributeValue = node.getAttribute('content');
                            if (typeof contentAttributeValue === 'string') {
                                addOutgoingRelation(new AssetGraph.HtmlContentSecurityPolicy({
                                    from: this,
                                    isExternalizable: false,
                                    to: new AssetGraph.ContentSecurityPolicy({
                                        text: contentAttributeValue
                                    }),
                                    node
                                }));
                            }
                        }
                    }
                } else if (nodeName === 'img') {
                    const srcAttributeValue = node.getAttribute('src');
                    const srcSetAttributeValue = node.getAttribute('srcset');
                    if (srcAttributeValue) {
                        addOutgoingRelation(new AssetGraph.HtmlImage({
                            from: this,
                            to: {
                                url: srcAttributeValue
                            },
                            node
                        }));
                    }
                    if (srcSetAttributeValue) {
                        addOutgoingRelation(new AssetGraph.HtmlImageSrcSet({
                            from: this,
                            to: new (require('./SrcSet'))({
                                text: srcSetAttributeValue
                            }),
                            node
                        }));
                    }
                } else if (nodeName === 'a' && node.hasAttribute('href')) {
                    addOutgoingRelation(new AssetGraph.HtmlAnchor({
                        from: this,
                        to: {
                            url: node.getAttribute('href')
                        },
                        node
                    }));
                } else if (nodeName === 'iframe') {
                    if (node.hasAttribute('src')) {
                        addOutgoingRelation(new AssetGraph.HtmlIFrame({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node
                        }));
                    }
                    if (node.hasAttribute('srcdoc')) {
                        addOutgoingRelation(new AssetGraph.HtmlIFrameSrcDoc({
                            from: this,
                            to: new Html({
                                text: node.getAttribute('srcdoc')
                            }),
                            node
                        }));
                    }
                } else if (nodeName === 'frame' && node.hasAttribute('src')) {
                    addOutgoingRelation(new AssetGraph.HtmlFrame({
                        from: this,
                        to: {
                            url: node.getAttribute('src')
                        },
                        node
                    }));
                } else if (nodeName === 'esi:include' && node.hasAttribute('src')) {
                    addOutgoingRelation(new AssetGraph.HtmlEdgeSideInclude({
                        from: this,
                        to: {
                            url: node.getAttribute('src')
                        },
                        node
                    }));
                } else if (nodeName === 'video') {
                    if (node.hasAttribute('src')) {
                        addOutgoingRelation(new AssetGraph[nodeName === 'video' ? 'HtmlVideo' : 'HtmlAudio']({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node
                        }));
                    }
                    if (node.hasAttribute('poster')) {
                        addOutgoingRelation(new AssetGraph.HtmlVideoPoster({
                            from: this,
                            to: {
                                url: node.getAttribute('poster')
                            },
                            node
                        }));
                    }
                } else if (nodeName === 'audio' && node.hasAttribute('src')) {
                    addOutgoingRelation(new AssetGraph.HtmlAudio({
                        from: this,
                        to: {
                            url: node.getAttribute('src')
                        },
                        node
                    }));
                } else if (/^(?:source|track)$/i.test(nodeName) && node.parentNode && /^(?:video|audio)$/i.test(node.parentNode.nodeName) && node.hasAttribute('src')) {
                    addOutgoingRelation(new AssetGraph[node.parentNode.nodeName.toLowerCase() === 'video' ? 'HtmlVideo' : 'HtmlAudio']({
                        from: this,
                        to: {
                            url: node.getAttribute('src')
                        },
                        node
                    }));
                } else if (nodeName === 'source' && node.parentNode && node.parentNode.nodeName.toLowerCase() === 'picture') {
                    const srcAttributeValue = node.getAttribute('src');
                    const srcSetAttributeValue = node.getAttribute('srcset');
                    if (srcAttributeValue) {
                        addOutgoingRelation(new AssetGraph.HtmlPictureSource({
                            from: this,
                            to: {
                                url: srcAttributeValue
                            },
                            node
                        }));
                    }
                    if (srcSetAttributeValue) {
                        addOutgoingRelation(new AssetGraph.HtmlPictureSourceSrcSet({
                            from: this,
                            to: new (require('./SrcSet'))({
                                text: srcSetAttributeValue
                            }),
                            node
                        }));
                    }
                } else if (nodeName === 'object' && node.hasAttribute('data')) {
                    addOutgoingRelation(new AssetGraph.HtmlObject({
                        from: this,
                        to: {
                            url: node.getAttribute('data')
                        },
                        node,
                        attributeName: 'data'
                    }));
                } else if (nodeName === 'param' && /^(?:src|movie)$/i.test(node.getAttribute('name')) && node.parentNode && node.parentNode.nodeName.toLowerCase() === 'object' && node.hasAttribute('value')) {
                    addOutgoingRelation(new AssetGraph.HtmlObject({
                        from: this,
                        to: {
                            url: node.getAttribute('value')
                        },
                        node,
                        attributeName: 'value'
                    }));
                } else if (nodeName === 'applet') {
                    for (const attributeName of ['archive', 'codebase']) {
                        // Note: Only supports one url in the archive attribute. The Html 4.01 spec says it can be a comma-separated list.
                        if (node.hasAttribute(attributeName)) {
                            addOutgoingRelation(new AssetGraph.HtmlApplet({
                                from: this,
                                to: {
                                    url: node.getAttribute(attributeName)
                                },
                                node,
                                attributeName: attributeName
                            }));
                        }
                    }
                } else if (nodeName === 'embed' && node.hasAttribute('src')) {
                    addOutgoingRelation(new AssetGraph.HtmlEmbed({
                        from: this,
                        to: {
                            url: node.getAttribute('src')
                        },
                        node
                    }));
                } else if (nodeName === 'svg') {
                    addOutgoingRelation(new AssetGraph.HtmlSvgIsland({
                        from: this,
                        to: new AssetGraph.Svg({
                            isExternalizable: false,
                            text: node.outerHTML
                        }),
                        node
                    }));
                }
                if (node.hasAttribute('style')) {
                    addOutgoingRelation(new AssetGraph.HtmlStyleAttribute({
                        from: this,
                        to: new (require('./Css'))({
                            isExternalizable: false,
                            text: 'bogusselector {' + node.getAttribute('style') + '}'
                        }),
                        node
                    }));
                }
                // Handle Knockout.js attributes (data-bind, params)
                for (const attributeName of ['data-bind', 'params']) {
                    if (node.hasAttribute(attributeName)) {
                        let AttributeRelation;
                        if (attributeName === 'data-bind') {
                            AttributeRelation = AssetGraph.HtmlDataBindAttribute;
                        } else if (attributeName === 'params') {
                            AttributeRelation = AssetGraph.HtmlParamsAttribute;
                        } else {
                            return;
                        }
                        // See if the attribute value can be parsed as a Knockout.js data-bind:
                        const javaScriptObjectLiteral = '({' + node.getAttribute(attributeName).replace(/^\s*\{(.*)\}\s*$/, '$1') + '});';
                        let parseTree = null; // Must be set to something falsy each time we make it here
                        try {
                            parseTree = esprima.parse(javaScriptObjectLiteral, {
                                sourceType: 'module',
                                jsx: true
                            });
                        } catch (e) {}

                        if (parseTree) {
                            addOutgoingRelation(new AttributeRelation({
                                from: this,
                                to: new JavaScript({
                                    isExternalizable: false,
                                    serializationOptions: {
                                        semicolons: true,
                                        side_effects: false,
                                        newline: '',
                                        indent_level: 0
                                    },
                                    parseTree,
                                    text: javaScriptObjectLiteral
                                }),
                                node
                            }));
                        }
                    }
                }
            } else if (node.nodeType === node.COMMENT_NODE) {
                // <!--[if !IE]> --> ... <!-- <![endif]-->
                // <!--[if IE gte 8]><!--> ... <!--<![endif]--> (evaluated by certain IE versions and all non-IE browsers)
                const matchNonInternetExplorerConditionalComment = node.nodeValue.match(/^\[if\s*([^\]]*)\]>\s*(?:<!)?$/);
                if (matchNonInternetExplorerConditionalComment) {
                    currentConditionalComments.push(node);
                } else if (/^\s*<!\[endif\]\s*$/.test(node.nodeValue)) {
                    if (currentConditionalComments.length > 0) {
                        currentConditionalComments.pop();
                    } else {
                        const warning = new errors.SyntaxError({message: 'Html: Conditional comment end marker seen without a start marker: ' + node.nodeValue, asset: this});
                        if (this.assetGraph) {
                            this.assetGraph.emit('warn', warning);
                        } else {
                            console.warn(this.toString() + ': ' + warning.message);
                        }
                    }
                } else {
                    // <!--[if ...]> .... <![endif]-->
                    const matchConditionalComment = node.nodeValue.match(/^\[if\s*([^\]]*)\]\>([\s\S]*)<!\[endif\]$/);
                    if (matchConditionalComment) {
                        addOutgoingRelation(new AssetGraph.HtmlConditionalComment({
                            from: this,
                            to: new Html({
                                sourceUrl: this.sourceUrl || this.url,
                                text: '<!--ASSETGRAPH DOCUMENT START MARKER-->' + matchConditionalComment[2] + '<!--ASSETGRAPH DOCUMENT END MARKER-->'
                            }),
                            node,
                            condition: matchConditionalComment[1]
                        }));
                    } else {
                        const matchKnockoutContainerless = node.nodeValue.match(/^\s*ko\s+([\s\S]+)$/);
                        if (matchKnockoutContainerless) {
                            addOutgoingRelation(new AssetGraph.HtmlKnockoutContainerless({
                                from: this,
                                to: new (require('./JavaScript'))({
                                    isExternalizable: false,
                                    serializationOptions: {
                                        semicolons: true,
                                        side_effects: false,
                                        newline: '',
                                        indent_level: 0
                                    },
                                    text: '({' + matchKnockoutContainerless[1] + '});'
                                }),
                                node
                            }));
                        } else {
                            const matchEsi = node.nodeValue.match(/^esi([\s\S]*)$/);
                            if (matchEsi) {
                                addOutgoingRelation(new AssetGraph.HtmlEdgeSideIncludeSafeComment({
                                    from: this,
                                    to: new Html({
                                        text: '<!--ASSETGRAPH DOCUMENT START MARKER-->' + matchEsi[1] + '<!--ASSETGRAPH DOCUMENT END MARKER-->'
                                    }),
                                    node
                                }));
                            }
                        }
                    }
                }
            }

            if (traverse && node.childNodes) {
                for (let i = node.childNodes.length - 1 ; i >= 0 ; i -= 1) {
                    queue.unshift(node.childNodes[i]);
                }
            }
        }
        if (currentConditionalComments.length > 0) {
            const warning = new errors.SyntaxError({message: 'Html: No end marker found for conditional comment(s):\n' + _.map(currentConditionalComments, 'nodeValue').join('\n  '), asset: this});
            if (this.assetGraph) {
                this.assetGraph.emit('warn', warning);
            } else {
                console.warn(this.toString() + ': ' + warning.message);
            }
        }
        return outgoingRelations;
    }

    allowsPerCsp(directive, urlOrToken, protectedResourceUrl) {
        const csps = [];
        for (const outgoingRelation of this.outgoingRelations) {
            if (outgoingRelation.type === 'HtmlContentSecurityPolicy' && outgoingRelation.to && outgoingRelation.to.type === 'ContentSecurityPolicy') {
                csps.push(outgoingRelation.to);
            }
        }
        return csps.every(csp => csp.allows(directive, urlOrToken, protectedResourceUrl));
    }

    minify() {
        this.isPretty = false;
        this.isMinified = true;
        this.parseTree; // Side effect: Make sure that reserialize when .text or .rawSrc are accessed
        this.markDirty();
        return this;
    }

    prettyPrint() {
        this.isPretty = true;
        this.isMinified = false;
        this.markDirty();
        return this;
    }
};

Object.assign(Html.prototype, {
    contentType: 'text/html',

    supportedExtensions: ['.html', '.template', '.xhtml', '.shtml', '.ko'],

    isPretty: false
});

module.exports = Html;
