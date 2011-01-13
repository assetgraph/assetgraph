var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom'),
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor'),
    relations = require('../relations'),
    Base = require('./Base').Base;

function HTML(config) {
    Base.call(this, config);
}

util.inherits(HTML, Base);

_.extend(HTML.prototype, {
    getParseTree: makeBufferedAccessor('parseTree', function (cb) {
        var that = this;
        this.getSrc(error.passToFunction(cb, function (src) {
            that.parseTree = jsdom.jsdom(src, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}});
            cb(null, that.parseTree);
        }));
    }),

    getOriginalRelations: makeBufferedAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var originalRelations = [];
            _.toArray(parseTree.getElementsByTagName('*')).forEach(function (tag) {
                var tagName = tag.nodeName.toLowerCase();
                if (tagName === 'script') {
                    if (tag.src) {
                        originalRelations.push(new relations.HTMLScript({
                            from: that,
                            tag: tag,
                            assetConfig: {
                                url: tag.src
                            }
                        }));
                    } else {
                        originalRelations.push(new relations.HTMLScript({
                            from: that,
                            tag: tag,
                            assetConfig: {
                                type: 'JavaScript',
                                src: tag.firstChild.nodeValue
                            }
                        }));
                    }
                } else if (tagName === 'style') {
                    originalRelations.push(new relations.HTMLStyle({
                        from: that,
                        tag: tag,
                        assetConfig: {
                            type: 'CSS',
                            src: tag.firstChild.nodeValue
                        }
                    }));
                } else if (tagName === 'link') {
                    if ('rel' in tag) {
                        var rel = tag.rel.toLowerCase();
                        if (rel === 'stylesheet') {
                            originalRelations.push(new relations.HTMLStyle({
                                from: that,
                                tag: tag,
                                assetConfig: {
                                    url: tag.href
                                }
                           }));
                        } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                            originalRelations.push(new relations.HTMLShortcutIcon({
                                from: that,
                                tag: tag,
                                assetConfig: {
                                    url: tag.href
                                }
                            }));
                        }
                    }
                } else if (tagName === 'img') {
                    originalRelations.push(new relations.HTMLImage({
                        from: that,
                        tag: tag,
                        assetConfig: {
                            url: tag.src
                        }
                    }));
                } else if (tagName === 'iframe') {
                    originalRelations.push(new relations.HTMLIFrame({
                        from: that,
                        tag: tag,
                        assetConfig: {
                            url: tag.src
                        }
                    }));
                }
            }, this);
            cb(null, originalRelations);
        }));
    })
});

exports.HTML = HTML;
