const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/Text', function() {
  describe('#text', function() {
    describe('invoked as a getter', function() {
      it('should get text of Text asset with rawSrc property', function() {
        expect(
          new AssetGraph().addAsset({
            type: 'Text',
            rawSrc: Buffer.from('Hello, world!\u263a')
          }).text,
          'to equal',
          'Hello, world!\u263a'
        );
      });

      it('should get text of AssetGraph.Text with text property', function() {
        expect(
          new AssetGraph().addAsset({
            type: 'Text',
            text: 'Hello, world!\u263a'
          }).text,
          'to equal',
          'Hello, world!\u263a'
        );
      });
    });

    describe('invoked as a setter', function() {
      it('should update the text', function() {
        const textAsset = new AssetGraph().addAsset({
          type: 'Text',
          rawSrc: Buffer.from('Hello, world!\u263a')
        });
        textAsset.text = 'foo';
        expect(textAsset.text, 'to equal', 'foo');
      });

      it('should set the cached _text', function() {
        const textAsset = new AssetGraph().addAsset({
          type: 'Text',
          rawSrc: Buffer.from('Hello, world!\u263a')
        });
        textAsset.text = 'foo';
        expect(textAsset._text, 'to equal', 'foo');
      });

      it('should remove _lastKnownByteLength', function() {
        const textAsset = new AssetGraph().addAsset({
          type: 'Text',
          rawSrc: Buffer.from('Hello, world!\u263a')
        });
        expect(textAsset._lastKnownByteLength, 'to equal', 16);
        textAsset.text = 'foo';
        expect(textAsset._lastKnownByteLength, 'to be undefined');
      });

      describe('with a subclass that has a parseTree', function() {
        it('should set the cached _text', function() {
          const textAsset = new AssetGraph().addAsset({
            type: 'JavaScript',
            rawSrc: Buffer.from('foo;')
          });
          textAsset.text = 'bar;';
          expect(textAsset._text, 'to equal', 'bar;');
        });
      });
    });
  });

  describe('#rawSrc', function() {
    describe('invoked as a getter', function() {
      it('should get rawSrc of AssetGraph.Text with rawSrc property', function() {
        expect(
          new AssetGraph().addAsset({
            type: 'Text',
            rawSrc: Buffer.from('Hello, world!\u263a', 'utf-8')
          }).rawSrc,
          'to equal',
          Buffer.from('Hello, world!\u263a', 'utf-8')
        );
      });

      it('should get rawSrc of AssetGraph.Text with text property', function() {
        expect(
          new AssetGraph().addAsset({
            type: 'Text',
            text: 'Hello, world!\u263a'
          }).rawSrc,
          'to equal',
          Buffer.from('Hello, world!\u263a', 'utf-8')
        );
      });
    });

    describe('invoked as a setter', function() {
      it('should update the rawSrc', function() {
        const asset = new AssetGraph().addAsset({
          type: 'Asset',
          rawSrc: Buffer.from('Hello, world!\u263a')
        });
        asset.rawSrc = Buffer.from('foo');
        expect(asset.rawSrc, 'to equal', Buffer.from('foo'));
      });

      it('should update _lastKnownByteLength', function() {
        const asset = new AssetGraph().addAsset({
          type: 'Asset',
          rawSrc: Buffer.from('Hello, world!\u263a')
        });
        expect(asset._lastKnownByteLength, 'to equal', 16);
        asset.rawSrc = Buffer.from('foo');
        expect(asset._lastKnownByteLength, 'to equal', 3);
      });
    });
  });
});
