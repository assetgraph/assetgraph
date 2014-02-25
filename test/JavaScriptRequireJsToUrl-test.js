var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    URL = require('url'),
    AssetGraph = require('../lib');

vows.describe('relations.JavaScriptRequireJsToUrl').addBatch({
    'After loading test case with require.toUrl expressions': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptRequireJsToUrl/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 JavaScriptRequireJsToUrl relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptRequireJsToUrl'}).length, 3);
        },
        'the graph should contain 3 Text assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'}).length, 3);
        },
        'the Text assets should have the correct urls and contents': function (assetGraph) {
            ['foobar.txt', 'quux.txt', 'some/blah.txt'].forEach(function (relativeUrl) {
                var foundAssets = assetGraph.findAssets({url: URL.resolve(assetGraph.root, relativeUrl)});
                assert.equal(foundAssets.length, 1);
                assert.isTrue(foundAssets[0].isLoaded);
                assert.equal(foundAssets[0].text, 'Contents of ' + relativeUrl + '\n');
            });
        },
        'then move blah.txt to a different url': {
            topic: function (assetGraph) {
                assetGraph.findAssets({fileName: 'blah.txt'})[0].url = URL.resolve(assetGraph.root, 'otherDir/hey.txt');
                return assetGraph;
            },
            'the require.toUrl reference pointing at it should be updated': function (assetGraph) {
                assert.matches(assetGraph.findAssets({fileName: 'thing.js'})[0].text, /require\.toUrl\((['"])\.\.\/otherDir\/hey\.txt\1\)/);
            }
        }
    }
})['export'](module);
