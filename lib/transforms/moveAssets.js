var URL = require('url'),
    crypto = require('crypto'),
    step = require('step'),
    error = require('../error');

exports.moveAssets = function (query, newUrlFunction) {
    return function moveAssets(assetGraph, cb) {
        assetGraph.findAssets(query).forEach(function (asset) {
            assetGraph.setAssetUrl(asset, newUrlFunction(asset, assetGraph));
        });
        process.nextTick(cb);
    };
};
