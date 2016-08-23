/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/minifySvgAssetsWithSvgo', function () {
    it('should handle a simple test case', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/minifySvgAssetsWithSvgo/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Svg');
            })
            .minifySvgAssetsWithSvgo({type: 'Svg'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(
                    assetGraph.findAssets({type: 'Svg'})[0].text,
                    'to equal',
                    '<svg height="56.693" viewBox="0 0 56.693 56.693" width="56.693" xmlns="http://www.w3.org/2000/svg"><g fill="#474A56"><circle cx="47.089" cy="40.805" r="3.129"/><circle cx="9.67" cy="37.212" r="3.129"/><circle cx="14.467" cy="8.241" r="3.13"/><path d="M19.114 14.647L17.9 12.384a1.065 1.065 0 0 0-1.444-.436 1.068 1.068 0 0 0-.436 1.444l1.217 2.263a1.064 1.064 0 1 0 1.877-1.008zM20.27 21.313a1.068 1.068 0 0 0 1.444.437c.52-.279.713-.926.436-1.445l-1.215-2.263a1.066 1.066 0 0 0-1.879 1.008l1.214 2.263zM35.98 33.542l-2.469-1.411a1.07 1.07 0 0 0-1.457.397 1.07 1.07 0 0 0 .399 1.455l2.469 1.41a1.064 1.064 0 0 0 1.456-.398 1.063 1.063 0 0 0-.398-1.453zM42.157 37.066l-2.472-1.41a1.069 1.069 0 0 0-1.455.397 1.07 1.07 0 0 0 .397 1.456l2.47 1.409a1.066 1.066 0 1 0 1.06-1.852zM17.152 32.173l-2.487 1.375a1.068 1.068 0 1 0 1.031 1.867l2.487-1.377a1.066 1.066 0 1 0-1.031-1.865z"/><path d="M48.662 9.463a4.77 4.77 0 0 0-4.767-4.766 4.772 4.772 0 0 0-4.765 4.766c0 .838.22 1.624.601 2.31L28.862 23.179a6.486 6.486 0 0 0-3.373-.946 6.554 6.554 0 0 0-6.548 6.546 6.555 6.555 0 0 0 6.548 6.546c.067 0 .128-.008.197-.01l2.428 9.529a4.768 4.768 0 0 0-2.268 4.051 4.772 4.772 0 0 0 4.767 4.765 4.77 4.77 0 0 0 4.764-4.765c0-2.541-2-4.617-4.507-4.752l-2.429-9.53a6.543 6.543 0 0 0 3.593-5.834 6.5 6.5 0 0 0-1.109-3.642l10.87-11.405a4.698 4.698 0 0 0 2.102.496 4.77 4.77 0 0 0 4.765-4.765zM28.691 47.109a2.616 2.616 0 0 1 1.921-.847c.293 0 .571.06.835.149a2.626 2.626 0 0 1 1.798 2.483c0 1.452-1.183 2.633-2.633 2.633s-2.633-1.181-2.633-2.633c0-.69.273-1.314.712-1.785zm.397-17.501a3.695 3.695 0 0 1-1.059 1.851 3.992 3.992 0 0 1-.323.268 3.67 3.67 0 0 1-2.217.755c-.185 0-.362-.028-.538-.054a3.693 3.693 0 0 1-2.044-1.001 3.71 3.71 0 0 1-1.035-1.866 3.65 3.65 0 0 1-.088-.781 3.7 3.7 0 0 1 1.112-2.638 3.698 3.698 0 0 1 2.593-1.063c.466 0 .909.096 1.32.254a3.717 3.717 0 0 1 2.064 1.958 3.549 3.549 0 0 1 .215 2.317zm14.807-17.513c-.168 0-.334-.019-.495-.051a2.63 2.63 0 0 1-2.055-1.965 2.472 2.472 0 0 1-.081-.616 2.636 2.636 0 0 1 2.631-2.634 2.637 2.637 0 0 1 2.633 2.634 2.635 2.635 0 0 1-2.633 2.632z"/></g></svg>'
                );
            });
    });

    it('should preserve the top-level attributes of an SVG island in HTML when minifying', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/minifySvgAssetsWithSvgo/svgIslandInHtml/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {type: 'Svg', isInline: true});
            })
            .minifySvgAssetsWithSvgo({type: 'Svg'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {type: 'Svg', isInline: true});
                expect(
                    assetGraph.findAssets({type: 'Html'})[0].text,
                    'to contain',
                    '<svg viewBox="0 0 250 250" role="img"'
                );
            });
    });
});
