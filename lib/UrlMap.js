var _ = require('underscore'),
    uglify = require('uglify-js');

// Requires: config.originalUrl (possibly containing wildcards)
function UrlMap(config) {
    _.extend(this, config);
    this.expandedUrls = [];
    this.expandedUrlMapping = {};
}

UrlMap.prototype = {
    addExpandedUrl: function (expandedUrl) {
        this.expandedUrls.push(expandedUrl);
    },

    removeExpandedUrl: function (expandedUrl) {
        this.expandedUrls.splice(this.expandedUrls.indexOf(expandedUrl));
        delete this.expandedUrlMapping[expandedUrl];
    },

    mapExpandedUrl: function (expandedUrl, targetUrl) {
        this.expandedUrlMapping[expandedUrl] = targetUrl;
    },

    toExpressionAst: function () {
        if (this.wildCardValueAsts.length === 0) {
            return ['string', this.originalUrl];
        } else {
            var wildCardLookupStructure = {},
                originalUrlRegExp = new RegExp("^" + this.originalUrl.replace(/\./g, "\\.").replace(/\*/g, "([^\/]+)") + "$");
            this.expandedUrls.forEach(function (expandedUrl) {
                var wildCardValues = expandedUrl.match(originalUrlRegExp).slice(1),
                    cursor = wildCardLookupStructure;
                wildCardValues.forEach(function (wildCardValue, i) {
                    if (i === wildCardValues.length - 1) {
                        cursor[wildCardValue] = this.expandedUrlMapping[expandedUrl] || expandedUrl;
                    } else {
                        if (!(wildCardValue in cursor)) {
                            cursor[wildCardValue] = {};
                        }
                        cursor = cursor[wildCardValue];
                    }
                }, this);
            }, this);
            var expressionAst = uglify.parser.parse("(" + JSON.stringify(wildCardLookupStructure) + ")")[1][0][1]; // Strip 'toplevel' and 'stat' nodes
            this.wildCardValueAsts.forEach(function (wildCardValueAst) {
                expressionAst = ['sub', expressionAst, wildCardValueAst];
            });
            return expressionAst;
        }
    }
};

module.exports = UrlMap;
