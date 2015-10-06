/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptCommonJsRequire', function () {
    it('should handle a test case with existing require(...) expressions', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptCommonJsRequire/'})
            .loadAssets('index.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptCommonJsRequire', 2);

                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain asset', {url: assetGraph.root + 'index.js'});
                expect(assetGraph, 'to contain asset', {url: /\/otherModule\.js$/});
                expect(assetGraph, 'to contain asset', {url: /\/subdir\/index\.js$/});

                assetGraph.findAssets({url: /\/JavaScriptCommonJsRequire\/otherModule\.js$/})[0].url =
                    assetGraph.root + 'otherSubdir/otherModule.js';

                expect(assetGraph.findRelations({to: {url: /\/otherSubdir\/otherModule\.js$/}})[0].href, 'to match',
                             /\/otherSubdir\/otherModule\.js$/);

                expect(assetGraph.findAssets({url: /\/index\.js$/})[0].text, 'to contain', 'require(\'./otherSubdir/otherModule.js\')');
            })
            .run(done);
    });
});
