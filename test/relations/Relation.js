/*global describe, it*/
const AssetGraph = require('../../lib/AssetGraph');
const expect = require('../unexpected-with-plugins');
const _ = require('lodash');
const pathModule = require('path');
const httpception = require('httpception');

describe('relations/Relation', function() {
  describe('#hrefType', function() {
    it('should handle a test case with urls with different hrefTypes', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/relations/Relation/refreshHref/'
        ),
        canonicalRoot: 'http://canonical.com/'
      });
      await assetGraph.loadAssets('index.html');

      expect(assetGraph, 'to contain asset', {
        type: 'Html',
        isInline: false,
        isLoaded: true
      });
      expect(
        assetGraph,
        'to contain assets',
        { type: 'Html', isInline: false },
        6
      );

      expect(
        _.map(assetGraph.findRelations({ type: 'HtmlAnchor' }), 'href'),
        'to satisfy',
        [
          'relative.html',
          '/rootRelative.html',
          'http://canonical.com/canonical.html',
          '//example.com/protocolRelative.html',
          'http://example.com/absolute.html',
          /^data:/
        ]
      );

      expect(
        _.map(assetGraph.findRelations({ type: 'HtmlAnchor' }), 'hrefType'),
        'to equal',
        [
          'relative',
          'rootRelative',
          'absolute',
          'protocolRelative',
          'absolute',
          'inline'
        ]
      );

      assetGraph
        .findRelations({ type: 'HtmlAnchor' })
        .forEach(function(htmlAnchor) {
          if (htmlAnchor.hrefType === 'inline') {
            htmlAnchor.to.url = 'https://example.com/noLongerInline.html';
          } else {
            htmlAnchor.to.url = htmlAnchor.to.url.replace(/\.html$/, '2.html');
            htmlAnchor.refreshHref();
          }
        });

      expect(
        _.map(assetGraph.findRelations({ type: 'HtmlAnchor' }), 'href'),
        'to equal',
        [
          'relative2.html',
          '/rootRelative2.html',
          'http://canonical.com/canonical2.html',
          '//example.com/protocolRelative2.html',
          'http://example.com/absolute2.html',
          'https://example.com/noLongerInline.html'
        ]
      );
    });

    it('should handle a test case with urls with different hrefTypes, where hrefs have leading white space', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/relations/Relation/refreshHref/'
        ),
        canonicalRoot: 'http://canonical.com/'
      });
      await assetGraph.loadAssets('index.html');

      expect(assetGraph, 'to contain asset', {
        type: 'Html',
        isInline: false,
        isLoaded: true
      });
      expect(
        assetGraph,
        'to contain assets',
        { type: 'Html', isInline: false },
        6
      );

      assetGraph
        .findAssets({ type: 'Html', isLoaded: true })
        .forEach(function(asset) {
          asset.text = asset.text.replace(/href="/g, 'href=" ');
        });

      expect(
        _.map(assetGraph.findRelations({ type: 'HtmlAnchor' }), 'hrefType'),
        'to equal',
        [
          'relative',
          'rootRelative',
          'absolute',
          'protocolRelative',
          'absolute',
          'inline'
        ]
      );
    });

    it('should inline a relation when its hrefType is changed to inline', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/relations/Relation/refreshHref/'
        ),
        canonicalRoot: 'http://canonical.com/'
      });
      await assetGraph.loadAssets('index.html');

      const indexHtml = assetGraph.findAssets({ fileName: 'index.html' })[0];
      const relation = assetGraph.findRelations({
        from: indexHtml,
        to: { fileName: 'relative.html' }
      })[0];

      await relation.to.load();

      relation.hrefType = 'inline';

      expect(indexHtml.text, 'not to contain', 'relative.html').and(
        'to contain',
        '<a data-theone="true" href="data:'
      );

      expect(
        _.map(assetGraph.findRelations({ type: 'HtmlAnchor' }), 'hrefType'),
        'to equal',
        [
          'inline',
          'rootRelative',
          'absolute',
          'protocolRelative',
          'absolute',
          'inline'
        ]
      );
    });
  });

  describe('#canonical', function() {
    const testDataDir = pathModule.resolve(
      pathModule.resolve(
        __dirname,
        '../../testdata/relations/Relation/canonicalHref/'
      )
    );

    it('should populate "canonical" from the local root', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: testDataDir,
        canonicalRoot: 'http://canonical.com/'
      });
      await assetGraph.loadAssets('canonical.html');
      await assetGraph.populate();

      expect(assetGraph.findRelations(), 'to satisfy', [
        {
          canonical: true,
          crossorigin: false,
          hrefType: 'absolute',
          href: 'http://canonical.com/local.js',
          to: {
            url: 'file://' + pathModule.join(testDataDir, 'local.js')
          }
        }
      ]);
    });

    it('should treat "canonical" as non-crossorigin', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: testDataDir,
        canonicalRoot: 'http://canonical.com/'
      });
      await assetGraph.loadAssets('canonical.html');
      await assetGraph.populate();

      expect(assetGraph.findRelations(), 'to satisfy', [
        {
          hrefType: 'absolute',
          canonical: true,
          crossorigin: false
        }
      ]);
    });

    it('should keep "canonical" relative href when moving target asset', async function() {
      httpception();

      const assetGraph = new AssetGraph({
        root: testDataDir,
        canonicalRoot: 'http://canonical.com/'
      });
      await assetGraph.loadAssets('canonical.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain relations', 1);

      const relation = assetGraph.findRelations()[0];

      expect(relation, 'to satisfy', {
        href: 'http://canonical.com/local.js'
      });

      relation.to.fileName = 'movedLocal.js';

      expect(relation, 'to satisfy', {
        href: 'http://canonical.com/movedLocal.js'
      });
    });

    it('should add the canonical root to the href of a local file', async function() {
      const assetGraph = new AssetGraph({
        root: testDataDir,
        canonicalRoot: 'http://canonical.com/'
      });
      await assetGraph.loadAssets('local.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain relations', 1);

      const relation = assetGraph.findRelations()[0];

      expect(relation, 'to satisfy', {
        hrefType: 'relative',
        href: 'local.js',
        to: {
          url: 'file://' + pathModule.join(testDataDir, 'local.js')
        }
      });

      relation.canonical = true;

      expect(relation, 'to satisfy', {
        hrefType: 'relative',
        canonical: true,
        crossorigin: false,
        href: 'http://canonical.com/local.js',
        to: {
          url: 'file://' + pathModule.join(testDataDir, 'local.js')
        }
      });
    });

    it('should silently ignore a canonical setting when there is no canonicalRoot', async function() {
      const assetGraph = new AssetGraph({
        root: testDataDir
      });
      await assetGraph.loadAssets('local.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain relations', 1);

      const relation = assetGraph.findRelations()[0];

      expect(relation, 'to satisfy', {
        hrefType: 'relative',
        href: 'local.js',
        to: {
          url: 'file://' + pathModule.join(testDataDir, 'local.js')
        }
      });

      relation.canonical = true;

      expect(relation, 'to satisfy', {
        hrefType: 'relative',
        canonical: false,
        crossorigin: false,
        href: 'local.js',
        to: {
          url: 'file://' + pathModule.join(testDataDir, 'local.js')
        }
      });
    });

    it('should remove the canonical root from the href of a local file', async function() {
      const assetGraph = new AssetGraph({
        root: testDataDir,
        canonicalRoot: 'http://canonical.com/'
      });
      await assetGraph.loadAssets('canonical.html');
      await assetGraph.populate();

      expect(assetGraph, 'to contain relations', 1);

      const relation = assetGraph.findRelations()[0];

      expect(relation, 'to satisfy', {
        hrefType: 'absolute',
        canonical: true,
        crossorigin: false,
        href: 'http://canonical.com/local.js',
        to: {
          url: 'file://' + pathModule.join(testDataDir, 'local.js')
        }
      });

      relation.canonical = false;

      expect(relation, 'to satisfy', {
        hrefType: 'rootRelative',
        href: '/local.js',
        to: {
          url: 'file://' + pathModule.join(testDataDir, 'local.js')
        }
      });
    });

    it('should handle mailto: protocols where host matches canonicalroot ', async function() {
      const assetGraph = new AssetGraph({
        root: testDataDir,
        canonicalRoot: 'http://bar.com/'
      });
      await assetGraph.loadAssets('mailto.html');
      await assetGraph.populate();

      expect(assetGraph.findRelations(), 'to satisfy', [
        {
          canonical: false
        }
      ]);
    });
  });

  function getTargetFileNames(relations) {
    return _.map(_.map(relations, 'to'), 'url').map(function(url) {
      return url.replace(/^.*\//, '');
    });
  }

  describe('#updateTarget', function() {
    it('should handle a combo test case', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/relations/Relation/updateTarget/'
        )
      });
      await assetGraph.loadAssets('index.html', 'd.js');
      await assetGraph.populate();

      expect(assetGraph, 'to contain assets', 'JavaScript', 4);
      expect(getTargetFileNames(assetGraph.findRelations()), 'to equal', [
        'a.js',
        'b.js',
        'c.js'
      ]);
      expect(
        getTargetFileNames(assetGraph.findRelations({ type: 'HtmlScript' })),
        'to equal',
        ['a.js', 'b.js', 'c.js']
      );

      const htmlAsset = assetGraph.findAssets({ type: 'Html' })[0];
      expect(
        getTargetFileNames(
          assetGraph.findRelations({ from: htmlAsset, type: 'HtmlScript' })
        ),
        'to equal',
        ['a.js', 'b.js', 'c.js']
      );

      const relation = assetGraph.findRelations({
        to: { fileName: 'b.js' }
      })[0];
      relation.to = assetGraph.findAssets({ fileName: 'd.js' })[0];
      relation.refreshHref();

      expect(getTargetFileNames(assetGraph.findRelations()), 'to equal', [
        'a.js',
        'd.js',
        'c.js'
      ]);

      expect(
        getTargetFileNames(assetGraph.findRelations({ type: 'HtmlScript' })),
        'to equal',
        ['a.js', 'd.js', 'c.js']
      );

      expect(
        getTargetFileNames(
          assetGraph.findRelations({ from: htmlAsset, type: 'HtmlScript' })
        ),
        'to equal',
        ['a.js', 'd.js', 'c.js']
      );
    });
  });

  it('should not add index.html to a relation that does not have it', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/Relation/indexHtmlOnFile/'
      )
    });
    await assetGraph.loadAssets('linker.html');
    await assetGraph.populate();

    const htmlAnchor = assetGraph.findRelations({ type: 'HtmlAnchor' })[0];
    expect(htmlAnchor.href, 'to equal', '/');
    htmlAnchor.to.url = 'hey/index.html';
    expect(htmlAnchor.href, 'to equal', '/hey/');
  });

  describe('#crossorigin', function() {
    it('should evaluate to false for a relation that points from file: to file:', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'file://' + pathModule.resolve(__dirname, 'index.html'),
        text:
          '<!DOCTYPE html><html><head></head><body><a href="other.html">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be false');
    });

    it('should evaluate to true for a relation that points from file: to http:', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'fil://' + pathModule.resolve(__dirname, 'index.html'),
        text:
          '<!DOCTYPE html><html><head></head><body><a href="http://example.com/">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be true');
    });

    it('should evaluate to true for a relation that points to a different hostname via http', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'http://example.com/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><a href="http://anotherexample.com/">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be true');
    });

    it('should evaluate to false for an absolute relation that points at the same hostname via http', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'http://example.com/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><a href="http://example.com/other.html">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be false');
    });

    it('should evaluate to true for an absolute relation that points at the same scheme and hostname, but a different port', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'http://example.com:1337/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><a href="http://example.com:1338/other.html">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be true');
    });

    it('should take the default http port into account when the source url omits it', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'http://example.com/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><a href="http://example.com:80/other.html">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be false');
    });

    it('should take the default http port into account when the target url omits it', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'http://example.com:80/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><a href="http://example.com/other.html">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be false');
    });

    it('should take the default https port into account when the source url omits it', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'https://example.com/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><a href="https://example.com:443/other.html">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be false');
    });

    it('should take the default https port into account when the target url omits it', async function() {
      const assetGraph = new AssetGraph({ root: __dirname });
      await assetGraph.loadAssets({
        type: 'Html',
        url: 'https://example.com:443/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><a href="https://example.com/other.html">Link</a></body></html>'
      });

      expect(assetGraph.findRelations()[0].crossorigin, 'to be false');
    });
  });

  describe('#inline', function() {
    describe('on a non-inline relation', function() {
      it('should update the href of all outgoing relations of the target asset', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/relations/Relation/inlineExternalRelation/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        assetGraph
          .findAssets({ type: 'Html' })[0]
          .outgoingRelations[0].inline();
        expect(
          assetGraph.findRelations({ type: 'CssImage' })[0].href,
          'to equal',
          'styles/foo.png'
        );
      });

      it('should set the incomingInlineRelation property of the target asset', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/relations/Relation/inlineExternalRelation/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        const cssImage = assetGraph.findRelations({ type: 'CssImage' })[0];
        cssImage.inline();
        expect(cssImage.to.incomingInlineRelation, 'to be', cssImage);
      });
    });
  });

  describe('#to', function() {
    describe('when used as a setter', function() {
      describe('when an asset config is passed', function() {
        it('should add the target asset to the graph', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            url: 'https://example.com/',
            text: `
                            <!DOCTYPE html>
                            <html>
                                <head></head>
                                <body>
                                    <a href="https://example.com/other.html">Link</a>
                                </body>
                            </html>
                        `
          });

          htmlAsset.outgoingRelations[0].to = 'https://blah.com/whataboutthis/';

          expect(
            htmlAsset.text,
            'to contain',
            '<a href="https://blah.com/whataboutthis/">'
          );

          expect(assetGraph, 'to contain asset', {
            type: undefined,
            url: 'https://blah.com/whataboutthis/'
          });

          htmlAsset.outgoingRelations[0].to = {
            url: 'https://whatdoyouknow.com/whataboutthis/'
          };

          expect(assetGraph, 'to contain asset', {
            type: undefined,
            url: 'https://whatdoyouknow.com/whataboutthis/'
          });
        });
      });

      describe('when an existing asset is passed', function() {
        it('should automatically refresh the href of the relation', function() {
          const assetGraph = new AssetGraph();
          const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            url: 'https://example.com/',
            text: `
                            <!DOCTYPE html>
                            <html>
                                <head></head>
                                <body>
                                    <a href="https://example.com/other.html">Link</a>
                                </body>
                            </html>
                        `
          });

          const imageAsset = assetGraph.addAsset({
            type: 'Png',
            url: 'https://example.com/images/foo.png'
          });

          htmlAsset.outgoingRelations[0].to = imageAsset;

          expect(
            htmlAsset.text,
            'to contain',
            '<a href="https://example.com/images/foo.png">'
          );
        });
      });
    });
  });

  describe('#refreshHref', function() {
    it('should preserve (and not double) the fragment identifier when the target asset is unresolved', function() {
      const assetGraph = new AssetGraph();
      const svgAsset = assetGraph.addAsset({
        type: 'Svg',
        url: 'https://example.com/image.svg',
        text:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<svg width="82px" height="90px" viewBox="0 0 82 90" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n' +
          '    <defs>\n' +
          '        <polygon id="path-1" points="2.57083634e-05 42.5179483 48.5419561 42.5179483 48.5419561 0.268335496 2.57083634e-05 0.268335496"></polygon>\n' +
          '    </defs>\n' +
          '    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n' +
          '        <g id="blabla" transform="translate(-377.000000, -479.000000)">\n' +
          '            <g id="Page-1" transform="translate(418.770235, 524.226071) rotate(1.000000) translate(-418.770235, -524.226071) translate(376.770235, 478.726071)">\n' +
          '                <polygon id="Fill-1" fill="#CBCACA" points="29.4199768 11.3513514 0 17.8208401 0.478874723 44.5945946 30 43.7301168"></polygon>\n' +
          '                <g id="Group-39" transform="translate(34.054054, 47.027027)">\n' +
          '                    <mask id="mask-2" fill="white">\n' +
          '                        <use xlink:href="#path-1"></use>\n' +
          '                    </mask>\n' +
          '                    <g id="Clip-38"></g>\n' +
          '                    <polygon id="Fill-37" fill="#CBCACA" mask="url(#mask-2)" points="47.7852768 0.268335496 2.57083634e-05 0.657295986 0.594559438 33.8575146 48.5419561 42.5185782"></polygon>\n' +
          '                </g>\n' +
          '            </g>\n' +
          '        </g>\n' +
          '    </g>\n' +
          '</svg>'
      });

      svgAsset.url = 'https://example.com/somewhereelse/image.svg';
      expect(svgAsset.text, 'to contain', '<use xlink:href="#path-1"></use>');

      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://example.com/index.html',
        text: '<img src="somewhereelse/image.svg">'
      });

      htmlAsset.outgoingRelations[0].inline();

      expect(svgAsset.text, 'to contain', '<use xlink:href="#path-1"></use>');
    });
  });

  describe('#fragment', function() {
    describe('invoked as a getter', function() {
      it('should be the empty string when the relation href does not contain a fragment identifier', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<a href="https://example.com/other.html">Link</a>'
        });

        expect(htmlAsset.outgoingRelations[0].fragment, 'to equal', '');
      });

      it('should be undefined for an inline relation', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<style>body { color: maroon; }</style>'
        });

        expect(htmlAsset.outgoingRelations[0].fragment, 'to be undefined');
      });

      it('should be the fragment including the # when the href does contain a fragment identifier', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<a href="https://example.com/other.html#blabla">Link</a>'
        });

        expect(htmlAsset.outgoingRelations[0].fragment, 'to equal', '#blabla');
      });
    });

    describe('invoked as a setter', function() {
      it('should throw if the fragment is a non-empty string that does not begin with #', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<a href="https://example.com/other.html">Link</a>'
        });

        expect(
          () => (htmlAsset.outgoingRelations[0].fragment = 'foo'),
          'to throw',
          'The fragment must begin with a # or be empty'
        );
      });

      it('should introduce a fragment identifier to the href of a relation that does not already have one', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<a href="https://example.com/other.html">Link</a>'
        });

        htmlAsset.outgoingRelations[0].fragment = '#yadda';

        expect(
          htmlAsset.text,
          'to contain',
          '<a href="https://example.com/other.html#yadda">'
        );
      });

      it('should replace the fragment identifier of a relation that already had one', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<a href="https://example.com/other.html#blabla">Link</a>'
        });

        htmlAsset.outgoingRelations[0].fragment = '#yadda';

        expect(
          htmlAsset.text,
          'to contain',
          '<a href="https://example.com/other.html#yadda">'
        );
      });

      it('should remove the fragment if undefined is passed', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<a href="https://example.com/other.html#blabla">Link</a>'
        });

        htmlAsset.outgoingRelations[0].fragment = undefined;

        expect(
          htmlAsset.text,
          'to contain',
          '<a href="https://example.com/other.html">'
        );
      });

      it('should remove the fragment if the empty string is passed', function() {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
          type: 'Html',
          url: 'https://example.com/',
          text: '<a href="https://example.com/other.html#blabla">Link</a>'
        });

        htmlAsset.outgoingRelations[0].fragment = '';

        expect(
          htmlAsset.text,
          'to contain',
          '<a href="https://example.com/other.html">'
        );
      });
    });
  });

  it('should preserve the fragment when an asset is externalized', function() {
    const assetGraph = new AssetGraph();
    const htmlAsset = assetGraph.addAsset({
      type: 'Html',
      url: 'https://example.com/',
      text:
        '<img src="data:image/svg+xml;base64,CiAgICAgICAgICAgICAgICA8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJVVEYtOCI/PgogICAgICAgICAgICAgICAgPHN2ZyB3aWR0aD0iODJweCIgaGVpZ2h0PSI5MHB4IiB2aWV3Qm94PSIwIDAgODIgOTAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgICAgICAgICAgICAgICAgICA8ZyBpZD0iaGVhcnQiPgogICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMzIsMTEuMmMwLDIuNy0xLjIsNS4xLTMsNi44bDAsMEwxOSwyOGMtMSwxLTIsMi0zLDJzLTItMS0zLTJMMywxOGMtMS45LTEuNy0zLTQuMS0zLTYuOEMwLDYuMSw0LjEsMiw5LjIsMgogICAgICAgICAgICAgICAgICAgICAgICBjMi43LDAsNS4xLDEuMiw2LjgsM2MxLjctMS45LDQuMS0zLDYuOC0zQzI3LjksMS45LDMyLDYuMSwzMiwxMS4yeiIvPgogICAgICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgICAgIDwvc3ZnPgogICAgICAgICAgICA=#yadda">'
    });

    htmlAsset.outgoingRelations[0].to.url = 'https://example.com/image.svg';

    expect(
      htmlAsset.text,
      'to contain',
      '<img src="https://example.com/image.svg#yadda">'
    );
  });
});
