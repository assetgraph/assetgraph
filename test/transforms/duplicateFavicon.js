/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const urlTools = require('urltools');

describe('transforms.duplicateFavicon', function () {
    it('should handle a referenced favicon.ico', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/duplicateFavicon/referencedFavicon')});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 1);

        await assetGraph.duplicateFavicon();

        expect(assetGraph, 'to contain relation', 'HtmlShortcutIcon');
        expect(assetGraph, 'to contain relation', {type: 'HtmlShortcutIcon', href: 'favicon.copy.ico'});
        expect(assetGraph, 'to contain assets', 'Ico', 2);
        expect(assetGraph, 'to contain asset', {url: urlTools.resolveUrl(assetGraph.root, 'favicon.ico')});
        expect(assetGraph, 'to contain asset', {url: urlTools.resolveUrl(assetGraph.root, 'favicon.copy.ico')});
        expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to equal',
            '<!DOCTYPE html><html><head>\n' +
            '        <link rel="shortcut icon" href="favicon.copy.ico">\n' +
            '    </head>\n' +
            '    <body>\n' +
            '    \n' +
            '\n' +
            '</body></html>');
    });

    it('should handle an unreferenced favicon.ico', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/duplicateFavicon/unreferencedFavicon')});
        await assetGraph.loadAssets('index.html', 'noHead.html', 'favicon.ico')
            .populate();

        expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 0);

        await assetGraph.duplicateFavicon();

        expect(assetGraph, 'to contain relation', 'HtmlShortcutIcon', 2);
        expect(assetGraph, 'to contain assets', 'Ico', 2);
        expect(assetGraph, 'to contain asset', {url: urlTools.resolveUrl(assetGraph.root, 'favicon.ico'), isInitial: true});
        expect(assetGraph, 'to contain asset', {url: urlTools.resolveUrl(assetGraph.root, 'favicon.copy.ico'), isInitial: function (isInitial) {return !isInitial; }});
        expect(assetGraph.findAssets({type: 'Html', fileName: 'index.html'})[0].text, 'to equal',
            '<!DOCTYPE html><html><head>\n' +
            '    <link rel="shortcut icon" href="favicon.copy.ico"></head>\n' +
            '    <body>\n' +
            '    \n' +
            '\n' +
            '</body></html>'
        );
        expect(assetGraph.findAssets({type: 'Html', fileName: 'noHead.html'})[0].text, 'to equal',
            '<!DOCTYPE html><html><head><link rel="shortcut icon" href="favicon.copy.ico"></head><body>\n' +
            '    \n' +
            '\n' +
            '</body></html>'
        );
    });
});
