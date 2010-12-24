var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom').jsdom,
    Base = require('./Base');

var HTML = module.exports = function (config) {
    Base.call(this, config);

    this.document = jsdom(this.src);

    // Find all relations

    var addRelation = function (config) {
        (this.relations[config.type] = this.relations[config.type] || []).push(config);
    }.bind(this);

    _.toArray(this.document.getElementsByTagName('*')).forEach(function (tag) {
        var nodeName = tag.nodeName.toLowerCase();
        if (nodeName === 'script') {
            if (tag.src) {
                addRelation({
                    type: 'html-script-tag',
                    baseUrl: this.baseUrlForRelations,
                    url: script.src,
                    tag: tag
                });
            } else {
                addRelation({
                    type: 'html-script-tag',
                    baseUrl: this.baseUrlForRelations,
                    inlineData: tag.firstChild.nodeValue,
                    tag: tag
                });
            }
        } else if (nodeName === 'style') {
            addRelation({
                type: 'html-style-tag',
                baseUrl: this.baseUrlForRelations,
                inlineData: tag.firstChild.nodeValue,
                tag: tag
            });
        } else if (nodeName === 'link') {
            if ('rel' in tag) {
                var rel = tag.rel.toLowerCase();
                if (rel === 'stylesheet') {
                    addRelation({
                        type: 'html-style-tag',
                        baseUrl: this.baseUrlForRelations,
                        url: tag.href,
                        tag: tag
                    });
                } else if (/^(?:shortcut |apple-touch-)?icon$/.test(rel)) {
                    addRelation({
                        type: 'html-shortcut-icon',
                        baseUrl: this.baseUrlForRelations,
                        url: tag.href,
                        tag: tag
                    });
                }
            }
        } else if (nodeName === 'img') {
            addRelation({
                type: 'html-image-tag',
                baseUrl: this.baseUrlForRelations,
                url: tag.src,
                tag: tag
            });
        } else if (nodeName === 'iframe') {
            addRelation({
                type: 'html-iframe-tag',
                baseUrl: this.baseUrlForRelations,
                url: tag.src,
                tag: tag
            });
        }
    }, this);
};

util.inherits(HTML, Base);
