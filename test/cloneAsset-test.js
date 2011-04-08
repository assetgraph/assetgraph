var vows = require('vows'),
    assert = require('assert'),
    seq = require('seq'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Cloning assets').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cloneAsset/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain 3 HTML assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 3);
        },
        'then cloning the first HTML asset': {
            topic: function (assetGraph) {
                var indexHtml = assetGraph.findAssets({type: 'HTML'})[0],
                    callback = this.callback;
                assetGraph.cloneAssetAndOutgoingRelations(indexHtml, function (err, assetClone, outgoingRelations) {
                    if (err) {
                        return callback(err);
                    }
                    assetClone.url = indexHtml.url.replace(/\.html$/, ".clone.html");
                    assetGraph.addAsset(assetClone);
                    outgoingRelations.forEach(function (outgoingRelation) {
                        assetGraph.addRelation(outgoingRelation);
                    });
                    callback(null, assetGraph);
                });
            },
            'the clone should be in the graph': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/index\.clone\.html$/}).length, 1);
            },
            'the clone should have an HTMLAnchor relation to anotherpage.html': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.clone\.html$/}, to: {url: /\/anotherpage\.html$/}}).length, 1);
            },
            'the clone should have an HTMLAnchor relation to yetanotherpage.html': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.clone\.html$/}, to: {url: /\/yetanotherpage\.html$/}}).length, 1);
            },
            'then getting the text of the original and the cloned asset': {
                topic: function (assetGraph) {
                    var cb = this.callback;
                    seq().extend(assetGraph.findAssets({url: /\/index(?:\.clone)?.html/})).
                        parMap(function (asset) {
                            assetGraph.getAssetText(asset, this);
                        }).
                        seq(function (originalText, cloneText) {
                            cb(null, originalText, cloneText);
                        })
                        ['catch'](this.callback);
                },
                'they should be identical': function (err, originalText, cloneText) {
                    assert.isString(originalText);
                    assert.isString(cloneText);
                    assert.equal(originalText, cloneText);
                }
            }
        }
    }
})['export'](module);
