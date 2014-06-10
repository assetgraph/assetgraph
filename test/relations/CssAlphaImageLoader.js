/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib');

describe('relations/CssAlphaImageLoader', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssAlphaImageLoader/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'CssAlphaImageLoader', 3);

                assetGraph.findAssets({url: /\/foo.png$/})[0].url = assetGraph.root + 'images/quux.png';

                expect(_.pluck(assetGraph.findRelations({type: 'CssAlphaImageLoader'}), 'href'), 'to equal', [
                    'images/quux.png',
                    'bar.png',
                    '/images/quux.png'
                ]);
                var cssRules = assetGraph.findAssets({type: 'Css'})[0].parseTree.cssRules;
                expect(cssRules[0].style.getPropertyValue('filter'), 'to match', /src='images\/quux\.png'.*src='bar\.png'/);
                expect(cssRules[1].style.getPropertyValue('filter'), 'to match', /src='\/images\/quux\.png'/);
            })
            .run(done);
    });
});
