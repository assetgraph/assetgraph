/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
    Path = require('path'),
    _ = require('lodash'),
    AssetGraph = require('../lib');

describe('AssetGraph#collectAssetsPostOrder()', function () {
    it('should visit some JavaScript assets in the correct order', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../testdata/unsupportedProtocols/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations({}, true), 'to satisfy', [
                    { to: { url: 'mailto:foo@bar.com' } },
                    { to: { url: 'tel:9876543' } },
                    { to: { url: 'sms:9876543' } },
                    { to: { url: 'fax:9876543' } },
                    { to: { url: 'httpz://foo.com/' } }
                ]);
                expect(warnings, 'to equal', [
                    new Error('No resolver found for protocol: httpz')
                ]);
            })
            .run(done);
    });
});
