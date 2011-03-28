/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    query = require('../query'),
    Base = require('./Base');

function JavaScriptStaticUrl(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptStaticUrl, Base);

_.extend(JavaScriptStaticUrl.prototype, {
    baseAssetQuery: {type: 'HTML', url: query.defined},

    _getRawUrlString: function () {
        return this.originalUrl || this.urlMap.originalUrl;
    },

    _setRawUrlString: function (url) {
        this.urlMap.mapExpandedUrl(this.originalUrl || this.urlMap.originalUrl, url);
        var newNode = [
            'call',
            [
                'dot',
                [
                    'name',
                    'one'
                ],
                'getStaticUrl'
            ],
            [
                this.urlMap.toExpressionAst()
            ]
        ];
        this.urlMap.parentNode.splice(this.urlMap.parentNode.indexOf(this.urlMap.node), 1, newNode);
        this.urlMap.node = newNode;
    }
});

module.exports = JavaScriptStaticUrl;
