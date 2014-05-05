var expect = require('../unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('relations/HtmlEmbed', function () {
    it('should handle a test case with an existing <embed src="..."> element', function (done) {
        new AssetGraph({root: __dirname + '/HtmlEmbed/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlEmbed');
                expect(assetGraph, 'to contain asset', 'Flash');
                expect(assetGraph, 'to contain relation including unresolved', {type: 'HtmlEmbed', href: 'foo.swf'});
                assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
                expect(assetGraph, 'to contain relation including unresolved', {type: 'HtmlEmbed', href: '../foo.swf'});
            })
            .run(done);
    });
});
