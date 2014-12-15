/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/moveAssets', function () {
    it('should throw if mandatory second argument is missing', function () {
        var tq = new AssetGraph({root: 'http://www.example.com/blah/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'http://www.example.com/blah/quux.html'});

        expect(tq.moveAssets, 'to throw');
    });

    it('should handle a test case with a non-inline asset that is moved to another absolute url', function (done) {
        new AssetGraph({root: 'http://www.example.com/blah/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'http://www.example.com/blah/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return 'http://www.example.com/blah/someotherplace.html'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/blah/someotherplace.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to an absolute url without a file name', function (done) {
        new AssetGraph({root: 'http://www.example.com/blah/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'http://www.example.com/blah/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return 'http://www.example.com/w00p/'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/w00p/quux.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to a relative url', function (done) {
        new AssetGraph({root: 'http://www.example.com/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'http://www.example.com/blah/hey/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return 'otherdir/someotherplace.html'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/blah/hey/otherdir/someotherplace.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to a relative url without a file name', function (done) {
        new AssetGraph({root: 'http://www.example.com/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'http://www.example.com/blah/yay/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return 'otherdir/'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/blah/yay/otherdir/quux.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to a relative url with ../', function (done) {
        new AssetGraph({root: 'http://www.example.com/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'http://www.example.com/blah/hey/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return '../someotherplace.html'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/blah/someotherplace.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to a relative url with ../ but without a file name', function (done) {
        new AssetGraph({root: 'file:///foo/bar/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'file:///foo/bar/hey/blah/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return '../'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'file:///foo/bar/hey/quux.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to a root-relative url', function (done) {
        new AssetGraph({root: 'file:///foo/bar/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'file:///foo/bar/hello.html'})
            .moveAssets({type: 'Html'}, function (asset) { return '/yay.html'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'file:///foo/bar/yay.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to a root-relative url without a file name', function (done) {
        new AssetGraph({root: 'file:///foo/bar/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'file:///foo/bar/blah/foo/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return '/'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'file:///foo/bar/quux.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to a root-relative url without file name', function (done) {
        new AssetGraph({root: 'http://www.example.com/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'http://www.example.com/blah/hey/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return '/'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/quux.html');
            })
            .run(done);
    });

    it('should handle a test case with a non-inline asset that is moved to a root-relative url without file name, file: urls', function (done) {
        new AssetGraph({root: 'file:///foo/bar/'})
            .loadAssets({type: 'Html', text: 'foo', url: 'file:///foo/bar/baz/quux.html'})
            .moveAssets({type: 'Html'}, function (asset) { return '/'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'file:///foo/bar/quux.html');
            })
            .run(done);
    });

    it('should handle a test case with an inline asset that is moved to an absolute url', function (done) {
        new AssetGraph({root: 'http://www.example.com/blah/'})
            .loadAssets(new AssetGraph.Html({text: 'foo'}))
            .moveAssets({type: 'Html'}, function (asset) { return 'http://www.example.com/foo/someotherplace.html'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/foo/someotherplace.html');
            })
            .run(done);
    });

    it('should handle a test case with an inline asset that is moved to an absolute url without a file name', function (done) {
        new AssetGraph({root: 'http://www.example.com/blah/'})
            .loadAssets(new AssetGraph.Html({text: 'foo'}))
            .moveAssets({type: 'Html'}, function (asset) { return 'http://www.example.com/foo/'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/foo/');
            })
            .run(done);
    });

    it('should handle a test case with an inline asset that is moved to a relative url', function (done) {
        new AssetGraph({root: 'http://www.example.com/blah/'})
            .loadAssets(new AssetGraph.Html({text: 'foo'}))
            .moveAssets({type: 'Html'}, function (asset) { return 'here/there.html'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/blah/here/there.html');
            })
            .run(done);
    });

    it('should handle a test case with an inline asset that is moved to a relative url without a file name', function (done) {
        new AssetGraph({root: 'http://www.example.com/blah/'})
            .loadAssets(new AssetGraph.Html({text: 'foo'}))
            .moveAssets({type: 'Html'}, function (asset) { return 'here/'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'http://www.example.com/blah/here/');
            })
            .run(done);
    });

    it('should handle a test case with an inline asset that is moved to a root-relative url', function (done) {
        new AssetGraph({root: 'file:///foo/bar/'})
            .loadAssets(new AssetGraph.Html({text: 'foo'}))
            .moveAssets({type: 'Html'}, function (asset) { return '/there.html'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'file:///foo/bar/there.html');
            })
            .run(done);
    });

    it('should handle a test case with an inline asset that is moved to a root-relative url without a file name', function (done) {
        new AssetGraph({root: 'file:///foo/bar/'})
            .loadAssets(new AssetGraph.Html({text: 'foo'}))
            .moveAssets({type: 'Html'}, function (asset) { return '/'; })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].url, 'to equal', 'file:///foo/bar/');
            })
            .run(done);
    });
});
