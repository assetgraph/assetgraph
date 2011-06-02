var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom'),
    domtohtml = require('../3rdparty/jsdom/domtohtml'),
    passError = require('../util/passError'),
    memoizeAsyncAccessor = require('../util/memoizeAsyncAccessor'),
    relations = require('../relations'),
    Text = require('./Text');

function HTML(config) {
    Text.call(this, config);
}

util.inherits(HTML, Text);

function extractEncodingFromDecodedSrc(decodedSrc) {
    var metaCharset;
    (decodedSrc.match(/<meta[^>]+>/ig) || []).forEach(function (metaTagString) {
        if (/\bhttp-equiv=([\"\']|)\s*Content-Type\s*\1/i.test(metaTagString)) {
            var matchContent = metaTagString.match(/\bcontent=([\"\']|)\s*text\/html;\s*charset=([\w\-]*)\s*\1/i);
            if (matchContent) {
                metaCharset = matchContent[2];
            }
        }
    });
    return metaCharset; // Will be undefined if not found
}

_.extend(HTML.prototype, {
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
        } else if (that.decodedSrc) {
            process.nextTick(function () {
                cb(null, extractEncodingFromDecodedSrc(that.decodedSrc) || that.defaultEncoding);
            });
        } else if (that.hasRawSrc()) {
            that.getRawSrc(passError(cb, function (rawSrc) {
                cb(null, extractEncodingFromDecodedSrc(rawSrc.toString("binary", 0, Math.min(1024, rawSrc.length))) || that.defaultEncoding);
            }));
        } else {
            process.nextTick(function () {
                cb(null, that.defaultEncoding);
            });
        }
    },

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getDecodedSrc(passError(cb, function (decodedSrc) {
            var parseTree = jsdom.jsdom(decodedSrc, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}});
            // Jsdom (or its HTML parser) doesn't strip the newline after the <!DOCTYPE> for some reason.
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
        that.getParseTree(passError(cb, function (parseTree) {
            // My fork doesn't suffer from the CRLF "bug":
            cb(null, (parseTree.doctype ? parseTree.doctype + "\n" : "") + domtohtml.domToHtml(parseTree, !that.isPretty));

            // var html;
            // if (that.isPretty) {
            //     // domtohtml.formatHTML is hardcoded to use "\r\n" at EOL.
            //     html = domtohtml.domToHtml(parseTree, false).replace(/\r\n/g, "\n");
            // } else {
            //     html = domtohtml.domToHtml(parseTree, true);
            // }
            // cb(null, (parseTree.doctype ? parseTree.doctype + "\n" : "") + html);
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(passError(cb, function (parseTree) {
            var originalRelations = [];
            if (parseTree.documentElement && parseTree.documentElement.hasAttribute('manifest')) {
                originalRelations.push(new relations.HTMLCacheManifest({
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
                            originalRelations.push(new relations.HTMLScript({
                                from: that,
                                to: node.getAttribute('src'),
                                node: node
                            }));
                        } else {
                            originalRelations.push(new relations.HTMLScript({
                                from: that,
                                to: {
                                    type: node.getAttribute('type') === 'text/coffeescript' ? 'CoffeeScript' : 'JavaScript',
                                    isResolved: true,
                                    decodedSrc: node.firstChild.nodeValue
                                },
                                node: node
                            }));
                        }
                    } else if (nodeName === 'style') {
                        originalRelations.push(new relations.HTMLStyle({
                            from: that,
                            to: {
                                type: 'CSS',
                                isResolved: true,
                                decodedSrc: node.firstChild.nodeValue
                            },
                            node: node
                        }));
                    } else if (nodeName === 'link') {
                        if (node.hasAttribute('rel')) {
                            var rel = node.getAttribute('rel').toLowerCase();
                            if (rel === 'stylesheet') {
                                originalRelations.push(new relations.HTMLStyle({
                                    from: that,
                                    to: node.getAttribute('href'),
                                    node: node
                                }));
                            } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                                originalRelations.push(new relations.HTMLShortcutIcon({
                                    from: that,
                                    to: node.getAttribute('href'),
                                    node: node
                                }));
                            } else if (rel === 'alternate') {
                                originalRelations.push(new relations.HTMLAlternateLink({
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
                        originalRelations.push(new relations.HTMLImage({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'a') {
                        var href = node.getAttribute('href');
                        if (!/^mailto:/i.test(href)) {
                            originalRelations.push(new relations.HTMLAnchor({
                                from: that,
                                to: href,
                                node: node
                            }));
                        }
                    } else if (nodeName === 'iframe') {
                        originalRelations.push(new relations.HTMLIFrame({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'frame') {
                        originalRelations.push(new relations.HTMLFrame({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'esi:include') {
                        originalRelations.push(new relations.HTMLEdgeSideInclude({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'video') {
                        if (node.hasAttribute('src')) {
                            originalRelations.push(new relations[nodeName === 'video' ? 'HTMLVideo' : 'HTMLAudio']({
                                from: that,
                                to: node.getAttribute('src'),
                                node: node
                            }));
                        }
                        if (node.hasAttribute('poster')) {
                            originalRelations.push(new relations.HTMLVideoPoster({
                                from: that,
                                to: node.getAttribute('poster'),
                                node: node
                            }));
                        }
                    } else if (nodeName === 'audio' && node.hasAttribute('src')) {
                        originalRelations.push(new relations.HTMLAudio({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (/^(?:source|track)$/.test(nodeName) && node.parentNode && /^(?:video|audio)$/i.test(node.parentNode.nodeName)) {
                        originalRelations.push(new relations[node.parentNode.nodeName.toLowerCase() === 'video' ? 'HTMLVideo' : 'HTMLAudio']({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    } else if (nodeName === 'object' && node.hasAttribute('data')) {
                        originalRelations.push(new relations.HTMLObject({
                            from: that,
                            to: node.getAttribute('data'),
                            node: node,
                            attributeName: 'data'
                        }));
                    } else if (nodeName === 'param' && /^(?:src|movie)$/i.test(node.getAttribute('name')) && node.parentNode && node.parentNode.nodeName.toLowerCase() === 'object') {
                        originalRelations.push(new relations.HTMLObject({
                            from: that,
                            to: node.getAttribute('value'),
                            node: node,
                            attributeName: 'value'
                        }));
                    } else if (nodeName === 'applet') {
                        ['archive', 'codebase'].forEach(function (attributeName) {
                            // Note: Only supports one url in the archive attribute. The HTML 4.01 spec says it can be a comma-separated list.
                            if (node.hasAttribute(attributeName)) {
                                originalRelations.push(new relations.HTMLApplet({
                                    from: that,
                                    to: node.getAttribute(attributeName),
                                    node: node,
                                    attributeName: attributeName
                                }));
                            }
                        });
                    } else if (nodeName === 'embed') {
                        originalRelations.push(new relations.HTMLEmbed({
                            from: that,
                            to: node.getAttribute('src'),
                            node: node
                        }));
                    }
                } else if (node.nodeType === 8) { // Comment
                    var matchConditionalComment = node.nodeValue.match(/^\[(if[^\]]*)\]\>([\s\S]*)<!\[endif\]$/);
                    if (matchConditionalComment) {
                        originalRelations.push(new relations.HTMLConditionalComment({
                            from: that,
                            to: {
                                type: 'HTML',
                                isResolved: true,
                                decodedSrc: matchConditionalComment[2]
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
            if (relation.type === 'HTMLStyle') {
                document.head.appendChild(relation.node);
            } else if (relation.type === 'HTMLScript') {
                var existingScriptNodes = document.getElementsByTagName('script');
                if (existingScriptNodes.length > 0) {
                    existingScriptNodes[0].parentNode.insertBefore(relation.node, existingScriptNodes[0]);
                } else if (document.body) {
                    document.body.insertBefore(relation.node, document.body.firstChild);
                } else {
                    document.head.appendChild(relation.node);
                }
            } else if (relation.type === 'HTMLCacheManifest') {
                // Already attached to <html> as a result of relation.createNode above
            } else {
                throw "HTML.attachRelation: position=first only supported for HTMLStyle, HTMLScript, and HTMLCacheManifest relations";
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

module.exports = HTML;
