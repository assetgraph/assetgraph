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
        this.stack.splice(this.stack.indexOf(this.node), 1);
        delete this.node;
        delete this.stack;
    },

    setUrl: function (url) {
        this.node[1][2][0][1] = url;
    },

    addRelationAfter: function (assetConfig) {
        var parentNode = this.stack[this.stack.length-1],
            newRelation = new this.constructor({
                assetConfig: assetConfig,
                from: this.from,
                node: [
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
                                assetConfig.url || '[inline]' // Ehh..
                            ]
                        ]
                    ]
                ],
                stack: [].concat(this.stack)
            });
        parentNode.splice(parentNode.indexOf(this.node), 0, newRelation.node);
        this.from.relations.splice(this.from.relations.indexOf(this), 0, newRelation);
        return newRelation;
    }
});

exports.JavaScriptStaticInclude = JavaScriptStaticInclude;
