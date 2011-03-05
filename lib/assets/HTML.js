var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom'),
    domtohtml = require('../3rdparty/jsdom/domtohtml'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    relations = require('../relations'),
    Base = require('./Base').Base;

function HTML(config) {
    Base.call(this, config);
}

util.inherits(HTML, Base);

_.extend(HTML.prototype, {
    contentType: 'text/html',

    defaultExtension: 'html',

    alternativeExtensions: ['template', 'php', 'xhtml'],

    isPretty: false,

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            var parseTree = jsdom.jsdom(src, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}});
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
        that.getParseTree(error.passToFunction(cb, function (parseTree) {
            var q = [parseTree];
            while (q.length) {
                var element = q.shift();
                // Non-conditional comment or whitespace-only text node?
                if ((removeComments && element.nodeType === 8 && !/^\[if|^<!\[endif\]/.test(element.nodeValue)) || (removeWhiteSpaceNodes && element.nodeType === 3 && /^[\r\n\s\t]*$/.test(element.nodeValue))) {
                    element.parentNode.removeChild(element);
                } else {
                    if (element.nodeName.toLowerCase() !== 'script') {
                        for (var i = 0 ; i < element.childNodes.length ; i += 1) {
                            q.push(element.childNodes[i]);
                        }
                    }
                }
            }
            cb();
        }));
    },

    minify: function (cb) {
        var that = this;
        that._reformatParseTree(true, true, error.passToFunction(cb, function () {
            that.isPretty = false;
            cb();
        }));
    },

    prettyPrint: function (cb) {
        var that = this;
        that._reformatParseTree(true, false, error.passToFunction(cb, function () {
            that.isPretty = true;
            cb();
        }));
    },

    serialize: function (cb) {
        var that = this;
        that.getParseTree(error.passToFunction(cb, function (parseTree) {
            cb(null, (parseTree.doctype ? parseTree.doctype + "\n" : "") + domtohtml.domToHtml(parseTree, !that.isPretty));
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var originalRelations = [];
            if (parseTree.documentElement && parseTree.documentElement.hasAttribute('manifest')) {
                originalRelations.push(new relations.HTMLCacheManifest({
                    from: that,
                    node: parseTree.documentElement,
                    to: parseTree.documentElement.getAttribute('manifest')
                }));
            }
            var queue = [parseTree];
            while (queue.length) {
                var node = queue.shift();
                if (node.childNodes) {
                    for (var i = 0 ; i < node.childNodes.length ; i += 1) {
                        queue.push(node.childNodes[i]);
                    }
                }
                if (node.nodeType === 1) { // Element
                    var nodeName = node.nodeName.toLowerCase();
                    if (nodeName === 'script') {
                        if (node.src) {
                            originalRelations.push(new relations.HTMLScript({
                                from: that,
                                node: node,
                                to: node.src
                            }));
                        } else {
                            originalRelations.push(new relations.HTMLScript({
                                from: that,
                                node: node,
                                to: {
                                    type: 'JavaScript',
                                    originalSrc: node.firstChild.nodeValue
                                }
                            }));
                        }
                    } else if (nodeName === 'style') {
                        originalRelations.push(new relations.HTMLStyle({
                            from: that,
                            node: node,
                            to: {
                                type: 'CSS',
                                originalSrc: node.firstChild.nodeValue
                            }
                        }));
                    } else if (nodeName === 'link') {
                        if ('rel' in node) {
                            var rel = node.rel.toLowerCase();
                            if (rel === 'stylesheet') {
                                originalRelations.push(new relations.HTMLStyle({
                                    from: that,
                                    node: node,
                                    to: node.href
                                }));
                            } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                                originalRelations.push(new relations.HTMLShortcutIcon({
                                    from: that,
                                    node: node,
                                    to: node.href
                                }));
                            }
                        }
                    } else if (nodeName === 'img') {
                        originalRelations.push(new relations.HTMLImage({
                            from: that,
                            node: node,
                            to: node.src
                        }));
                    } else if (nodeName === 'a') {
                        var href = node.getAttribute('href');
                        if (!/^mailto:/i.test(href)) {
                            originalRelations.push(new relations.HTMLAnchor({
                                from: that,
                                node: node,
                                to: href
                            }));
                        }
                    } else if (nodeName === 'iframe') {
                        originalRelations.push(new relations.HTMLIFrame({
                            from: that,
                            node: node,
                            to: node.src
                        }));
                    }
                } else if (node.nodeType === 8) { // Comment
                    var matchConditionalComment = node.nodeValue.match(/^\[(if[^\]]*)\]\>([\s\S]*)<!\[endif\]$/);
                    if (matchConditionalComment) {
                        originalRelations.push(new relations.HTMLConditionalComment({
                            from: that,
                            to: {
                                type: 'HTML',
                                originalSrc: matchConditionalComment[2]
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
        position = position || 'first';
        _.extend(relation, {
            from: this,
            node: relation.createNode(this.parseTree)
        });

        if (position === 'first') {
            if (relation.type === 'HTMLStyle') {
                this.parseTree.head.appendChild(relation.node);
            } else if (relation.type === 'HTMLCacheManifest') {
                // Already attached to <html> as a result of relation.createNode above
            } else {
                throw "HTML.attachRelation: position=first only supported for HTMLStyle and HTMLCacheManifest relations";
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

exports.HTML = HTML;
