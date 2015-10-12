/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/requireJsConfig', function () {
    it('should handle a test case with a shim dependency', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/shimDependency'})
            .loadAssets('index.html')
            .registerRequireJsConfig()
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
            })
            .run(done);
    });

    it('should handle a test case with a requirejs configuration coming from global var require definition before loading requirejs', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/globalVarRequire'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .run(done);
    });

    it('should handle a test case with a requirejs configuration coming from global var requirejs definition before loading requirejs', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/globalVarRequirejs'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .run(done);
    });

    it('should handle a test case with a requirejs configuration coming from global require definition before loading requirejs', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/globalRequire'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .run(done);
    });

    it('should handle a test case with a requirejs configuration coming from global requirejs definition before loading requirejs', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/globalRequirejs'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .run(done);
    });

    it('should handle a test case with a requirejs configuration coming from window.require', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/windowRequire'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .run(done);
    });

    it('should handle a test case with a requirejs configuration coming from window.requirejs', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/windowRequirejs'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .run(done);
    });

    it('should pick up requirejs configuration when it is in an already loaded asset when transform is run', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/windowRequirejs'})
            .loadAssets('index.html')
            .registerRequireJsConfig()
            .queue(function (assetGraph) {
                expect(assetGraph.requireJsConfig, 'to satisfy', {
                    foundConfig: true,
                    paths: {
                        underscore: '../vendor/underscore',
                        backbone: '../vendor/backbone'
                    }
                });
            })
            .run(done);
    });

    it('should pick up require.js configurations from objects that use bracket notation', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/registerRequireJsConfig/bracketNotation'})
            .loadAssets('index.html')
            .registerRequireJsConfig()
            .queue(function (assetGraph) {
                expect(assetGraph.requireJsConfig, 'to satisfy', {
                    foundConfig: true,
                    paths: {
                        underscore: '../vendor/underscore',
                        backbone: '../vendor/backbone'
                    },
                    shim: {
                        backbone: {
                            deps: [ 'underscore' ],
                            exports: 'Backbone'
                        },
                        underscore: { exports: '_' }
                    }
                });
            })
            .run(done);
    });
});
