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
        this.urlMap.node.splice(0, this.urlMap.node.length,
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
                this.urlMap.toExpressionAST()
            ]
        );
    }
});

module.exports = JavaScriptStaticUrl;
