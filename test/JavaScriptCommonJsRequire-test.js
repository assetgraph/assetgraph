var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('relations.JavaScriptCommonJsRequire').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptCommonJsRequire/'})
                .loadAssets('index.js')
                .populate()
                .run(done);
        },
        'the graph should contain 2 JavaScriptCommonJsRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptCommonJsRequire', 2);
        },
        'the graph should contain 3 JavaScript assets with the correct urls': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain asset', {url: assetGraph.root + 'index.js'});
            expect(assetGraph, 'to contain asset', {url: /\/otherModule\.js$/});
            expect(assetGraph, 'to contain asset', {url: /\/subdir\/index\.js$/});
        },
        'then move otherModule.js': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/test\/JavaScriptCommonJsRequire\/otherModule\.js$/})[0].url =
                    assetGraph.root + 'otherSubdir/otherModule.js';
                return assetGraph;
            },
            'the href of the incoming relation should be updated correctly': function (assetGraph) {
                expect(assetGraph.findRelations({to: {url: /\/otherSubdir\/otherModule\.js$/}})[0].href, 'to match',
                             /\/otherSubdir\/otherModule\.js$/);
            },
            'the text of the including asset should be updated correctly': function (assetGraph) {
                expect(assetGraph.findAssets({url: /\/index\.js$/})[0].text, 'to contain', 'require("./otherSubdir/otherModule.js")');
            }
        }
   }
})['export'](module);
