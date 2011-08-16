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
        return this.node[1][2][0][1];
    },

    set href(href) {
        this.node[1][2][0][1] = href;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = [
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
        if (position === 'before' || position === 'after') {
            var adjacentNode = adjacentRelation.node,
                i = this.from.parseTree[1].indexOf(adjacentRelation.node);
            if (i === -1) {
                throw new Error("relations.JavaScriptOneInclude.attach: adjacentRelation.node not found");
            }
            this.from.parseTree[1].splice(i + (position === 'after' ? 1 : 0), 0, this.node);
        } else if (position === 'first') {
            this.from.parseTree[1].unshift(this.node);
        } else if (position === 'last') {
            this.from.parseTree[1].push(this.node);
        } else {
            throw new Error("relations.JavaScriptOneInclude.attach: Unsupported 'position' value: " + position);
        }
        Base.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        var parentNodeIndex = this.from.parseTree[1].indexOf(this.node);
        if (parentNodeIndex === -1) {
            throw new Error("relations.JavaScriptOneInclude.detach: JavaScriptOneInclude.parentNode not an element of .parentParentNode");
        }
        this.from.parseTree[1].splice(parentNodeIndex, 1);
        Base.prototype.detach.call(this);
    }
});

module.exports = JavaScriptOneInclude;
