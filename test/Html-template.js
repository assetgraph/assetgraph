var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

function createAsset(inputHtml) {
    return new AssetGraph.Html({
        text: inputHtml
    });
}

describe('Html template escaping', function () {
    it('should handle a non-templated HTML asset', function () {    
        var asset = createAsset('<div></div>');

        expect(asset.internalText, 'to equal', asset.text);
    });

    it('should handle an underscore template', function () {
        var asset = createAsset('<div><% foo %></div>');

        expect(asset.internalText, 'not to equal', asset.text);
        expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
        expect(asset._templateReplacements['⋖5⋗'], 'to equal', '<% foo %>');
        expect(asset.text, 'to equal', '<div><% foo %></div>');

        asset.parseTree.firstChild.removeChild(asset.parseTree.firstChild.firstChild);
        asset.markDirty();
        expect(asset.text, 'to equal', '<div></div>');

        asset.text = '<div><% bar %></div>';
        expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
        expect(asset.text, 'to equal', '<div><% bar %></div>');
    });

    it('should handle the PHP template syntax', function () {
        var asset = createAsset('<div><? foo ?></div>');

        expect(asset.internalText, 'not to equal', asset.text);
        expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
        expect(asset._templateReplacements['⋖5⋗'], 'to equal', '<? foo ?>');
        expect(asset.text, 'to equal', '<div><? foo ?></div>');

        asset.text = '<div><? bar ?></div>';
        expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
        expect(asset.text, 'to equal', '<div><? bar ?></div>');
    });

    it('should handle a an underscore template with a PHP close tag inside the dynamic part', function () {
        var asset = createAsset('<div><% foo ?> %></div>');

        expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
        expect(asset.text, 'to equal', '<div><% foo ?> %></div>');
    });
});
