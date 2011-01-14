/*global module, require*/
var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    relations = require('./relations'),
    _ = require('underscore'),
    graphviz = require('graphviz'),
    error = require('./error'),
    allIndices = {
        relation: ['id', 'type', 'from', 'to'],
        asset: ['id', 'url', 'type']
    };

var SiteGraph = module.exports = function (config) {
    _.extend(this, config || {});
    this.assets = [];
    this.relations = [];
    this.indices = {};
    _.each(allIndices, function (indexNames, indexType) {
       this.indices[indexType] = {};
       indexNames.forEach(function (indexName) {
           this.indices[indexType][indexName] = {};
       }, this);
    }, this);
};

SiteGraph.prototype = {
    addToIndices: function (indexType, obj, position, adjacentObj) { // position and adjacentRelation are optional
        allIndices[indexType].forEach(function (indexName) {
            position = position || 'last';
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this.indices[indexType][indexName];
                    if (!(key in index)) {
                        index[key] = [obj];
                    } else {
                        if (position === 'last') {
                            index[key].push(obj);
                        } else if (position === 'first') {
                            index[key].unshift(obj);
                        } else { // 'before' or 'after'
                            var i = index[key].indexOf(adjacentObj) + (position === 'after' ? 1 : 0);
                            index[key].splice(i, 0, obj);
                        }
                    }
                }
            }
        }, this);
    },

    removeFromIndices: function (indexType, obj) {
        allIndices[indexType].forEach(function (indexName) {
            if (indexName in obj) {
                var type = typeof obj[indexName],
                    key;
                if (type === 'string' || type === 'number' || type === 'boolean') {
                    key = obj[indexName];
                } else if (type === 'object' && 'id' in obj[indexName]) {
                    key = obj[indexName].id;
                }
                if (typeof key !== 'undefined') {
                    var index = this.indices[indexType][indexName],
                        i = index[key].indexOf(obj);
                    if (i !== -1) {
                        index[key].splice(i, 1);
                    } else {
                        throw "removeFromIndices: object not found in index!";
                    }
                }
            }
        }, this);
    },

    lookupIndex: function (indexType, indexName, value) {
        return this.indices[indexType][indexName][typeof value === 'object' ? value.id : value] || [];
    },

    existsInIndex: function (indexType, indexName, value) {
        return this.lookupIndex(indexType, indexName, value).length > 0;
    },

    findRelations: function (indexName, value) {
        return this.lookupIndex('relation', indexName, value);
    },

    findAssets: function (indexName, value) {
        return this.lookupIndex('asset', indexName, value);
    },

    registerAsset: function (asset) {
        this.assets.push(asset);
        this.addToIndices('asset', asset);
    },

    unregisterAsset: function (asset) {
        this.relations.splice(this.assets.indexOf(asset), 1);
        this.removeFromIndices('relation', asset);
    },

    // Relations must be registered in order
    registerRelation: function (relation, position, adjacentRelation) { // position and adjacentRelation are optional,
        position = position || 'last';
        if (!relation.node) { // Assume there's a node if it's already attached
            if (adjacentRelation.from !== relation.from) {
                throw "registerRelation: adjacentRelation.from !== relation.from!";
            }
            relation.from.attachRelation(relation, position, adjacentRelation);
        }
        if (position === 'last') {
            this.relations.push(relation);
        } else if (position === 'first') {
            this.relations.unshift(relation);
        } else { // Assume 'before' or 'after'
            var i = this.relations.indexOf(adjacentRelation) + (position === 'after' ? 1 : 0);
            this.relations.splice(i, 0, relation);
        }
        this.addToIndices('relation', relation, position, adjacentRelation);
    },

    unregisterRelation: function (relation) {
        this.relations.splice(this.relations.indexOf(relation), 1);
        this.removeFromIndices('relation', relation);
    },

    // This cries out for a rich query facility/DSL!
    lookupSubgraph: function (startAsset, relationLambda) { // preorder
        var that = this,
            subgraph = new SiteGraph();
        function traverse (asset) {
            if (!subgraph.existsInIndex('asset', 'id', asset)) {
                subgraph.registerAsset(asset);
                that.lookupIndex('relation', 'from', asset).forEach(function (relation) {
                    traverse(relation.to);
                    if (!subgraph.existsInIndex('relation', 'id', relation)) {
                        subgraph.registerRelation(relation);
                    }
                });
            }
        }
        traverse(startAsset);
        return subgraph;
    },

    toGraphViz: function () {
        var g = graphviz.digraph("G");
        this.assets.forEach(function (asset) {
            g.addNode(asset.id.toString(), {label: 'url' in asset ? path.basename(asset.url) : 'inline'});
        }, this);
        this.relations.forEach(function (relation) {
            var edge = g.addEdge(relation.from.id.toString(), relation.to.id.toString());
        }, this);
        console.log(g.to_dot());
        g.output('png', 'graph.png');
    }
};
