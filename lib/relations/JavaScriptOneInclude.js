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

    attach: function (asset, position, adjacentRelation) {
        this.node = [
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
        if (adjacentRelation) {
            this.parentParentNode = adjacentRelation.parentParentNode;
        } else if (position === 'first' || position === 'last') {
            this.parentParentNode = asset.parseTree[1]; // Top level statements array
        }

        if (position === 'before' || position === 'after') {
            var adjacentNode = adjacentRelation.parentNode,
                i = parentNode.indexOf(adjacentNode);
            if (i === -1) {
                throw new Error("relations.JavaScriptOneInclude.attach: adjacentRelation.parentNode not found");
            }
            parentNode.splice(i + (position === 'after' ? 1 : 0), 0, node);
        } else if (position === 'first') {
            parentNode.unshift(node);
        } else if (position === 'last') {
            parentNode.push(node);
        } else {
            throw new Error("relations.JavaScriptOneInclude.attach: Unsupported 'position' value: " + position);
        }
        Base.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        var parentNodeIndex = this.parentParentNode.indexOf(this.parentNode);
        if (parentNodeIndex === -1) {
            throw new Error("relations.JavaScriptOneInclude.detach: JavaScriptOneInclude.parentNode not an element of .parentParentNode");
        }
        this.parentParentNode.splice(parentNodeIndex, 1);
        delete this.parentParentNode;
        Base.prototype.detach.call(this);
    }
});

module.exports = JavaScriptOneInclude;
