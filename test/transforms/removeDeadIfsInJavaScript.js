/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/removeDeadIfsInJavaScript', function () {
    it('should remove and preserve the correct if statements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/removeDeadIfsInJavaScript/'})
            .loadAssets('index.js')
            .removeDeadIfsInJavaScript()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph.findAssets({type: 'JavaScript'})[0], 'to have the same AST as', function () {
                    /*jshint ignore:start*/
                    if (foo) {
                        doNotTouchMe();
                    }

                    if (foo) {
                        hoistMe();
                    }

                    if (foo) {
                        hoistMe();
                    }

                    if (foo) {}

                    keepMe();

                    keepMe();

                    keepMe();

                    if ("foo" === "bar") {
                        keepMe();
                    } else {
                        keepMe();
                    }
                    /*jshint ignore:end*/
                });
            })
            .run(done);
    });
});
