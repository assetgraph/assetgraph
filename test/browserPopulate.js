var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    passError = require('passerror'),
    Path = require('path');

describe('AssetGraph#populate()', function () {
    it('should populate a graph with require.js correctly', function (done) {
        new AssetGraph({root: Path.resolve(__dirname, '..', 'testdata', 'browserPopulate', 'requireJsWithMultipleConfigs')})
            .on('error', done)
            .on('warn', console.warn)
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .browserPopulate()
            .run(passError(done, function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'JavaScript'}, 6);
                expect(assetGraph, 'to contain urls', ['some/place/there.js', 'bar/quux/baz.js']);
                done();
            }));
    });

    it('should bail out when conflicting configurations resolve a module name to different urls', function (done) {
        new AssetGraph({root: Path.resolve(__dirname, '..', 'testdata', 'browserPopulate', 'multipleInitialAssetsWithConflictingRequireJsConfigs')})
            .on('error', done)
            .on('warn', function (err) {
                console.warn(err.stack);
            })
            .registerRequireJsConfig()
            .loadAssets('index*.html')
            .browserPopulate()
            .run(function (err, assetGraph) {
                expect(err, 'to be an', Error);
                expect(err.message, 'to equal', 'browserPopulate transform: The module name foo resolves to different urls in different contexts: ./bar/quux ./blah/quux');
                done();
            });
    });
});
