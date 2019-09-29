const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');
const sinon = require('sinon');

describe('relations/JavaScriptSourceMappingUrl', function() {
  it('should handle a test case with a JavaScript asset that has @sourceMappingURL directive', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptSourceMappingUrl/existingSourceMap/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 4);
    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain asset', 'SourceMap');
    expect(assetGraph, 'to contain relation', 'JavaScriptSourceMappingUrl');
    expect(assetGraph, 'to contain relation', 'SourceMapFile');
    expect(assetGraph, 'to contain relation', 'SourceMapSource');
    assetGraph.findAssets({
      type: 'JavaScript'
    })[0].url = `${assetGraph.root}foo/jquery.js`;

    expect(
      assetGraph.findAssets({ type: 'JavaScript' })[0].text,
      'to match',
      /@\s*sourceMappingURL=..\/jquery-1.10.1.min.map/
    );
  });

  it('should handle another test case with a JavaScript asset that has @sourceMappingURL directive', async function() {
    const warnSpy = sinon.spy().named('warn');
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptSourceMappingUrl/existingSourceMap2/'
      )
    });
    await assetGraph.on('warn', warnSpy);
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(warnSpy, 'to have calls satisfying', () =>
      warnSpy(/^ENOENT.*jquery-1.11.3.js/)
    );

    expect(assetGraph, 'to contain relation', 'JavaScriptSourceMappingUrl');
    expect(assetGraph, 'to contain relation', 'SourceMapSource');

    await assetGraph.applySourceMaps();

    expect(
      assetGraph.findAssets({ type: 'JavaScript' })[0].parseTree.body[0]
        .expression.argument.loc,
      'to satisfy',
      {
        start: { line: 15, column: 1 },
        source: `${assetGraph.root}jquery-1.11.3.js`
      }
    );
  });
});
