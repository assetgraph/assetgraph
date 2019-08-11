const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/Css', function() {
  let sandbox;
  beforeEach(function() {
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should handle a test case with a parse error in an inline Css asset', async function() {
    const warnSpy = sandbox.spy().named('warn');
    await new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/Css/parseErrors/'
      )
    })
      .on('warn', warnSpy)
      .loadAssets('parseErrorInInlineCss.html');

    expect(warnSpy, 'to have calls satisfying', () => {
      warnSpy(/parseErrorInInlineCss\.html/);
    });
  });

  it('should handle a test case with a parse error in an external Css asset', async function() {
    const warnSpy = sandbox.spy().named('warn');
    await new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/Css/parseErrors/'
      )
    })
      .on('warn', warnSpy)
      .loadAssets('parseErrorInExternalCss.html')
      .populate();

    expect(warnSpy, 'to have calls satisfying', () => {
      warnSpy(/parseError\.css/);
    });
  });

  it('should handle a test case that has multiple neighbour @font-face rules', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/Css/multipleFontFaceRules/'
      )
    });
    await assetGraph.loadAssets('index.css').populate({
      followRelations: { crossdomain: false }
    });

    const cssAsset = await expect(assetGraph, 'to contain asset', 'Css');
    expect(cssAsset.text.match(/@font-face/g), 'to have length', 3);

    cssAsset.markDirty();
    expect(cssAsset.text.match(/@font-face/g), 'to have length', 3);
  });

  it('should get the default encoding when there is no other way to determine encoding', function() {
    const asset = new AssetGraph().addAsset({ type: 'Css' });

    expect(asset.encoding, 'to be', AssetGraph.Text.prototype.defaultEncoding);
  });

  it('should get set a new encoding correctly', function() {
    const asset = new AssetGraph().addAsset({
      type: 'Css',
      encoding: 'utf-8',
      text: 'body:before { content: "🐮"; }'
    });

    sandbox.spy(asset, 'markDirty');

    asset.encoding = 'iso-8859-1';

    expect(asset.markDirty, 'to have calls satisfying', () => {
      asset.markDirty();
    });
    expect(asset.encoding, 'to be', 'iso-8859-1');
  });

  it('should pretty print Css text', function() {
    const text = 'body{background:red}';
    const asset = new AssetGraph().addAsset({ type: 'Css', text });

    expect(asset.text, 'to be', text);

    asset.prettyPrint();
    expect(asset.text, 'to be', 'body {\n    background: red;\n}\n');
  });

  it('should propagate source map information when pretty-printing', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/Css/prettyPrintWithSourceMap/'
      )
    });
    await assetGraph.loadAssets('index.css');

    for (const asset of assetGraph.findAssets()) {
      asset.prettyPrint();
    }

    await assetGraph.serializeSourceMaps();

    expect(assetGraph, 'to contain asset', 'SourceMap');

    const sourceMap = assetGraph.findAssets({ type: 'SourceMap' })[0];
    expect(
      sourceMap.generatedPositionFor({
        source: `${assetGraph.root}index.css`,
        line: 1,
        column: 6
      }),
      'to equal',
      {
        line: 2,
        column: 4,
        lastColumn: null
      }
    );
  });

  it('should emit a warn event on completely invalid CSS', function() {
    const assetGraph = new AssetGraph();
    const asset = new AssetGraph().addAsset({
      type: 'Css',
      text: 'body {}'
    });

    assetGraph.addAsset(asset);

    const warnSpy = sandbox.spy(assetGraph, 'warn');
    assetGraph.on('warn', warnSpy);

    expect(() => asset.parseTree, 'not to throw');

    expect(() => (asset.text = '}'), 'to throw');
  });

  it('should update the text of a Css asset when setting parseTree', function() {
    const cssText = 'h1{color:hotpink}';
    const first = new AssetGraph().addAsset({
      type: 'Css',
      text: 'h1{color:red}'
    });
    const second = new AssetGraph().addAsset({
      type: 'Css',
      text: cssText
    });

    sandbox.spy(first, 'unload');
    sandbox.spy(first, 'markDirty');

    first.parseTree = second.parseTree;

    expect([first.unload, first.markDirty], 'to have calls satisfying', () => {
      first.unload();
      first.markDirty();
    });

    expect(first.text, 'to be', cssText);
  });

  it('should not break when attempting to retrieve the text content of an unloaded Css asset', function() {
    expect(new AssetGraph().addAsset({ type: 'Css' }).text, 'to be undefined');
  });

  it('should set the format of CssFontFaceSrc if available', () => {
    const css = new AssetGraph().addAsset({
      type: 'Css',
      text: `
                @font-face {
                    font-family: 'icomoon';
                    src: url('icomoon.eot');
                    src: url('icomoon.eot?#iefix') format('embedded-opentype'),
                         url('icomoon.woff') format('woff'),
                         url('icomoon.ttf') format('truetype'),
                         url('icomoon.svg#icomoon') format('svg');
                }
            `
    });

    expect(css.findOutgoingRelationsInParseTree(), 'to satisfy', [
      { format: null },
      { format: 'embedded-opentype' },
      { format: 'woff' },
      { format: 'truetype' },
      { format: 'svg' }
    ]);
  });

  describe('#minify', function() {
    it('should minify the Css text', async function() {
      const assetGraph = new AssetGraph();
      const text = 'body {\n    background: red;\n}\n';
      const cssAsset = assetGraph.addAsset({
        type: 'Css',
        text
      });

      expect(cssAsset.text, 'to be', text);
      await cssAsset.minify();
      expect(cssAsset.text, 'to be', 'body{background:red}');
    });

    describe('when the asset does not have an existing source map reference', function() {
      it('should propagate source map information', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/assets/Css/minify/noExistingSourceMap/'
          )
        });
        const [cssAsset] = await assetGraph.loadAssets('index.css');

        await cssAsset.minify();
        await assetGraph.serializeSourceMaps();

        expect(assetGraph, 'to contain asset', 'SourceMap');

        const sourceMap = assetGraph.findAssets({ type: 'SourceMap' })[0];
        expect(
          sourceMap.generatedPositionFor({
            source: `${assetGraph.root}index.css`,
            line: 2,
            column: 4
          }),
          'to equal',
          {
            line: 1,
            column: 5,
            lastColumn: null
          }
        );
      });
    });

    describe('when the asset has a source map already', function() {
      it('should preserve the #sourceMappingURL comment', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/assets/Css/minify/existingSourceMap/'
          )
        });
        const [cssAsset] = await assetGraph.loadAssets('foo.css');
        await assetGraph.populate();

        expect(cssAsset.text, 'to contain', '/*# sourceMappingURL=foo.map */');
        await cssAsset.minify();
        expect(cssAsset.text, 'to contain', '/*# sourceMappingURL=foo.map */');
        await assetGraph.serializeSourceMaps();

        expect(assetGraph, 'to contain asset', 'SourceMap');

        const sourceMap = assetGraph.findAssets({ type: 'SourceMap' })[0];
        expect(
          sourceMap.generatedPositionFor({
            source: `${assetGraph.root}foo.css`,
            line: 2,
            column: 4
          }),
          'to equal',
          {
            line: 1,
            column: 5,
            lastColumn: null
          }
        );
      });
    });

    it('should preserve CSS hacks that depend on raws being present', async function() {
      const assetGraph = new AssetGraph();
      const text = '.foo {\n  *padding-left: 180px;\n}';
      const cssAsset = assetGraph.addAsset({
        type: 'Css',
        text
      });

      expect(cssAsset.text, 'to be', text);

      await cssAsset.minify();
      expect(cssAsset.text, 'to be', '.foo{*padding-left:180px}');
    });

    it('should leave the relations in a functional state', async function() {
      const assetGraph = new AssetGraph();
      const cssAsset = assetGraph.addAsset({
        type: 'Css',
        text:
          '.foo {\n  background-image: url(foo.png);\n}.bar {\n  background-image: url(bar.png);\n}'
      });
      await cssAsset.minify();
      cssAsset.outgoingRelations[0].href = 'blah.png';
      cssAsset.outgoingRelations[1].href = 'quux.png';
      cssAsset.markDirty();
      expect(cssAsset.text, 'to contain', 'blah.png').and(
        'to contain',
        'quux.png'
      );
    });

    it('should leave inline relations in a functional state', async function() {
      const assetGraph = new AssetGraph();
      const cssAsset = assetGraph.addAsset({
        type: 'Css',
        text:
          '@font-face {\nfont-family: "OpenSans";\nsrc: url(data:font/woff2;base64,) format("woff2");\n} .foo {\n background-image: url(data:image/png;base64,);\n}'
      });
      await cssAsset.minify();

      expect(cssAsset.outgoingRelations, 'to satisfy', [
        {
          type: 'CssFontFaceSrc',
          hrefType: 'inline',
          href: /data:font\/woff2;base64/,
          to: {
            contentType: 'font/woff2',
            isInline: true
          }
        },
        {
          type: `CssImage`,
          hrefType: 'inline',
          href: /data:image\/png;base64/,
          to: {
            contentType: 'image/png',
            isInline: true
          }
        }
      ]);
    });

    it('should emit a warn event into errors from cssnano or postcss.parse', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);
      const cssAsset = assetGraph.addAsset({
        url: 'https://example.com/broken.css',
        type: 'Css',
        text: '}'
      });

      await cssAsset.minify();

      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy({
          message: expect.it(
            'to contain',
            'Parse error in https://example.com/broken.css'
          )
        });
      });
    });
  });
});
