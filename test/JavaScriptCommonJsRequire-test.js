var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('relations.JavaScriptCommonJsRequire').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptCommonJsRequire/'})
                .loadAssets('index.js')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 JavaScriptCommonJsRequire relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptCommonJsRequire'}).length, 2);
        },
        'the graph should contain 3 JavaScript assets with the correct urls': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
            assert.equal(assetGraph.findAssets({url: 'file:///home/andreas/work/assetgraph/test/JavaScriptCommonJsRequire/index.js'}).length, 1);
            assert.equal(assetGraph.findAssets({url: 'file:///home/andreas/work/assetgraph/test/JavaScriptCommonJsRequire/otherModule.js'}).length, 1);
            assert.equal(assetGraph.findAssets({url: 'file:///home/andreas/work/assetgraph/test/JavaScriptCommonJsRequire/subdir/index.js'}).length, 1);
        },
        'then move otherModule.js': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: 'file:///home/andreas/work/assetgraph/test/JavaScriptCommonJsRequire/otherModule.js'})[0].url =
                    'file:///home/andreas/work/assetgraph/test/JavaScriptCommonJsRequire/otherSubdir/otherModule.js';
                return assetGraph;
            },
            'the href of the incoming relation should be updated correctly': function (assetGraph) {
                assert.equal(assetGraph.findRelations({to: {url: 'file:///home/andreas/work/assetgraph/test/JavaScriptCommonJsRequire/otherSubdir/otherModule.js'}})[0].href,
                             'file:///home/andreas/work/assetgraph/test/JavaScriptCommonJsRequire/otherSubdir/otherModule.js');
            },
            'the text of the including asset should be updated correctly': function (assetGraph) {
                assert.notEqual(assetGraph.findAssets({url: /\/index\.js$/})[0].text.indexOf('require("' + __dirname + '/JavaScriptCommonJsRequire/otherSubdir/otherModule.js")'), -1);
            }
        }
   }
})['export'](module);
