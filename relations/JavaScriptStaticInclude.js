/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function JavaScriptStaticInclude(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptStaticInclude, Base);

_.extend(JavaScriptStaticInclude.prototype, {
    remove: function () {
        this.parentNode.splice(this.parentNode.indexOf(this.node), 1);
        delete this.node;
        delete this.parentNode;
    },

    setUrl: function (url) {
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

exports.JavaScriptStaticInclude = JavaScriptStaticInclude;
