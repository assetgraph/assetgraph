const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlStyle', function() {
  let htmlAsset;
  let cssAsset;
  let assetGraph;
  beforeEach(function() {
    assetGraph = new AssetGraph({ root: __dirname });
    cssAsset = assetGraph.addAsset({
      type: 'Css',
      url: `${assetGraph.root}injected.css`,
      text: 'div{color:red}'
    });
  });

  function initial(html) {
    htmlAsset = new AssetGraph().addAsset({
      type: 'Html',
      url: `${assetGraph.root}index.html`,
      text: html
    });
    assetGraph.addAsset(htmlAsset);
  }

  describe('#media', function() {
    describe('invoked as a getter', function() {
      it('should retrieve the trimmed media attribute', function() {
        initial(
          '<!DOCTYPE html><html><head><style media=" projection screen ">body{color:#000};</style></head><body></body></html>'
        );
        expect(
          assetGraph.findRelations({ type: 'HtmlStyle' })[0].media,
          'to equal',
          'projection screen'
        );
      });
    });

    describe('invoked as a setter', function() {
      it('should trim and update the media attribute', function() {
        initial(
          '<!DOCTYPE html><html><head><style>body{color:#000};</style></head><body></body></html>'
        );
        assetGraph.findRelations({ type: 'HtmlStyle' })[0].media =
          ' projection screen ';
        expect(
          assetGraph.findAssets({ type: 'Html' })[0].text,
          'to contain',
          '<style media="projection screen">'
        );
      });

      it('should remove media attribute when set to a falsy value', function() {
        initial(
          '<!DOCTYPE html><html><head><style media="projection">body{color:#000};</style></head><body></body></html>'
        );
        assetGraph.findRelations({ type: 'HtmlStyle' })[0].media = undefined;
        expect(
          assetGraph.findAssets({ type: 'Html' })[0].text,
          'to contain',
          '<style>'
        );
      });
    });
  });

  describe('#attach', function() {
    describe('when there are existing HtmlStyle relations in <head>', function() {
      beforeEach(function() {
        initial(
          '<!DOCTYPE html><html><head><style>body{color:#000};</style><style>body{color:#111};</style></head><body></body></html>'
        );
      });

      describe('with position=first', function() {
        it('should attach the relation before the first HtmlStyle in <head>', function() {
          htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: cssAsset
            },
            'first'
          );
          expect(
            htmlAsset.text,
            'to contain',
            '<link rel="stylesheet" href="injected.css"><style>body{color:#000};</style>'
          );
        });
      });

      describe('with position=last', function() {
        it('should attach the relation after the last HtmlStyle in <head>', function() {
          htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: cssAsset
            },
            'last'
          );
          expect(
            htmlAsset.text,
            'to contain',
            '<style>body{color:#111};</style><link rel="stylesheet" href="injected.css">'
          );
        });
      });
    });

    describe('when there are existing HtmlStyle relations in <head> and <body>', function() {
      beforeEach(function() {
        initial(
          '<!DOCTYPE html><html><head><style>body{color:#000};</style><style>body{color:#111};</style></head><body><style>body{color:#222};</style><style>body{color:#333};</style></body></html>'
        );
      });

      describe('with position=first', function() {
        it('should attach the relation before the first HtmlStyle in <head>', function() {
          htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: cssAsset
            },
            'first'
          );
          expect(
            htmlAsset.text,
            'to contain',
            '<link rel="stylesheet" href="injected.css"><style>body{color:#000};</style>'
          );
        });
      });

      describe('with position=last', function() {
        it('should attach the relation after the last HtmlStyle in <body>', function() {
          htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: cssAsset
            },
            'last'
          );
          expect(
            htmlAsset.text,
            'to contain',
            '<style>body{color:#333};</style><link rel="stylesheet" href="injected.css">'
          );
        });
      });
    });

    describe('when there are existing HtmlStyle relations in <body>', function() {
      beforeEach(function() {
        initial(
          '<!DOCTYPE html><html><head></head><body><style>body{color:#222};</style><style>body{color:#333};</style></body></html>'
        );
      });

      describe('with position=first', function() {
        it('should attach the relation before the first HtmlStyle in <body>', function() {
          htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: cssAsset
            },
            'first'
          );
          expect(
            htmlAsset.text,
            'to contain',
            '<link rel="stylesheet" href="injected.css"><style>body{color:#222};</style>'
          );
        });
      });

      describe('with position=last', function() {
        it('should attach the relation after the last HtmlStyle in <body>', function() {
          htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: cssAsset
            },
            'last'
          );
          expect(
            htmlAsset.text,
            'to contain',
            '<style>body{color:#333};</style><link rel="stylesheet" href="injected.css">'
          );
        });
      });
    });

    describe('when there are no existing HtmlStyle relations', function() {
      beforeEach(function() {
        initial(
          '<!DOCTYPE html><html><head><meta foo="bar"></head><body></body></html>'
        );
      });

      describe('with position=first', function() {
        it('should attach the relation to the end of <head>', function() {
          htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: cssAsset
            },
            'first'
          );
          expect(
            htmlAsset.text,
            'to contain',
            '<meta foo="bar"><link rel="stylesheet" href="injected.css">'
          );
        });
      });

      describe('with position=last', function() {
        it('should attach the relation to the end of <head>', function() {
          htmlAsset.addRelation(
            {
              type: 'HtmlStyle',
              to: cssAsset
            },
            'last'
          );
          expect(
            htmlAsset.text,
            'to contain',
            '<meta foo="bar"><link rel="stylesheet" href="injected.css">'
          );
        });
      });
    });

    it('should support the media property when adding an inline stylesheet', function() {
      const htmlAsset = new AssetGraph().addAsset({
        type: 'Html',
        url: 'http://example.com/',
        text: '<!DOCTYPE html><html><head></head><body></body></html>'
      });
      htmlAsset.addRelation({
        type: 'HtmlStyle',
        hrefType: 'inline',
        media: 'projection',
        to: {
          type: 'Css',
          text: 'body { color: maroon; }'
        }
      });
      expect(
        htmlAsset.text,
        'to contain',
        '<style media="projection">body { color: maroon; }</style>'
      );
    });

    it('should support the media property when adding an external stylesheet', function() {
      const htmlAsset = new AssetGraph().addAsset({
        type: 'Html',
        url: `${assetGraph.root}index.html`,
        text: '<!DOCTYPE html><html><head></head><body></body></html>'
      });
      htmlAsset.addRelation(
        {
          type: 'HtmlStyle',
          media: 'projection',
          to: {
            type: 'Css',
            url: 'http://example.com/styles.css',
            text: 'body { color: maroon; }'
          }
        },
        'first'
      );
      expect(
        htmlAsset.text,
        'to contain',
        '<link rel="stylesheet" media="projection" href="http://example.com/styles.css">'
      );
    });
  });
});
