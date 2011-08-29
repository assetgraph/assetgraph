var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom'),
    domtohtml = require('jsdom/lib/jsdom/browser/domtohtml'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    relations = require('../relations'),
    Asset = require('./Asset'),
    Text = require('./Text');

function Html(config) {
    Text.call(this, config);
}

util.inherits(Html, Text);

function extractEncodingFromText(text) {
    var metaCharset;
    (text.match(/<meta[^>]+>/ig) || []).forEach(function (metaTagString) {
        if (/\bhttp-equiv=([\"\']|)\s*Content-Type\s*\1/i.test(metaTagString)) {
            var matchContent = metaTagString.match(/\bcontent=([\"\']|)\s*text\/html;\s*charset=([\w\-]*)\s*\1/i);
            if (matchContent) {
                metaCharset = matchContent[2];
            }
        }
    });
    return metaCharset; // Will be undefined if not found
}

extendWithGettersAndSetters(Html.prototype, {
    contentType: 'text/html',

    defaultExtension: '.html',

    alternativeExtensions: ['.template', '.php', '.xhtml'],

    isPretty: false,

    get encoding() {
        if (!this._encoding) {
            // An explicit encoding (Content-Type header, data: url charset, assetConfig) takes precedence, but if absent we should
            // look for a <meta http-equiv='Content-Type' ...> tag with a charset before falling back to the defaultEncoding (utf-8)
            if ('_text' in this) {
                this._encoding = extractEncodingFromText(this._text) || this.defaultEncoding;
            } else if (this._rawSrc) {
                this._encoding = extractEncodingFromText(this._rawSrc.toString('binary', 0, Math.min(1024, this._rawSrc.length))) || this.defaultEncoding;
            } else {
                this._encoding = this.defaultEncoding;
            }
        }
        return this._encoding;
    },

    set encoding(encoding) {
        if (encoding !== this.encoding) {
            var text = this.text; // Make sure this._text exists so the rawSrc is decoded before the original encoding is thrown away
            delete this._rawSrc;
            this._encoding = encoding;
            this.markDirty();
            // Update/inject a <meta http-equiv="Content-Type"> tag?
        }
    },

    get text() {
        if (!('_text' in this)) {
            if (this._parseTree) {
                this._text = (this._parseTree.doctype ? this._parseTree.doctype + "\n" : "") + domtohtml.domToHtml(this._parseTree, !this.isPretty);
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    set text(text) {
        this._text = text;
        delete this._rawSrc;
        delete this._parseTree;
        this.markDirty();
    },

    get parseTree() {
        if (!this._parseTree) {
            this._parseTree = jsdom.jsdom(this.text, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}});
            // Jsdom (or its Html parser) doesn't strip the newline after the <!DOCTYPE> for some reason.
            // Issue reported here: https://github.com/tmpvar/jsdom/issues/160
            if (this._parseTree.firstChild && this._parseTree.firstChild.nodeName === '#text' && this._parseTree.firstChild.nodeValue === "\n") {
                this._parseTree.removeChild(this._parseTree.firstChild);
            }
        }
        return this._parseTree;
    },

    set parseTree(parseTree) {
        this._parseTree = parseTree;
        delete this._rawSrc;
        delete this._text;
        this.markDirty();
    },

    get outgoingRelations() {
        if (!this._outgoingRelations) {
            this._outgoingRelations = [];
            if (this.parseTree.documentElement && this.parseTree.documentElement.hasAttribute('manifest')) {
                this._outgoingRelations.push(new relations.HtmlCacheManifest({
                    from: this,
                    to: {
                        url: this.parseTree.documentElement.getAttribute('manifest')
                    },
                    node: this.parseTree.documentElement
                }));
            }
            var queue = [this.parseTree];
            while (queue.length) {
                var node = queue.shift();
                if (node.childNodes) {
                    for (var i = node.childNodes.length - 1 ; i >= 0 ; i -= 1) {
                        queue.unshift(node.childNodes[i]);
                    }
                }
                if (node.nodeType === node.ELEMENT_NODE) {
                    var nodeName = node.nodeName.toLowerCase();
                    if (nodeName === 'script') {
                        if (node.hasAttribute('src')) {
                            this._outgoingRelations.push(new relations.HtmlScript({
                                from: this,
                                to: {
                                    url: node.getAttribute('src')
                                },
                                node: node
                            }));
                        } else {
                            this._outgoingRelations.push(new relations.HtmlScript({
                                from: this,
                                to: {
                                    type: node.getAttribute('type') === 'text/coffeescript' ? 'CoffeeScript' : 'JavaScript',
                                    isResolved: true,
                                    text: node.firstChild ? node.firstChild.nodeValue : ''
                                },
                                node: node
                            }));
                        }
                    } else if (nodeName === 'style') {
                        this._outgoingRelations.push(new relations.HtmlStyle({
                            from: this,
                            to: {
                                type: 'Css',
                                isResolved: true,
                                text: node.firstChild ? node.firstChild.nodeValue : ''
                            },
                            node: node
                        }));
                    } else if (nodeName === 'link') {
                        if (node.hasAttribute('rel')) {
                            var rel = node.getAttribute('rel').toLowerCase();
                            if (rel === 'stylesheet') {
                                this._outgoingRelations.push(new relations.HtmlStyle({
                                    from: this,
                                    to: {
                                        url: node.getAttribute('href')
                                    },
                                    node: node
                                }));
                            } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                                this._outgoingRelations.push(new relations.HtmlShortcutIcon({
                                    from: this,
                                    to: {
                                        url: node.getAttribute('href')
                                    },
                                    node: node
                                }));
                            } else if (rel === 'alternate') {
                                this._outgoingRelations.push(new relations.HtmlAlternateLink({
                                    from: this,
                                    to: {
                                        url: node.getAttribute('href'),
                                        contentType: node.getAttribute('type')
                                    },
                                    node: node
                                }));
                            }
                        }
                    } else if (nodeName === 'img') {
                        this._outgoingRelations.push(new relations.HtmlImage({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node: node
                        }));
                    } else if (nodeName === 'a') {
                        var href = node.getAttribute('href');
                        if (!/^mailto:|^\s*$|^#/.test(href)) {
                            this._outgoingRelations.push(new relations.HtmlAnchor({
                                from: this,
                                to: {
                                    url: href
                                },
                                node: node
                            }));
                        }
                    } else if (nodeName === 'iframe') {
                        this._outgoingRelations.push(new relations.HtmlIFrame({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node: node
                        }));
                    } else if (nodeName === 'frame') {
                        this._outgoingRelations.push(new relations.HtmlFrame({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node: node
                        }));
                    } else if (nodeName === 'esi:include') {
                        this._outgoingRelations.push(new relations.HtmlEdgeSideInclude({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node: node
                        }));
                    } else if (nodeName === 'video') {
                        if (node.hasAttribute('src')) {
                            this._outgoingRelations.push(new relations[nodeName === 'video' ? 'HtmlVideo' : 'HtmlAudio']({
                                from: this,
                                to: {
                                    url: node.getAttribute('src')
                                },
                                node: node
                            }));
                        }
                        if (node.hasAttribute('poster')) {
                            this._outgoingRelations.push(new relations.HtmlVideoPoster({
                                from: this,
                                to: {
                                    url: node.getAttribute('poster')
                                },
                                node: node
                            }));
                        }
                    } else if (nodeName === 'audio' && node.hasAttribute('src')) {
                        this._outgoingRelations.push(new relations.HtmlAudio({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node: node
                        }));
                    } else if (/^(?:source|track)$/.test(nodeName) && node.parentNode && /^(?:video|audio)$/i.test(node.parentNode.nodeName)) {
                        this._outgoingRelations.push(new relations[node.parentNode.nodeName.toLowerCase() === 'video' ? 'HtmlVideo' : 'HtmlAudio']({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node: node
                        }));
                    } else if (nodeName === 'object' && node.hasAttribute('data')) {
                        this._outgoingRelations.push(new relations.HtmlObject({
                            from: this,
                            to: {
                                url: node.getAttribute('data')
                            },
                            node: node,
                            attributeName: 'data'
                        }));
                    } else if (nodeName === 'param' && /^(?:src|movie)$/i.test(node.getAttribute('name')) && node.parentNode && node.parentNode.nodeName.toLowerCase() === 'object') {
                        this._outgoingRelations.push(new relations.HtmlObject({
                            from: this,
                            to: {
                                url: node.getAttribute('value')
                            },
                            node: node,
                            attributeName: 'value'
                        }));
                    } else if (nodeName === 'applet') {
                        ['archive', 'codebase'].forEach(function (attributeName) {
                            // Note: Only supports one url in the archive attribute. The Html 4.01 spec says it can be a comma-separated list.
                            if (node.hasAttribute(attributeName)) {
                                this._outgoingRelations.push(new relations.HtmlApplet({
                                    from: this,
                                    to: {
                                        url: node.getAttribute(attributeName)
                                    },
                                    node: node,
                                    attributeName: attributeName
                                }));
                            }
                        });
                    } else if (nodeName === 'embed') {
                        this._outgoingRelations.push(new relations.HtmlEmbed({
                            from: this,
                            to: {
                                url: node.getAttribute('src')
                            },
                            node: node
                        }));
                    }
                } else if (node.nodeType === node.COMMENT_NODE) {
                    var matchConditionalComment = node.nodeValue.match(/^\[(if[^\]]*)\]\>([\s\S]*)<!\[endif\]$/);
                    if (matchConditionalComment) {
                        this._outgoingRelations.push(new relations.HtmlConditionalComment({
                            from: this,
                            to: {
                                type: 'Html',
                                isResolved: true,
                                text: matchConditionalComment[2]
                            },
                            node: node,
                            condition: matchConditionalComment[1]
                        }));
                    }
                }
            }
        }
        return this._outgoingRelations;
    },

    _reformatParseTree: function (removeWhiteSpaceNodes, removeComments) {
        var q = [this.parseTree];
        while (q.length) {
            var node = q.shift();
            // Non-conditional comment or whitespace-only text node?
            if ((removeComments && node.nodeType === 8 && !/^#|^\[if|^<!\[endif\]/.test(node.nodeValue)) || (removeWhiteSpaceNodes && node.nodeType === 3 && /^[\r\n\s\t]*$/.test(node.nodeValue))) {
                node.parentNode.removeChild(node);
            } else {
                if (node.nodeName && node.nodeName.toLowerCase() !== 'script') {
                    // Using node._childNodes instead of nodes.childNodes because of this issue:
                    // https://github.com/tmpvar/jsdom/issues/171
                    for (var i = 0 ; i < node._childNodes.length ; i += 1) {
                        q.push(node._childNodes[i]);
                    }
                }
            }
        }
    },

    minify: function () {
        this._reformatParseTree(true, true);
        this.isPretty = false;
        this.markDirty();
    },

    prettyPrint: function () {
        this._reformatParseTree(true, false);
        this.isPretty = true;
        this.markDirty();
    },

    // FIXME: Create superclass for Html* relations and put this method there?
    _attachNode: function (node, position, adjacentNode) {
        if (position !== 'before' && position !== 'after') {
            throw new Error("assets.Html._attachNode: The 'position' parameter must be either 'before' or 'after'");
        }
        var parentNode = adjacentNode.parentNode;
        if (!parentNode) {
            throw new Error("assets.Html._attachNode: Adjacent node has no parentNode.");
        }
        if (position === 'after') {
            parentNode.insertBefore(node, adjacentNode.nextSibling);
        } else {
            parentNode.insertBefore(node, adjacentNode);
        }
    }
});

module.exports = Html;
