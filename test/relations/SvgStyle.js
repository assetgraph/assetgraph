/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/SvgStyle', function () {
    it('should handle a test case with inline <style> elements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/SvgStyle/'})
            .loadAssets('kiwi.svg')
            .populate()
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
                var cloneSvgStyle = new AssetGraph.SvgStyle({
                    to: clone
                });

                // Test inserting first without existing style node in place
                cloneSvgStyle.attach(svg, 'first');

                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'XmlStylesheet', 1);
                expect(assetGraph, 'to contain relations', 'SvgStyle', 1);
                expect(assetGraph, 'to contain assets', 'Css', 2);
                expect(svg.parseTree.getElementsByTagName('svg')[0].childNodes[0], 'to be', cloneSvgStyle.node);

                // Test inserting first with existing style node in place
                var svgStyle = new AssetGraph.SvgStyle({
                    to: clone.clone()
                });

                svgStyle.attach(svg, 'first');

                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'XmlStylesheet', 1);
                expect(assetGraph, 'to contain relations', 'SvgStyle', 2);
                expect(assetGraph, 'to contain assets', 'Css', 3);
                expect(svg.parseTree.getElementsByTagName('svg')[0].childNodes[0], 'to be', svgStyle.node);
                expect(svg.parseTree.getElementsByTagName('svg')[0].childNodes[1], 'to be', cloneSvgStyle.node);

                // Attach relation after other node
                svgStyle.attach(svg, 'after', cloneSvgStyle);

                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'XmlStylesheet', 1);
                expect(assetGraph, 'to contain relations', 'SvgStyle', 2);
                expect(assetGraph, 'to contain assets', 'Css', 3);
                expect(svg.parseTree.getElementsByTagName('svg')[0].childNodes[0], 'to be', cloneSvgStyle.node);
                expect(svg.parseTree.getElementsByTagName('svg')[0].childNodes[1], 'to be', svgStyle.node);

                // Attach relation before other node
                svgStyle.attach(svg, 'before', cloneSvgStyle);

                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'XmlStylesheet', 1);
                expect(assetGraph, 'to contain relations', 'SvgStyle', 2);
                expect(assetGraph, 'to contain assets', 'Css', 3);
                expect(svg.parseTree.getElementsByTagName('svg')[0].childNodes[0], 'to be', svgStyle.node);
                expect(svg.parseTree.getElementsByTagName('svg')[0].childNodes[1], 'to be', cloneSvgStyle.node);
            })
            .run(done);
    });
});
