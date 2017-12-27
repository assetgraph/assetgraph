/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/SvgScript', async function () {
    it('should handle a test case with an inline <script> element', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'});
        await assetGraph.loadAssets('logo.svg');
        await assetGraph.populate();

        expect(assetGraph, 'to contain assets', 'Svg', 1);
        expect(assetGraph, 'to contain relations', 'SvgScript', 1);
        expect(assetGraph, 'to contain assets', 'JavaScript', 1);

        expect(assetGraph.findRelations()[0].to.isInline, 'to be true');
    });

    it('should handle a test case with an external <script href=...> element', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/href/'});
        await assetGraph.loadAssets('logo-external.svg');
        await assetGraph.populate();

        expect(assetGraph, 'to contain assets', 'Svg', 1);
        expect(assetGraph, 'to contain relations', 'SvgScript', 1);
        expect(assetGraph, 'to contain assets', 'JavaScript', 1);

        expect(assetGraph.findRelations()[0].to.isInline, 'to be false');
        assetGraph.findAssets({type: 'JavaScript'})[0].fileName = 'yadda.js';
        expect(assetGraph.findAssets({type: 'Svg'})[0].text, 'to contain', '<script type="text/javascript" href="yadda.js"/>');
    });

    it('should handle a test case with an external <script xlink:href=...> element', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'});
        await assetGraph.loadAssets('logo-external.svg');
        await assetGraph.populate();

        expect(assetGraph, 'to contain assets', 'Svg', 1);
        expect(assetGraph, 'to contain relations', 'SvgScript', 1);
        expect(assetGraph, 'to contain assets', 'JavaScript', 1);

        expect(assetGraph.findRelations()[0].to.isInline, 'to be false');
        assetGraph.findAssets({type: 'JavaScript'})[0].fileName = 'yadda.js';
        expect(assetGraph.findAssets({type: 'Svg'})[0].text, 'to contain', '<script type="text/javascript" xlink:href="yadda.js"/>');
    });

    it('should externalize inline <script> elements correctly', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'});
        await assetGraph.loadAssets('logo.svg');
        await assetGraph.populate();
        await assetGraph.externalizeRelations();

        expect(assetGraph, 'to contain assets', 'Svg', 1);
        expect(assetGraph, 'to contain relations', 'SvgScript', 1);
        expect(assetGraph, 'to contain assets', 'JavaScript', 1);

        expect(assetGraph.findRelations()[0].to.isInline, 'to be false');
    });

    it('should inline external <script> elements correctly', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'});
        await assetGraph.loadAssets('logo-external.svg');
        await assetGraph.populate();
        await assetGraph.inlineRelations();

        expect(assetGraph, 'to contain assets', 'Svg', 1);
        expect(assetGraph, 'to contain relations', 'SvgScript', 1);
        expect(assetGraph, 'to contain assets', 'JavaScript', 1);

        expect(assetGraph.findRelations()[0].to.isInline, 'to be true');
    });

    it('should attach correctly in the parent document', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/xlinkhref/'});
        await assetGraph.loadAssets('logo-external.svg');
        await assetGraph.populate();
        await assetGraph.inlineRelations();

        const svg = assetGraph.findAssets({ type: 'Svg' })[0];
        const docEl = assetGraph.findAssets({ type: 'Svg' })[0].parseTree;
        const svgEl = docEl.getElementsByTagName('svg')[0];

        const originalRelation = assetGraph.findRelations()[0];
        expect(svgEl.childNodes[0] === originalRelation.node, 'to be false');

        originalRelation.attach('first');

        expect(svgEl.childNodes[0] === originalRelation.node, 'to be true');

        const clonedRelation = svg.addRelation({
            type: 'SvgScript',
            to: originalRelation.to.clone()
        }, 'first');

        expect(svgEl.childNodes[0] === clonedRelation.node, 'to be true');

        clonedRelation.attach('after', originalRelation);
        expect(svgEl.childNodes[1] === clonedRelation.node, 'to be true');

        clonedRelation.attach('before', originalRelation);
        expect(svgEl.childNodes[0] === clonedRelation.node, 'to be true');
    });
});
