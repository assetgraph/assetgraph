/*global setImmediate:true*/
// node 0.8 compat
if (typeof setImmediate === 'undefined') {
    setImmediate = process.nextTick;
}

var _ = require('underscore'),
    async = require('async'),
    seq = require('seq'),
    query = require('../query');

module.exports = function (options) {
    options = options || {};
    var followRelationsMatcher = query.queryObjToMatcherFunction(options.followRelations),
        stopAssetsMatcher = function () {
            return false;
        };

    if (options.stopAssets) {
        stopAssetsMatcher = query.queryObjToMatcherFunction(options.stopAssets);
    }
    return function populate(assetGraph, cb) {
        assetGraph._browserPopulate(_.extend({isInline: false}, options.startAssets || options.from), options.followRelations, cb);
    };
};
