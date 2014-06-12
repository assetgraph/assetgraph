/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib');

describe('relations/SvgStyle', function () {
    it('should handle a test case with inline <style> elements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/SvgStyle/'})
            .loadAssets('kiwi.svg')
            .populate()
            .drawGraph('debug.svg')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgStyle', 1);
                expect(assetGraph, 'to contain assets', 'Css', 1);

                expect(assetGraph.findRelations()[0].href, 'to be', undefined);
            })
            .externalizeRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'XmlStylesheet', 1);
                expect(assetGraph, 'to contain assets', 'Css', 1);

                var clone = assetGraph.findAssets({ type: 'Css' })[0].clone();
                clone.url = undefined;
                var svg = assetGraph.findAssets({ type: 'Svg' })[0];
                var svgStyle = new AssetGraph.SvgStyle({
                    to: clone
                });

                // TODO: Test inserting first with and without existing style node in place
                svgStyle.attach(svg, 'first');

                // TODO: Test these. Seems broken calling super classes directly
                // svgStyle.attach(svg, 'before');
                // svgStyle.attach(svg, 'after');

                console.log(svg.text);
            })
            .run(done);
    });
});
