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

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            cb(null, jsdom.jsdom(src, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}}));
        }));
    }),

    minify: function (cb) {
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var q = [parseTree];
            while (q.length) {
                var element = q.shift();
                if (element.nodeType === 3) {
                    if (/^[\r\n\s\t]*$/.test(element.nodeValue)) {
                        element.parentNode.removeChild(element);
                    }
                } else {
                    for (var i = 0 ; i < element.childNodes.length ; i += 1) {
                        q.push(element.childNodes[i]);
                    }
                }
            }
            cb();
        }));
    },

    serialize: function (cb) {
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            cb(null, domtohtml.domToHtml(parseTree, true));
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var originalRelations = [];
            if (parseTree.documentElement.hasAttribute('manifest')) {
                originalRelations.push(new relations.HTMLCacheManifest({
                    from: that,
                    node: parseTree.documentElement,
                    to: parseTree.documentElement.getAttribute('manifest')
                }));
            }
            _.toArray(parseTree.getElementsByTagName('*')).forEach(function (node) {
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
            }, this);
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
