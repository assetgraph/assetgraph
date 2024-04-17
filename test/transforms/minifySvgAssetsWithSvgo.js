const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const pathModule = require('path');

describe('transforms/minifySvgAssetsWithSvgo', function () {
  it('should handle a simple test case', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/minifySvgAssetsWithSvgo/simple/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'Svg');

    await assetGraph.minifySvgAssetsWithSvgo({ type: 'Svg' });

    expect(assetGraph, 'to contain asset', 'Svg');
    expect(
      assetGraph.findAssets({ type: 'Svg' })[0].text,
      'to equal',
      '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="56.693" height="56.693" viewBox="0 0 56.693 56.693"><g fill="#474A56"><circle cx="47.089" cy="40.805" r="3.129"/><circle cx="9.67" cy="37.212" r="3.129"/><circle cx="14.467" cy="8.241" r="3.13"/><path d="M19.114 14.647 17.9 12.384c-.278-.519-.922-.715-1.444-.436-.517.277-.714.924-.436 1.444l1.217 2.263c.19.357.558.564.938.564.171 0 .344-.042.505-.128.518-.278.713-.926.434-1.444M20.27 21.313c.193.36.562.564.942.564.172 0 .342-.041.502-.127.52-.279.713-.926.436-1.445l-1.215-2.263c-.278-.518-.924-.714-1.444-.435s-.712.925-.435 1.443zM35.98 33.542l-2.469-1.411c-.513-.292-1.164-.113-1.457.397-.289.512-.113 1.163.399 1.455l2.469 1.41c.167.096.349.141.528.141.373 0 .73-.193.928-.539.293-.511.114-1.163-.398-1.453M42.157 37.066l-2.472-1.41c-.512-.291-1.162-.113-1.455.397-.29.513-.113 1.163.397 1.456l2.47 1.409c.17.096.349.141.53.141.368 0 .728-.194.925-.539.291-.511.113-1.162-.395-1.454M17.152 32.173l-2.487 1.375c-.517.286-.705.935-.418 1.449.194.351.559.551.934.551.174 0 .352-.043.515-.133l2.487-1.377c.517-.285.704-.934.419-1.45-.286-.514-.936-.702-1.45-.415"/><path d="M48.662 9.463c0-2.629-2.138-4.766-4.767-4.766-2.625 0-4.765 2.137-4.765 4.766 0 .838.22 1.624.601 2.31L28.862 23.179c-.986-.598-2.14-.946-3.373-.946-3.611 0-6.548 2.937-6.548 6.546 0 3.608 2.937 6.546 6.548 6.546.067 0 .128-.008.197-.01l2.428 9.529c-1.356.841-2.268 2.34-2.268 4.051 0 2.628 2.14 4.765 4.767 4.765 2.626 0 4.764-2.137 4.764-4.765 0-2.541-2-4.617-4.507-4.752l-2.429-9.53c2.129-1.08 3.593-3.287 3.593-5.834 0-1.347-.408-2.601-1.109-3.642l10.87-11.405c.634.316 1.347.496 2.102.496 2.627 0 4.765-2.137 4.765-4.765M28.691 47.109c.481-.517 1.16-.847 1.921-.847.293 0 .571.06.835.149 1.041.351 1.798 1.325 1.798 2.483 0 1.452-1.183 2.633-2.633 2.633s-2.633-1.181-2.633-2.633c0-.69.273-1.314.712-1.785m.397-17.501c-.166.72-.54 1.358-1.059 1.851-.101.096-.211.182-.323.268-.621.468-1.384.755-2.217.755-.185 0-.362-.028-.538-.054-.788-.116-1.498-.47-2.044-1.001-.51-.499-.878-1.142-1.035-1.866-.055-.252-.088-.512-.088-.781 0-1.031.43-1.966 1.112-2.638.496-.487 1.126-.837 1.832-.985.245-.051.5-.078.761-.078.466 0 .909.096 1.32.254.921.354 1.665 1.059 2.064 1.958.202.456.317.959.317 1.489.001.285-.039.56-.102.828m14.807-17.513c-.168 0-.334-.019-.495-.051-1.013-.193-1.814-.97-2.055-1.965-.051-.199-.081-.404-.081-.616 0-1.452 1.181-2.634 2.631-2.634 1.452 0 2.633 1.182 2.633 2.634s-1.181 2.632-2.633 2.632"/></g></svg>'
    );
  });

  it('should preserve the top-level attributes of an SVG island in HTML when minifying', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/minifySvgAssetsWithSvgo/svgIslandInHtml/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', { type: 'Svg', isInline: true });

    await assetGraph.minifySvgAssetsWithSvgo({ type: 'Svg' });

    expect(assetGraph, 'to contain asset', { type: 'Svg', isInline: true });
    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text,
      'to contain',
      '<svg viewBox="0 0 250 250" role="img"'
    );
  });

  it('should not throw away too much precision', async function () {
    const assetGraph = new AssetGraph();
    await assetGraph.loadAssets({
      type: 'Svg',
      url: 'http://example.com/dot.svg',
      text:
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
        '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n' +
        ' width="69.964px" height="11.535px" viewBox="0 0 69.964 11.535" enable-background="new 0 0 69.964 11.535" xml:space="preserve">\n' +
        '<path fill="#ffffff" d="M32.988,8.093c-0.587,0-1.062,0.478-1.062,1.06c0,0.586,0.475,1.059,1.062,1.059\n' +
        ' c0.584,0,1.058-0.473,1.058-1.059C34.045,8.57,33.572,8.093,32.988,8.093"/>\n' +
        '</svg>',
    });
    await assetGraph.minifySvgAssetsWithSvgo({ type: 'Svg' });

    expect(assetGraph, 'to contain asset', { type: 'Svg' });
    expect(
      assetGraph.findAssets({ type: 'Svg' })[0].text,
      'to equal',
      '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="69.964" height="11.535" viewBox="0 0 69.964 11.535"><path fill="#fff" d="M32.988 8.093c-.587 0-1.062.478-1.062 1.06 0 .586.475 1.059 1.062 1.059.584 0 1.058-.473 1.058-1.059-.001-.583-.474-1.06-1.058-1.06"/></svg>'
    );
  });
});
