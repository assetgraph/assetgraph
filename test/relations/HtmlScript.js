const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const _ = require('lodash');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlScript', function() {
  it('should inline a script', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlScript/combo'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    const firstScript = assetGraph.findRelations({ type: 'HtmlScript' })[0];

    expect(firstScript.node.hasAttribute('src'), 'to be', true);
    expect(firstScript.node.getAttribute('src'), 'to be', 'externalNoType.js');

    firstScript.inline();

    expect(firstScript.node.hasAttribute('src'), 'to be', false);

    expect(firstScript.node.textContent, 'to equal', "var external='noType'");
  });

  it('should handle a test case with existing <script> elements', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlScript/combo'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain relations', 'HtmlScript', 4);
    expect(_.map(assetGraph.findRelations(), 'href'), 'to equal', [
      'externalNoType.js',
      undefined,
      'externalWithTypeTextJavaScript.js',
      undefined
    ]);
  });

  it('should attach script node before the first existing script node when using the `first` position', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlScript/combo'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    const html = assetGraph.findAssets({ type: 'Html' })[0];
    const firstScript = assetGraph.findRelations({ type: 'HtmlScript' })[0];
    const document = html.parseTree;

    // Test attaching 'first' with first existing script in body
    const relation = html.addRelation(
      {
        type: 'HtmlScript',
        to: {
          url: 'firstRelationAsset.js',
          text: '"use strict"'
        }
      },
      'first'
    );

    expect(relation.node.parentNode, 'not to be', document.head);
    expect(relation.node.parentNode, 'to be', document.body);
    expect(relation.node, 'not to be', document.body.firstChild);
    expect(relation.node, 'to be', firstScript.node.previousSibling);

    // Test attaching 'first' with first existing script in head
    document.head.appendChild(firstScript.node);
    relation.attach('first');

    expect(relation.node.parentNode, 'not to be', document.body);
    expect(relation.node.parentNode, 'to be', document.head);
    expect(relation.node, 'to be', firstScript.node.previousSibling);
  });

  it('should attach script node as the last node in document.body if no other scripts exist when using the `first` position', function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlScript/combo'
      )
    });

    const htmlAsset = assetGraph.addAsset({
      type: 'Html',
      url: 'https://example.com/index.html',
      text: '<html><head><title>first test</title></head></html>'
    });

    const document = htmlAsset.parseTree;
    const relation = htmlAsset.addRelation(
      {
        type: 'HtmlScript',
        to: {
          url: 'firstRelationAsset.js',
          text: '"use strict";'
        }
      },
      'first'
    );

    expect(relation.node.parentNode, 'not to be', document.head);
    expect(relation.node.parentNode, 'to be', document.body);
    expect(relation.node, 'to be', document.body.lastChild);
  });

  it('should attach script node before another when using the `before` position', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlScript/combo'
      )
    });

    const htmlAsset = assetGraph.addAsset({
      type: 'Html',
      url: 'https://example.com/index.html',
      text:
        '<html><head><title>first test</title><script>"use strict";</script><style>body { background: red; }</style></head></html>'
    });

    const firstScript = assetGraph.findRelations({ type: 'HtmlScript' })[0];
    const document = htmlAsset.parseTree;
    const relation = htmlAsset.addRelation(
      {
        type: 'HtmlScript',
        to: {
          url: 'firstRelationAsset.js',
          text: '"use strict";'
        }
      },
      'before',
      firstScript
    );

    expect(relation.node.parentNode, 'not to be', document.body);
    expect(relation.node.parentNode, 'to be', document.head);
    expect(relation.node, 'to be', firstScript.node.previousSibling);
  });

  it('should attach a script node after another when using the `after` position', function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlScript/combo'
      )
    });

    const htmlAsset = assetGraph.addAsset({
      type: 'Html',
      url: 'https://example.com/index.html',
      text:
        '<html><head><title>first test</title><script>"use strict";</script><style>body { background: red; }</style></head></html>'
    });

    const firstScript = assetGraph.findRelations({ type: 'HtmlScript' })[0];
    const document = htmlAsset.parseTree;
    const relation = htmlAsset.addRelation(
      {
        type: 'HtmlScript',
        to: {
          url: 'firstRelationAsset.js',
          text: '"use strict";'
        }
      },
      'after',
      firstScript
    );

    expect(relation.node.parentNode, 'not to be', document.body);
    expect(relation.node.parentNode, 'to be', document.head);
    expect(relation.node, 'to be', firstScript.node.nextSibling);
  });

  describe('#async', function() {
    it('should support the async attribute when creating a relation', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/relations/HtmlScript/combo'
        )
      });

      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://example.com/index.html',
        text: '<!DOCTYPE html><html><head></head><body></body></html>'
      });

      htmlAsset.addRelation(
        {
          type: 'HtmlScript',
          async: true,
          href: 'https://example.com/script.js'
        },
        'first'
      );

      expect(
        htmlAsset.text,
        'to equal',
        '<!DOCTYPE html><html><head></head><body><script async="async" src="script.js"></script></body></html>'
      );
    });

    it('should support retrieving the async attribute from an attached relation', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/relations/HtmlScript/combo'
        )
      });

      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://example.com/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><script async src="script.js"></script></body></html>'
      });

      expect(htmlAsset.outgoingRelations, 'to satisfy', [{ async: true }]);
    });
  });

  describe('#defer', function() {
    it('should support the defer attribute when creating a relation', function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/relations/HtmlScript/combo'
        )
      });

      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://example.com/index.html',
        text: '<!DOCTYPE html><html><head></head><body></body></html>'
      });

      htmlAsset.addRelation(
        {
          type: 'HtmlScript',
          defer: true,
          href: 'https://example.com/script.js'
        },
        'first'
      );

      expect(
        htmlAsset.text,
        'to equal',
        '<!DOCTYPE html><html><head></head><body><script defer="defer" src="script.js"></script></body></html>'
      );
    });

    it('should support retrieving the defer attribute from an attached relation', function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/relations/HtmlScript/combo'
        )
      });

      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://example.com/index.html',
        text:
          '<!DOCTYPE html><html><head></head><body><script defer src="script.js"></script></body></html>'
      });

      expect(htmlAsset.outgoingRelations, 'to satisfy', [{ defer: true }]);
    });
  });

  it('should populate an inline <script type=module>', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlScript/moduleInline/'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain relation', 'HtmlScript');
    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
  });

  it('should follow an external <script type=module>', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlScript/moduleExternal/'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain relation', 'HtmlScript');
    expect(assetGraph, 'to contain asset', 'JavaScript');
  });
});
