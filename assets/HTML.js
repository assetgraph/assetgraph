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
        var that = this;
        this.getSrc(error.passToFunction(cb, function (src) {
            that.parseTree = jsdom.jsdom(src, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}});
            cb(null, that.parseTree);
        }));
    }),

    getPointers: makeBufferedAccessor('pointers', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var pointers = {};
            function addPointer(config) {
                config.asset = that;
                (pointers[config.type] = pointers[config.type] || []).push(config);
            }

            _.toArray(parseTree.getElementsByTagName('*')).forEach(function (tag) {
                var tagName = tag.nodeName.toLowerCase();
                if (tagName === 'script') {
                    if (tag.src) {
                        addPointer({
                            type: 'htmlScript',
                            tag: tag,
                            assetConfig: {
                                url: tag.src
                            }
                        });
                    } else {
                        addPointer({
                            type: 'htmlScript',
                            tag: tag,
                            assetConfig: {
                                type: 'JavaScript',
                                src: tag.firstChild.nodeValue
                            }
                        });
                    }
                } else if (tagName === 'style') {
                    addPointer({
                        type: 'htmlStyle',
                        tag: tag,
                        assetConfig: {
                            type: 'CSS',
                            src: tag.firstChild.nodeValue
                        }
                    });
                } else if (tagName === 'link') {
                    if ('rel' in tag) {
                        var rel = tag.rel.toLowerCase();
                        if (rel === 'stylesheet') {
                            addPointer({
                                type: 'htmlStyle',
                                tag: tag,
                                assetConfig: {
                                    url: tag.href
                                }
                           });
                        } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                            addPointer({
                                type: 'htmlShortcutIcon',
                                tag: tag,
                                assetConfig: {
                                    url: tag.href
                                }
                            });
                        }
                    }
                } else if (tagName === 'img') {
                    addPointer({
                        type: 'htmlImage',
                        tag: tag,
                        assetConfig: {
                            url: tag.src
                        }
                    });
                } else if (tagName === 'iframe') {
                    addPointer({
                        type: 'htmlIframe',
                        tag: tag,
                        assetConfig: {
                            url: tag.src
                        }
                    });
                }
            }, this);
            cb(null, pointers);
        }));
    })
});
