var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom'),
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
            This.parseTree = jsdom.jsdom(src, undefined, {features: {ProcessExternalResources: []}});
            cb(null, This.parseTree);
        }));
    }),

    getPointers: makeBufferedAccessor('pointers', function (cb) {
        var This = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var pointers = {};
            function addPointer(config) {
                (pointers[config.type] = pointers[config.type] || []).push(config);
            }

            _.toArray(parseTree.getElementsByTagName('*')).forEach(function (tag) {
                var tagName = tag.nodeName.toLowerCase();
                if (tagName === 'script') {
                    if (tag.src) {
                        addPointer({
                            type: 'html-script-tag',
                            baseUrl: This.baseUrlForPointers,
                            url: script.src,
                            tag: tag
                        });
                    } else {
                        addPointer({
                            type: 'html-script-tag',
                            baseUrl: This.baseUrlForPointers,
                            inlineData: tag.firstChild.nodeValue,
                            tag: tag
                        });
                    }
                } else if (tagName === 'style') {
                    addPointer({
                        type: 'html-style-tag',
                        baseUrl: This.baseUrlForPointers,
                        inlineData: tag.firstChild.nodeValue,
                        tag: tag
                    });
                } else if (tagName === 'link') {
                    if ('rel' in tag) {
                        var rel = tag.rel.toLowerCase();
                        if (rel === 'stylesheet') {
                            addPointer({
                                type: 'html-style-tag',
                                baseUrl: This.baseUrlForPointers,
                                url: tag.href,
                                tag: tag
                            });
                        } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                            addPointer({
                                type: 'html-shortcut-icon',
                                baseUrl: This.baseUrlForPointers,
                                url: tag.href,
                                tag: tag
                            });
                        }
                    }
                } else if (tagName === 'img') {
                    addPointer({
                        type: 'html-image-tag',
                        baseUrl: This.baseUrlForPointers,
                        url: tag.src,
                        tag: tag
                    });
                } else if (tagName === 'iframe') {
                    addPointer({
                        type: 'html-iframe-tag',
                        baseUrl: This.baseUrlForPointers,
                        url: tag.src,
                        tag: tag
                    });
                }
            }, this);
            cb(null, pointers);
        }));
    })
});
