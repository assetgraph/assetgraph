/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const urlTools = require('urltools');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlConditionalComment', function () {
    it('should handle a test case with some existing conditional comments', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlConditionalComment/'})
            .loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain assets', 9);

        assetGraph.findAssets({type: 'JavaScript'})[0].url = urlTools.resolveUrl(assetGraph.root, 'fixIE6ForTheLoveOfGod.js');

        let text = assetGraph.findAssets({url: /index\.html$/})[0].text;
        expect(text, 'to match', /Good old/);
        expect(text, 'to match', /<script src="fixIE6ForTheLoveOfGod\.js"><\/script>/);

        expect(text, 'to match', /<!--\[if !IE\]>\s*-->Not IE<!--\s*<!\[endif\]-->/);

        await assetGraph.externalizeRelations({type: ['HtmlStyle', 'HtmlScript']});

        for (const asset of assetGraph.findAssets({type: 'Html'})) {
            asset.minify();
        }

        text = assetGraph.findAssets({url: /\/index\.html$/})[0].text;
        expect(text, 'to match', /Good old/);
        expect(text, 'to match', /<script src=fixIE6ForTheLoveOfGod\.js><\/script>/);
        expect(text, 'to match', /<!--\[if !IE\]>\s*--> Not IE<!--\s*<!\[endif\]-->/);
        expect(text, 'to match', /<!--\[if IE\]>\s*<link rel=stylesheet href=[^\"]+\.css>\s*<!\[endif\]-->/);
    });

    it('should handle a test case with the HTML5 boilerplate conditional comments', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlConditionalComment/'})
            .loadAssets('html5Boilerplate.html')
            .populate();

        expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 3);
        expect(assetGraph, 'to contain assets', {type: 'Html', isInline: true}, 3);

        assetGraph.findAssets({type: 'Html', isInline: true}).forEach(function (htmlAsset) {
            htmlAsset.markDirty();
        });

        var text = assetGraph.findAssets({type: 'Html', isInline: false})[0].text;
        expect(text, 'to match', /<!--\[if lt IE 7\]>\s*<html class="no-js lt-ie9 lt-ie8 lt-ie7">\s*<!\[endif\]-->/);
        expect(text, 'to match', /<!--\[if IE 7\]>\s*<html class="no-js lt-ie9 lt-ie8">\s*<!\[endif\]-->/);
        expect(text, 'to match', /<!--\[if IE 8\]>\s*<html class="no-js lt-ie9">\s*<!\[endif\]-->/);
        expect(text, 'to match', /<!--\[if gt IE 8\]><!-->\s*<html class="no-js">\s*<!--<!\[endif\]-->/);
    });
});
