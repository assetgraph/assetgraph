var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom').jsdom,
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor'),
    Base = require('./Base');

var HTML = module.exports = function (config) {
    Base.call(this, config);
};

util.inherits(HTML, Base);

_.extend(HTML.prototype, {
    getParseTree: makeBufferedAccessor('parseTree', function (cb) {
        var This = this;
        this.getSrc(error.passToFunction(cb, function (src) {
            This.parseTree = jsdom(src);
            cb(null, This.parseTree);
        }));
    }),

    getRelations: makeBufferedAccessor('relations', function (cb) {
        var This = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var relations = {};
            function addRelation(config) {
                (relations[config.type] = relations[config.type] || []).push(config);
            }

            _.toArray(parseTree.getElementsByTagName('*')).forEach(function (tag) {
                var tagName = tag.nodeName.toLowerCase();
                if (tagName === 'script') {
                    if (tag.src) {
                        addRelation({
                            type: 'html-script-tag',
                            baseUrl: This.baseUrlForRelations,
                            url: script.src,
                            tag: tag
                        });
                    } else {
                        addRelation({
                            type: 'html-script-tag',
                            baseUrl: This.baseUrlForRelations,
                            inlineData: tag.firstChild.nodeValue,
                            tag: tag
                        });
                    }
                } else if (tagName === 'style') {
                    addRelation({
                        type: 'html-style-tag',
                        baseUrl: This.baseUrlForRelations,
                        inlineData: tag.firstChild.nodeValue,
                        tag: tag
                    });
                } else if (tagName === 'link') {
                    if ('rel' in tag) {
                        var rel = tag.rel.toLowerCase();
                        if (rel === 'stylesheet') {
                            addRelation({
                                type: 'html-style-tag',
                                baseUrl: This.baseUrlForRelations,
                                url: tag.href,
                                tag: tag
                            });
                        } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                            addRelation({
                                type: 'html-shortcut-icon',
                                baseUrl: This.baseUrlForRelations,
                                url: tag.href,
                                tag: tag
                            });
                        }
                    }
                } else if (tagName === 'img') {
                    addRelation({
                        type: 'html-image-tag',
                        baseUrl: This.baseUrlForRelations,
                        url: tag.src,
                        tag: tag
                    });
                } else if (tagName === 'iframe') {
                    addRelation({
                        type: 'html-iframe-tag',
                        baseUrl: This.baseUrlForRelations,
                        url: tag.src,
                        tag: tag
                    });
                }
            }, this);
            cb(null, relations);
        }));
    })
});
