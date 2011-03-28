/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function JavaScriptStaticInclude(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptStaticInclude, Base);

_.extend(JavaScriptStaticInclude.prototype, {
    _getRawUrlString: function () {
        return this.node[1][2][0][1];
    },

    _setRawUrlString: function (url) {
        this.node[1][2][0][1] = url;
    },

    createNode: function (asset) {
        return [
            'stat',
            [
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
            ]
        ];
    }
});

module.exports = JavaScriptStaticInclude;
