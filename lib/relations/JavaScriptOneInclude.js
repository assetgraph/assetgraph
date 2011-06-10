/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function JavaScriptOneInclude(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptOneInclude, Base);

_.extend(JavaScriptOneInclude.prototype, {
    _getRawUrlString: function () {
        return this.node[2][0][1];
    },

    _setRawUrlString: function (url) {
        this.node[2][0][1] = url;
    },

    createNode: function (asset) {
        return [
            'call',
            [
                'dot',
                [
                    'name',
                    'one'
                ],
                'include'
            ],
            [
                [
                    'string',
                    '<urlGoesHere>'
                ]
            ]
        ];
    }
});

module.exports = JavaScriptOneInclude;
