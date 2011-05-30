/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function ExtJS4StaticInclude(config) {
    Base.call(this, config);
}

util.inherits(ExtJS4StaticInclude, Base);

_.extend(ExtJS4StaticInclude.prototype, {
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

module.exports = ExtJS4StaticInclude;
