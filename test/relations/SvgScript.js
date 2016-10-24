/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/SvgScript', function () {
    it('should handle a test case with an inline <script> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'})
            .loadAssets('logo.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be true');
            });
    });

    it('should handle a test case with an external <script href=...> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/href/'})
            .loadAssets('logo-external.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be false');
                assetGraph.findAssets({type: 'JavaScript'})[0].fileName = 'yadda.js';
                expect(assetGraph.findAssets({type: 'Svg'})[0].text, 'to contain', '<script type="text/javascript" href="yadda.js"/>');
            });
    });

    it('should handle a test case with an external <script xlink:href=...> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'})
            .loadAssets('logo-external.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be false');
                assetGraph.findAssets({type: 'JavaScript'})[0].fileName = 'yadda.js';
                expect(assetGraph.findAssets({type: 'Svg'})[0].text, 'to contain', '<script type="text/javascript" xlink:href="yadda.js"/>');
            });
    });

    it('should externalize inline <script> elements correctly', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'})
            .loadAssets('logo.svg')
            .populate()
            .externalizeRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be false');
            });
    });

    it('should inline external <script> elements correctly', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'})
            .loadAssets('logo-external.svg')
            .populate()
            .inlineRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be true');
            });
    });

    it('should attach correctly in the parent document', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'})
            .loadAssets('logo-external.svg')
            .populate()
            .inlineRelations()
            .queue(function (assetGraph) {
                var svg = assetGraph.findAssets({ type: 'Svg' })[0];
                var docEl = assetGraph.findAssets({ type: 'Svg' })[0].parseTree;
                var svgEl = docEl.getElementsByTagName('svg')[0];

                var originalRelation = assetGraph.findRelations()[0];
                expect(svgEl.childNodes[0] === originalRelation.node, 'to be false');

                originalRelation.attach(svg, 'first');

                expect(svgEl.childNodes[0] === originalRelation.node, 'to be true');

                var clonedRelation = new AssetGraph.SvgScript({
                    to: originalRelation.to.clone()
                });

                clonedRelation.attach(svg, 'first');
                expect(svgEl.childNodes[0] === clonedRelation.node, 'to be true');

                clonedRelation.attach(svg, 'after', originalRelation);
                expect(svgEl.childNodes[1] === clonedRelation.node, 'to be true');

                clonedRelation.attach(svg, 'before', originalRelation);
                expect(svgEl.childNodes[0] === clonedRelation.node, 'to be true');
            });
    });
});
