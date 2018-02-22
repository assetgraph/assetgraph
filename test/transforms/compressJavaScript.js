/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
const AssetGraph = require('../../lib/AssetGraph');
const errors = require('../../lib/errors');

describe('transforms/compressJavaScript', function() {
  [undefined, 'uglifyJs'].forEach(function(compressorName) {
    it(
      'with compressorName=' +
        compressorName +
        ' should yield a compressed JavaScript',
      async function() {
        const assetGraph = new AssetGraph();
        await assetGraph.loadAssets(
          new AssetGraph().addAsset({
            type: 'JavaScript',
            text: 'var foo = 123;'
          })
        );
        await assetGraph.compressJavaScript(
          { type: 'JavaScript' },
          compressorName
        );

        expect(assetGraph, 'to contain asset', 'JavaScript');
        expect(
          assetGraph.findAssets({ type: 'JavaScript' })[0].text,
          'to match',
          /^var foo=123;?\n?$/
        );
      }
    );
  });

  it('should warn when UglifyJS runs into a parse error and leave the asset unchanged', async function() {
    const warnSpy = sinon.spy().named('warn');
    const assetGraph = new AssetGraph();
    assetGraph.on('warn', warnSpy);
    assetGraph.addAsset({
      url: 'https://example.com/script.js',
      type: 'JavaScript',
      text: 'var foo = `123`;'
    });
    await assetGraph.compressJavaScript({ type: 'JavaScript' });

    expect(warnSpy, 'to have calls satisfying', function() {
      warnSpy(
        new errors.ParseError(
          "Parse error in https://example.com/script.js\nUnexpected character '`' (line 1, column 11)"
        )
      );
    });
    expect(assetGraph, 'to contain asset', 'JavaScript');
    expect(
      assetGraph.findAssets({ type: 'JavaScript' })[0].text,
      'to equal',
      'var foo = `123`;'
    );
  });

  describe('ie8 handling', function() {
    it('should honor assetGraph.javaScriptSerializationOptions.ie8 === true', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);

      assetGraph.javaScriptSerializationOptions = { ie8: true };
      assetGraph.addAsset(
        new AssetGraph().addAsset({
          type: 'JavaScript',
          text: 'foo["catch"] = 123;'
        })
      );

      await assetGraph.compressJavaScript({ type: 'JavaScript' });

      expect(warnSpy, 'was not called');
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' })[0].text,
        'to equal',
        'foo["catch"]=123;'
      );
    });

    it('should honor assetGraph.javaScriptSerializationOptions.ie8 === false', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);

      assetGraph.javaScriptSerializationOptions = { ie8: false };
      assetGraph.addAsset(
        new AssetGraph().addAsset({
          type: 'JavaScript',
          text: 'foo["catch"] = 123;'
        })
      );

      await assetGraph.compressJavaScript({ type: 'JavaScript' });

      expect(warnSpy, 'was not called');
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' })[0].text,
        'to equal',
        'foo.catch=123;'
      );
    });

    it('should honor asset.serializationOptions.ie8 === true', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);

      const asset = new AssetGraph().addAsset({
        type: 'JavaScript',
        text: 'foo["catch"] = 123;'
      });
      asset.serializationOptions = { ie8: true };
      assetGraph.addAsset(asset);

      await assetGraph.compressJavaScript({ type: 'JavaScript' });

      expect(warnSpy, 'was not called');
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' })[0].text,
        'to equal',
        'foo["catch"]=123;'
      );
    });

    it('should honor asset.serializationOptions.ie8 === false', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);

      const asset = new AssetGraph().addAsset({
        type: 'JavaScript',
        text: 'foo["catch"] = 123;'
      });
      asset.serializationOptions = { ie8: false };
      assetGraph.addAsset(asset);

      await assetGraph.compressJavaScript({ type: 'JavaScript' });

      expect(warnSpy, 'was not called');
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' })[0].text,
        'to equal',
        'foo.catch=123;'
      );
    });

    it('should honor assetGraph.javaScriptSerializationOptions.screw_ie8 === false', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);

      assetGraph.javaScriptSerializationOptions = { screw_ie8: false };
      assetGraph.addAsset(
        new AssetGraph().addAsset({
          type: 'JavaScript',
          text: 'foo["catch"] = 123;'
        })
      );

      await assetGraph.compressJavaScript({ type: 'JavaScript' });

      expect(warnSpy, 'was not called');
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' })[0].text,
        'to equal',
        'foo["catch"]=123;'
      );
    });

    it('should honor assetGraph.javaScriptSerializationOptions.screw_ie8 === true', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);

      assetGraph.javaScriptSerializationOptions = { screw_ie8: true };
      assetGraph.addAsset(
        new AssetGraph().addAsset({
          type: 'JavaScript',
          text: 'foo["catch"] = 123;'
        })
      );

      await assetGraph.compressJavaScript({ type: 'JavaScript' });

      expect(warnSpy, 'was not called');
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' })[0].text,
        'to equal',
        'foo.catch=123;'
      );
    });

    it('should honor asset.serializationOptions.screw_ie8 === false', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);

      const asset = new AssetGraph().addAsset({
        type: 'JavaScript',
        text: 'foo["catch"] = 123;'
      });
      asset.serializationOptions = { screw_ie8: false };
      assetGraph.addAsset(asset);

      await assetGraph.compressJavaScript({ type: 'JavaScript' });

      expect(warnSpy, 'was not called');
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' })[0].text,
        'to equal',
        'foo["catch"]=123;'
      );
    });

    it('should honor asset.serializationOptions.screw_ie8 === true', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph();
      assetGraph.on('warn', warnSpy);

      const asset = new AssetGraph().addAsset({
        type: 'JavaScript',
        text: 'foo["catch"] = 123;'
      });
      asset.serializationOptions = { screw_ie8: true };
      assetGraph.addAsset(asset);

      await assetGraph.compressJavaScript({ type: 'JavaScript' });

      expect(warnSpy, 'was not called');
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' })[0].text,
        'to equal',
        'foo.catch=123;'
      );
    });
  });

  // Tracking https://github.com/mishoo/UglifyJS2/issues/2313
  it('should not break code that uses getters and setters', async function() {
    const warnSpy = sinon.spy().named('warn');
    const assetGraph = new AssetGraph();
    assetGraph.on('warn', warnSpy);
    await assetGraph.loadAssets({
      type: 'JavaScript',
      url: 'http://example.com/script.js',
      text:
        'var foo = { _bar: 0 };\n' +
        '\n' +
        "Object.defineProperty(foo, 'bar', {\n" +
        '    get: function () {\n' +
        '        // Side effect in getter: Increment this._bar\n' +
        '        this._bar += 1;\n' +
        '        return this._bar;\n' +
        '    },\n' +
        '    set: function (bar) {\n' +
        '        this._bar = bar;\n' +
        '    }\n' +
        '});\n' +
        '\n' +
        '(function () {\n' +
        '    this.foo.bar++;\n' +
        '    if (this.foo.bar > 2) {\n' +
        "        console.log('yay');\n" +
        '    }\n' +
        '}.call({foo: foo}));'
    });
    await assetGraph.compressJavaScript({ type: 'JavaScript' });

    expect(warnSpy, 'was not called');
    expect(assetGraph, 'to contain asset', 'JavaScript');
    expect(
      assetGraph.findAssets({ type: 'JavaScript' })[0].text,
      'to contain',
      'this.foo.bar++'
    )
      .and('to contain', 'this.foo.bar>')
      .and('not to contain', '++this.foo.bar');
  });

  // https://github.com/mishoo/UglifyJS2/issues/180
  it('should not break code that has a comment before EOF', async function() {
    const assetGraph = new AssetGraph();
    await assetGraph.loadAssets({
      type: 'JavaScript',
      url: 'http://example.com/script.js',
      text: 'var foo = 123;//@preserve bar'
    });
    await assetGraph.compressJavaScript({ type: 'JavaScript' });

    expect(
      assetGraph.findAssets({ type: 'JavaScript' })[0].text,
      'to equal',
      'var foo=123;//@preserve bar'
    );
  });

  it('should compress an inline asset', async function() {
    const assetGraph = new AssetGraph();
    const htmlAsset = assetGraph.addAsset({
      type: 'Html',
      text: `
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body>
                        <script>alert('foo' + 'bar');</script>
                    </body>
                </html>
            `
    });

    await assetGraph.compressJavaScript();

    expect(
      htmlAsset.outgoingRelations[0].to.text,
      'to equal',
      'alert("foobar");'
    );
  });
});
