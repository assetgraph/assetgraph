/*global module, require*/
var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify'),
    Base = require('./Base');

var JavaScript = module.exports = function (config) {
    Base.call(this, config);
    this.parseTree = uglify.parser.parse(this.src);
    var addRelation = function (relation) {
        relation.includingAsset = this;
        (this.relations[relation.type] = this.relations[relation.type] || []).push(relation);
    }.bind(this);

    var walk = function (node) {
        if (node[0] === 'call' && Array.isArray(node[1]) && node[1][0] === 'dot' &&
            Array.isArray(node[1][1]) && node[1][1][0] === 'name' && node[1][1][1] === 'one') {
            if (/^(?:lazyInlude|include)$/.test(node[1][2])) {
                if (Array.isArray(node[2]) && node[2].length === 1 &&
                    Array.isArray(node[2][0]) && node[2][0][0] === 'string') {
                    addRelation({
                        type: node[1][2] === 'include' ? 'js-static-include' : 'js-lazy-include',
                        baseUrl: this.baseUrlForRelations,
                        url: node[2][0][1],
                        node: node
                    });
                } else {
                    throw new Error("Invalid one.include syntax");
                }
            } else if (node[1][2] === 'getStaticUrl') {
                if (Array.isArray(node[2]) && node[2].length === 1 &&
                    Array.isArray(node[2][0]) && node[2][0][0] === 'string') {

                    addRelation({
                        type: 'js-static-url',
                        baseUrl: this.baseUrlForRelations,
                        url: node[2][1],
                        node: node
                    });
                } else {
                    throw new Error("Invalid one.getStaticUrl syntax");
                }
            }
        }

        for (var i=1 ; i<node.length ; i++) {
            if (Array.isArray(node[i])) {
                walk(node[i]);
            }
        }
    }.bind(this);
    walk(this.parseTree);
}

util.inherits(JavaScript, Base);
