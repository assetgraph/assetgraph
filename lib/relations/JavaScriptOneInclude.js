/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function JavaScriptOneInclude(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptOneInclude, Base);

extendWithGettersAndSetters(JavaScriptOneInclude.prototype, {
    get href() {
        return this.node[2][0][1];
    },

    set href(href) {
        this.node[2][0][1] = href;
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
