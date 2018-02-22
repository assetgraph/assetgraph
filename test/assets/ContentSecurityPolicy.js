const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/ContentSecurityPolicy', function() {
  it('should handle a test case with existing Content-Security-Policy meta tags', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/ContentSecurityPolicy/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 3);
    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain assets', 'ContentSecurityPolicy', 2);

    expect(assetGraph, 'to contain relations', 'HtmlContentSecurityPolicy', 2);

    const contentSecurityPolicies = assetGraph.findAssets({
      type: 'ContentSecurityPolicy'
    });
    expect(contentSecurityPolicies[0].parseTree, 'to equal', {
      defaultSrc: ["'self'"],
      styleSrc: ["'unsafe-inline'"],
      reportUri: ['http://example.com/tellyouwhat'],
      foobarquux: []
    });

    expect(contentSecurityPolicies[1].parseTree, 'to equal', {
      defaultSrc: ["'self'"],
      reportUri: ['http://example.com/gossip']
    });

    contentSecurityPolicies[0].parseTree.reportUri = [
      'http://somewhereelse.com/tellyouwhat'
    ];
    contentSecurityPolicies[0].markDirty();

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text,
      'to contain',
      'report-uri http://somewhereelse.com/tellyouwhat'
    );
  });

  it('should normalize the casing of directives, hash names and single quoted directives', function() {
    expect(
      new AssetGraph().addAsset({
        type: 'ContentSecurityPolicy',
        text:
          "DEFAULT-sRc 'seLF' 'sHa256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs=' HttP://foo.com dAta: sVn+SSH: 'UNsafe-InLiNe' 'unSAFE-eVal' 'nONCe-ABC123'"
      }).parseTree,
      'to exhaustively satisfy',
      {
        defaultSrc: [
          "'self'",
          "'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs='",
          'http://foo.com',
          'data:',
          'svn+ssh:',
          "'unsafe-inline'",
          "'unsafe-eval'",
          "'nonce-ABC123'"
        ]
      }
    );
  });

  // Doesn't seem to permitted by the grammar, but is used by eg. https://report-uri.io/home/generate
  it('should allow a trailing semicolon', function() {
    expect(
      new AssetGraph().addAsset({
        type: 'ContentSecurityPolicy',
        text: "default-src 'self';"
      }).parseTree,
      'to exhaustively satisfy',
      {
        defaultSrc: ["'self'"]
      }
    );
  });

  it('should support "boolean" directives', function() {
    const contentSecurityPolicy = new AssetGraph().addAsset({
      type: 'ContentSecurityPolicy',
      text: 'upgrade-insecure-requests; block-all-mixed-content'
    });
    expect(contentSecurityPolicy.parseTree, 'to exhaustively satisfy', {
      upgradeInsecureRequests: [],
      blockAllMixedContent: []
    });
    contentSecurityPolicy.markDirty();
    expect(
      contentSecurityPolicy.text,
      'to equal',
      'upgrade-insecure-requests; block-all-mixed-content'
    );
  });

  it('should tolerate leading newlines', function() {
    const csp = new AssetGraph().addAsset({
      type: 'ContentSecurityPolicy',
      text: "\n     default-src 'self'; img-src 'self'"
    });
    expect(csp.parseTree, 'to satisfy', {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'"]
    });
    csp.markDirty();
    expect(csp.text, 'to equal', "default-src 'self'; img-src 'self'");
  });

  it('should automatically derive the type when attached via an HtmlContentSecurityPolicy relation', function() {
    const assetGraph = new AssetGraph();
    const htmlAsset = assetGraph.addAsset({
      type: 'Html',
      url: 'https://example.com/',
      text: '<!DOCTYPE html><html><head></head><body></body></html>'
    });

    htmlAsset.addRelation({
      type: 'HtmlContentSecurityPolicy',
      to: {
        text: "default-src 'none'"
      }
    });
    expect(assetGraph, 'to contain asset', 'ContentSecurityPolicy');
  });
});
