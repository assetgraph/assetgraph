var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom'),
    domtohtml = require('jsdom/lib/jsdom/browser/domtohtml'),
    passError = require('../util/passError'),
    memoizeAsyncAccessor = require('../util/memoizeAsyncAccessor'),
    relations = require('../relations'),
    Base = require('./Base'),
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

_.extend(Html.prototype, {
    contentType: 'text/html',

    defaultExtension: '.html',

    alternativeExtensions: ['.template', '.php', '.xhtml'],

    isPretty: false,

    getOriginalEncoding: function (cb) {
        var that = this;
        // An explicit encoding (Content-Type header, data: url charset, assetConfig) takes precedence, but if absent we should
        // look for a <meta http-equiv='Content-Type' ...> tag with a charset before falling back to the defaultEncoding (utf-8)
        if (that.originalEncoding) {
            return process.nextTick(function () {
                cb(null, that.originalEncoding);
            });
        } else if (that.text) {
            process.nextTick(function () {
                cb(null, extractEncodingFromText(that.text) || that.defaultEncoding);
            });
        } else if (that.hasRawSrc()) {
            Base.prototype.getRawSrc.call(that, passError(cb, function (rawSrc) {
                cb(null, extractEncodingFromText(rawSrc.toString("binary", 0, Math.min(1024, rawSrc.length))) || that.defaultEncoding);
            }));
        } else {
            process.nextTick(function () {
                cb(null, that.defaultEncoding);
            });
        }
    },

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getText(passError(cb, function (text) {
            var parseTree = jsdom.jsdom(text, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}});
            // Jsdom (or its Html parser) doesn't strip the newline after the <!DOCTYPE> for some reason.
            // Issue reported here: https://github.com/tmpvar/jsdom/issues/160
            if (parseTree.firstChild && parseTree.firstChild.nodeName === '#text' && parseTree.firstChild.nodeValue === "\n") {
                parseTree.removeChild(parseTree.firstChild);
            }
            cb(null, parseTree);
        }));
    }),

    _reformatParseTree: function (removeWhiteSpaceNodes, removeComments, cb) {
        var that = this;
        that.getParseTree(passError(cb, function (parseTree) {
            var q = [parseTree];
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
            cb();
        }));
    },

    minify: function (cb) {
        var that = this;
        that._reformatParseTree(true, true, passError(cb, function () {
            that.isPretty = false;
            that.markDirty();
            cb();
        }));
    },

    prettyPrint: function (cb) {
        var that = this;
        that._reformatParseTree(true, false, passError(cb, function () {
            that.isPretty = true;
            cb();
        }));
    },

    getText: function (cb) {
        var that = this;
        process.nextTick(function () {
            if ('parseTree' in that) {
                cb(null, (that.parseTree.doctype ? that.parseTree.doctype + "\n" : "") + domtohtml.domToHtml(that.parseTree, !that.isPretty));
            } else {
                Text.prototype.getText.call(that, cb);
            }
        });
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(passError(cb, function (parseTree) {
            var originalRelations = [];
            if (parseTree.documentElement && parseTree.documentElement.hasAttribute('manifest')) {
                originalRelations.push(new relations.HtmlCacheManifest({
                    from: that,
                    to: parseTree.documentElement.getAttribute('manifest'),
                    node: parseTree.documentElement
                }));
            }
            var queue = [parseTree];
            while (queue.length) {
                var node = queue.shift();
                if (node.childNodes) {
                    for (var i = node.childNodes.length - 1 ; i >= 0 ; i -= 1) {
                        queue.unshift(node.childNodes[i]);
                    }
                }
                if (node.nodeType === 1) { // Element
                    var nodeName = node.nodeName.toLowerCase();
                    if (nodeName === 'script') {
                        if (node.hasAttribute('src')) {
                            originalRelations.push(new relations.HtmlScript({
                                from: that,
                                to: node.getAttribute('src'),
                                node: node
                            }));
                        } else {
                            originalRelations.push(new relations.HtmlScript({
                                from: that,
                                to: {
                                    type: node.getAttribute('type') === 'text/coffeescript' ? 'CoffeeScript' : 'JavaScript',
                                    isResolved: true,
                                    text: node.firstChild ? node.firstChild.nodeValue : ''
                                },
                                node: node
                            }));
                        }
                    } else if (nodeName === 'style') {
                        originalRelations.push(new relations.HtmlStyle({
                            from: that,
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
                                originalRelations.push(new relations.HtmlStyle({
                                    from: that,
                                    to: node.getAttribute('href'),
                                    node: node
                                }));
                            } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                                originalRelations.push(new relations.HtmlShortcutIcon({
                                    from: that,
                                    to: node.getAttribute('href'),
                                    node: node
                                }));
                            } else if (rel === 'alternate') {
                                originalRelations.push(new relations.HtmlAlternateLink({
                                    from: that,
                                    to: {
                                        url: node.getAttribute('href'),
                                        contentType: node.getAttribute('type')
                                    },
                                    node: node
                                }));
                            }
                        }
                    } else if (nodeName === 'img') {
                        originalRelations.push(new relations.HtmlImage({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'a') {
                        var href = node.getAttribute('href');
                        if (!/^mailto:/i.test(href) && !/^#/.test(href)) {
                            originalRelations.push(new relations.HtmlAnchor({
                                from: that,
                                to: href,
                                node: node
                            }));
                        }
                    } else if (nodeName === 'iframe') {
                        originalRelations.push(new relations.HtmlIFrame({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'frame') {
                        originalRelations.push(new relations.HtmlFrame({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'esi:include') {
                        originalRelations.push(new relations.HtmlEdgeSideInclude({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'video') {
                        if (node.hasAttribute('src')) {
                            originalRelations.push(new relations[nodeName === 'video' ? 'HtmlVideo' : 'HtmlAudio']({
                                from: that,
                                to: node.getAttribute('src'),
                                node: node
                            }));
                        }
                        if (node.hasAttribute('poster')) {
                            originalRelations.push(new relations.HtmlVideoPoster({
                                from: that,
                                to: node.getAttribute('poster'),
                                node: node
                            }));
                        }
                    } else if (nodeName === 'audio' && node.hasAttribute('src')) {
                        originalRelations.push(new relations.HtmlAudio({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (/^(?:source|track)$/.test(nodeName) && node.parentNode && /^(?:video|audio)$/i.test(node.parentNode.nodeName)) {
                        originalRelations.push(new relations[node.parentNode.nodeName.toLowerCase() === 'video' ? 'HtmlVideo' : 'HtmlAudio']({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'object' && node.hasAttribute('data')) {
                        originalRelations.push(new relations.HtmlObject({
                            from: that,
                            to: node.getAttribute('data'),
                            node: node,
                            attributeName: 'data'
                        }));
                    } else if (nodeName === 'param' && /^(?:src|movie)$/i.test(node.getAttribute('name')) && node.parentNode && node.parentNode.nodeName.toLowerCase() === 'object') {
                        originalRelations.push(new relations.HtmlObject({
                            from: that,
                            to: node.getAttribute('value'),
                            node: node,
                            attributeName: 'value'
                        }));
                    } else if (nodeName === 'applet') {
                        ['archive', 'codebase'].forEach(function (attributeName) {
                            // Note: Only supports one url in the archive attribute. The Html 4.01 spec says it can be a comma-separated list.
                            if (node.hasAttribute(attributeName)) {
                                originalRelations.push(new relations.HtmlApplet({
                                    from: that,
                                    to: node.getAttribute(attributeName),
                                    node: node,
                                    attributeName: attributeName
                                }));
                            }
                        });
                    } else if (nodeName === 'embed') {
                        originalRelations.push(new relations.HtmlEmbed({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    }
                } else if (node.nodeType === 8) { // Comment
                    var matchConditionalComment = node.nodeValue.match(/^\[(if[^\]]*)\]\>([\s\S]*)<!\[endif\]$/);
                    if (matchConditionalComment) {
                        originalRelations.push(new relations.HtmlConditionalComment({
                            from: that,
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
            cb(null, originalRelations);
        }));
    }),

    attachRelation: function (relation, position, adjacentRelation) {
        var document = this.parseTree;
        position = position || 'first';
        relation.from = this;
        relation.node = relation.createNode(document);

        if (position === 'first') {
            if (relation.type === 'HtmlStyle') {
                document.head.appendChild(relation.node);
            } else if (relation.type === 'HtmlScript') {
                var existingScriptNodes = document.getElementsByTagName('script');
                if (existingScriptNodes.length > 0) {
                    existingScriptNodes[0].parentNode.insertBefore(relation.node, existingScriptNodes[0]);
                } else if (document.body) {
                    document.body.insertBefore(relation.node, document.body.firstChild);
                } else {
                    document.head.appendChild(relation.node);
                }
            } else if (relation.type === 'HtmlCacheManifest') {
                // Already attached to <html> as a result of relation.createNode above
            } else {
                throw "Html.attachRelation: position=first only supported for HtmlStyle, HtmlScript, and HtmlCacheManifest relations";
            }
        } else { // 'before' or 'after'
            var parentNode = adjacentRelation.node.parentNode;
            if (position === 'after') {
                parentNode.insertBefore(relation.node, adjacentRelation.node.nextSibling);
            } else {
                parentNode.insertBefore(relation.node, adjacentRelation.node);
            }
        }
    },

    detachRelation: function (relation) {
        relation.node.parentNode.removeChild(relation.node);
        delete relation.node;
    }
});

module.exports = Html;
