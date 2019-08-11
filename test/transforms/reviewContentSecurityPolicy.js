const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
const AssetGraph = require('../../lib/AssetGraph');
const httpception = require('httpception');

describe('transforms/reviewContentSecurityPolicy', function() {
  it('should not do anything for Html assets that do not have an existing policy', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/noExistingContentSecurityPolicy/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(assetGraph, 'to contain assets', 'ContentSecurityPolicy', 0);
  });

  it('should preserve existing tokens, even if they appear superfluous', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/extraDirectives/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"]
      }
    );
  });

  it('should copy all tokens from default-src when introducing a new directive', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/defaultSrcWithExtraSourceExpressions/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    assetGraph.findAssets({ type: 'JavaScript' })[0].url =
      'http://scriptland.com/script.js';

    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        defaultSrc: ["'self'", 'whatever.com/yadda'],
        scriptSrc: ["'self'", 'scriptland.com', 'whatever.com/yadda']
      }
    );
  });

  it("should not copy the 'none' token from default-src when introducing a new directive", async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/defaultSrcWithExtraSourceExpressions/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    assetGraph.findAssets({ type: 'JavaScript' })[0].url =
      'http://scriptland.com/script.js';

    assetGraph.findAssets({ type: 'JavaScript' })[0].url =
      'http://scriptland.com/somewhere/script.js';

    const contentSecurityPolicy = assetGraph.findAssets({
      type: 'ContentSecurityPolicy'
    })[0];
    contentSecurityPolicy.parseTree.defaultSrc = ["'none'"];
    contentSecurityPolicy.markDirty();

    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        defaultSrc: ["'none'"],
        scriptSrc: ['scriptland.com']
      }
    );
  });

  describe('when assets are present on other domains', function() {
    describe('with includePath enabled for script-src and style-src', function() {
      it('should update the style-src and script-src directives of a Content-Security-Policy when no existing source expression allows the url', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        assetGraph.findAssets({ type: 'Css' })[0].url =
          'http://styleland.com/styles.css';
        assetGraph.findAssets({ type: 'JavaScript' })[0].url =
          'http://scriptland.com/script.js';

        await assetGraph.reviewContentSecurityPolicy(undefined, {
          update: true,
          includePath: ['script-src', 'styleSrc']
        });

        expect(
          assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
          'to satisfy',
          {
            scriptSrc: ["'self'", 'scriptland.com/script.js'],
            styleSrc: ["'self'", 'styleland.com/styles.css']
          }
        );
      });
    });

    describe('with includePath:true', function() {
      it('should update the style-src and script-src directives of a Content-Security-Policy when no existing source expression allows the url', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        assetGraph.findAssets({ type: 'Css' })[0].url =
          'http://styleland.com/styles.css';
        assetGraph.findAssets({ type: 'JavaScript' })[0].url =
          'http://scriptland.com/script.js';

        await assetGraph.reviewContentSecurityPolicy(undefined, {
          update: true,
          includePath: true
        });

        expect(
          assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
          'to satisfy',
          {
            scriptSrc: ["'self'", 'scriptland.com/script.js'],
            styleSrc: ["'self'", 'styleland.com/styles.css']
          }
        );
      });
    });

    describe('with includePath disabled (defaults to off)', function() {
      it('should update the style-src and script-src directives of a Content-Security-Policy when no existing source expression allows the url', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        assetGraph.findAssets({ type: 'Css' })[0].url =
          'http://styleland.com/styles.css';
        assetGraph.findAssets({ type: 'JavaScript' })[0].url =
          'http://scriptland.com/script.js';

        await assetGraph.reviewContentSecurityPolicy(undefined, {
          update: true
        });

        expect(
          assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
          'to satisfy',
          {
            scriptSrc: ["'self'", 'scriptland.com'],
            styleSrc: ["'self'", 'styleland.com']
          }
        );
      });
    });

    it('should just whitelist the host:port of the origin for less sensitive media types such as images', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/image/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      assetGraph.findAssets({ type: 'Png' })[0].url =
        'http://imageland.com/foo.png';

      await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
        'to satisfy',
        {
          imgSrc: ["'self'", 'imageland.com']
        }
      );
    });

    it('should include the port if non-default', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/image/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      assetGraph.findAssets({ type: 'Png' })[0].url =
        'http://imageland.com:1337/foo.png';

      await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
        'to satisfy',
        {
          imgSrc: ["'self'", 'imageland.com:1337']
        }
      );
    });

    it('should omit the port if default', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/image/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      assetGraph.findAssets({ type: 'Png' })[0].url =
        'http://imageland.com:80/foo.png';

      await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
        'to satisfy',
        {
          imgSrc: ["'self'", 'imageland.com']
        }
      );
    });

    it('should not update the style-src and script-src directives of a Content-Security-Policy when an existing source expression allows the url', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      assetGraph.findAssets({ type: 'JavaScript' })[0].url =
        'http://scriptland.com/somewhere/script.js';

      const contentSecurityPolicy = assetGraph.findAssets({
        type: 'ContentSecurityPolicy'
      })[0];
      contentSecurityPolicy.parseTree.scriptSrc = ['scriptland.com/somewhere/'];
      contentSecurityPolicy.markDirty();

      await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
        'to satisfy',
        {
          scriptSrc: ['scriptland.com/somewhere/']
        }
      );
    });
  });

  it('should update the image-src accordingly when images are included as data: urls', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/smallImage/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.inlineRelations({ type: 'HtmlImage' });
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        imgSrc: ['data:']
      }
    );
  });

  it("should not leave 'none' in the list of allowed origins when adding to an existing policy", async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/scriptSrcNone/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        scriptSrc: ["'self'"]
      }
    );
  });

  it('should omit a directive when its origin list is identical to that of the default-src', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/externalScriptAndStylesheet/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const contentSecurityPolicy = assetGraph.findAssets({
      type: 'ContentSecurityPolicy'
    })[0];
    contentSecurityPolicy.parseTree.defaultSrc = ["'self'", 'scriptland.com'];
    contentSecurityPolicy.markDirty();

    assetGraph.findAssets({ type: 'Css' })[0].url =
      'http://styleland.com/styles.css';
    assetGraph.findAssets({ type: 'JavaScript' })[0].url =
      'http://scriptland.com/script.js';

    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        defaultSrc: ["'self'", 'scriptland.com'],
        scriptSrc: undefined,
        styleSrc: ["'self'", 'styleland.com']
      }
    );
  });

  it("should include hash-source fragments and add 'unsafe-inline' for inline scripts and stylesheets when 'unsafe-inline' is not in the existing policy", async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        scriptSrc: [
          "'self'",
          "'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs='",
          "'unsafe-inline'"
        ],
        styleSrc: [
          "'self'",
          "'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw='",
          "'unsafe-inline'"
        ]
      }
    );
  });

  it('should not include hash-source fragments for inline scripts and stylesheets when unsafe-inline is in the existing policy', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const contentSecurityPolicy = assetGraph.findAssets({
      type: 'ContentSecurityPolicy'
    })[0];
    contentSecurityPolicy.parseTree.scriptSrc = ["'self'", "'unsafe-inline'"];
    contentSecurityPolicy.parseTree.styleSrc = ["'self'", "'unsafe-inline'"];
    contentSecurityPolicy.markDirty();

    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    );
  });

  it('should not include hash-source fragments for inline scripts and stylesheets when unsafe-inline is in the existing default-src and there is no script-src or style-src', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const contentSecurityPolicy = assetGraph.findAssets({
      type: 'ContentSecurityPolicy'
    })[0];
    delete contentSecurityPolicy.parseTree.scriptSrc;
    delete contentSecurityPolicy.parseTree.styleSrc;
    contentSecurityPolicy.parseTree.defaultSrc = ["'self'", "'unsafe-inline'"];
    contentSecurityPolicy.markDirty();

    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        defaultSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: undefined,
        styleSrc: undefined
      }
    );
  });

  it("should upgrade nonces to hashes and remove the nonce attributes (and add 'unsafe-inline' for CSP1 compatibility)", async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheetWithNonces/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        scriptSrc: [
          "'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs='",
          "'unsafe-inline'"
        ],
        styleSrc: [
          "'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw='",
          "'unsafe-inline'"
        ]
      }
    );
    const html = assetGraph.findAssets({ type: 'Html' })[0].text;
    expect(html, 'not to contain', '<script nonce').and(
      'not to contain',
      '<style type="text/css" nonce'
    );
  });

  it('should remove a nonce from the CSP when relations with the same nonce have been bundled (integration with bundleRelations)', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/bundledScriptsWithSameNonce/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRelations({ type: 'HtmlStyle' });
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to satisfy',
      {
        styleSrc: ["'self'"]
      }
    );
    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text,
      'not to contain',
      'nonce'
    );
  });

  it('should always remove a nonce with a value of "developmentonly", even when it is not referenced by a <script> or <link>', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/unreferencedDevelopmentOnlyNonce/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text,
      'not to contain',
      'nonce-developmentonly'
    );
  });

  it("should leave the empty script as an allowed hash when removing a nonce so 'unsafe-inline' would be left alone and thus take effect with CSP2+", async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/upgradedNonceAndUnsafeInline/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.externalizeRelations({ type: 'HtmlScript' });
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to exhaustively satisfy',
      {
        scriptSrc: [
          "'self'",
          "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
          "'unsafe-inline'"
        ]
      }
    );
  });

  it("should leave the empty script as an allowed hash when removing nonces so 'unsafe-inline' would be left alone and thus take effect with CSP2+", async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/nonceDevelopmentOnlyAndUnsafeInline/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to exhaustively satisfy',
      {
        styleSrc: [
          "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
          "'unsafe-inline'"
        ]
      }
    );
  });

  describe('with update:false', function() {
    it('emits a warn event when an inline relation is prohibited by the policy', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.reviewContentSecurityPolicy(undefined, {
        update: false
      });

      expect(warnSpy, 'to have calls satisfying', async function() {
        warnSpy(
          new Error(
            "testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html: An asset violates the style-src 'self' Content-Security-Policy directive:\n" +
              '  inline Css in testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html'
          )
        );
        warnSpy(
          new Error(
            "testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html: An asset violates the script-src 'self' Content-Security-Policy directive:\n" +
              '  inline JavaScript in testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html'
          )
        );
      });
    });

    it('should emit a warn even when a relation to an asset on a non-whitelisted origin is present', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      const contentSecurityPolicy = assetGraph.findAssets({
        type: 'ContentSecurityPolicy'
      })[0];
      contentSecurityPolicy.parseTree.scriptSrc = ['foo.com'];
      contentSecurityPolicy.parseTree.styleSrc = ["'unsafe-inline'"];
      contentSecurityPolicy.markDirty();
      assetGraph.findAssets({ type: 'JavaScript' })[0].url =
        'http://bar.com/yadda.js';

      await assetGraph.reviewContentSecurityPolicy(undefined, {
        update: false
      });

      expect(warnSpy, 'to have calls satisfying', async function() {
        warnSpy(
          new Error(
            'testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/index.html: An asset violates the script-src foo.com Content-Security-Policy directive:\n' +
              '  http://bar.com/yadda.js'
          )
        );
      });
    });

    it('should not warn when a relation to an asset in a whitelisted origin is present', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      const contentSecurityPolicy = assetGraph.findAssets({
        type: 'ContentSecurityPolicy'
      })[0];
      contentSecurityPolicy.parseTree.scriptSrc = ['bar.com'];
      contentSecurityPolicy.parseTree.styleSrc = ["'unsafe-inline'"];
      contentSecurityPolicy.markDirty();
      assetGraph.findAssets({ type: 'JavaScript' })[0].url =
        'http://bar.com/yadda.js';

      await assetGraph.reviewContentSecurityPolicy(undefined, {
        update: false
      });

      expect(warnSpy, 'to have calls satisfying', []);
    });

    it("emits a warn event when a relation is prohibited by a 'none' directive", async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/scriptSrcNone/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.reviewContentSecurityPolicy(undefined, {
        update: false
      });

      expect(warnSpy, 'to have calls satisfying', async function() {
        warnSpy(
          new Error(
            "testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/scriptSrcNone/index.html: An asset violates the script-src 'none' Content-Security-Policy directive:\n" +
              '  testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/scriptSrcNone/script.js'
          )
        );
      });
    });

    it('does not warn when a relation is whitelisted by a nonce', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheetWithNonces/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.reviewContentSecurityPolicy(undefined, {
        update: false
      });

      expect(warnSpy, 'to have calls satisfying', []);
    });
  });

  describe('when HTTP redirects are present', function() {
    it('should whitelist both the redirect source and target', async function() {
      httpception([
        {
          request: 'GET http://www.example.com/',
          response: {
            headers: {
              'Content-Type': 'text/html; charset=utf-8'
            },
            body:
              '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"><link rel="stylesheet" href="http://www.somewhereelse.com/styles.css"></head><body></body></html>'
          }
        },
        {
          request: 'GET http://www.somewhereelse.com/styles.css',
          response: {
            statusCode: 302,
            headers: {
              Location: 'http://www.yetanotherone.com/styles.css'
            }
          }
        },
        {
          request: 'GET http://www.yetanotherone.com/styles.css',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: 'body {color: maroon;}'
          }
        }
      ]);

      const assetGraph = new AssetGraph();
      await assetGraph.loadAssets('http://www.example.com/');
      await assetGraph.populate();
      await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
        'to satisfy',
        {
          styleSrc: ["'self'", 'www.somewhereelse.com', 'www.yetanotherone.com']
        }
      );
    });

    it('should only whitelist the relevant redirect steps', async function() {
      httpception([
        {
          request: 'GET http://www.example.com/page1.html',
          response: {
            headers: {
              'Content-Type': 'text/html; charset=utf-8'
            },
            body:
              '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"></head><body><script src="http://www.somewhereelse.com/script.js"></body></html>'
          }
        },
        {
          request: 'GET http://www.example.com/page2.html',
          response: {
            headers: {
              'Content-Type': 'text/html; charset=utf-8'
            },
            body:
              '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"><link rel="stylesheet" href="http://www.somewhereelse.com/styles.css"></head><body></body></html>'
          }
        },
        {
          request: 'GET http://www.somewhereelse.com/script.js',
          response: {
            statusCode: 302,
            headers: {
              Location: 'http://www.yetanotherone.com/script.js'
            }
          }
        },
        {
          request: 'GET http://www.somewhereelse.com/styles.css',
          response: {
            statusCode: 302,
            headers: {
              Location: 'http://www.yetanotherone.com/styles.css'
            }
          }
        },
        {
          request: 'GET http://www.yetanotherone.com/script.js',
          response: {
            headers: {
              'Content-Type': 'application/javascript'
            },
            body: 'alert("hello");'
          }
        },
        {
          request: 'GET http://www.yetanotherone.com/styles.css',
          response: {
            headers: {
              'Content-Type': 'text/css'
            },
            body: 'body {color: maroon;}'
          }
        }
      ]);

      const assetGraph = new AssetGraph();
      await assetGraph.loadAssets([
        'http://www.example.com/page1.html',
        'http://www.example.com/page2.html'
      ]);
      await assetGraph.populate();
      await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
        'to exhaustively satisfy',
        {
          styleSrc: ["'self'"],
          scriptSrc: ['www.somewhereelse.com', 'www.yetanotherone.com']
        }
      );
      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[1].parseTree,
        'to exhaustively satisfy',
        {
          styleSrc: ["'self'", 'www.somewhereelse.com', 'www.yetanotherone.com']
        }
      );
    });

    it('should not break when there is a redirection loop', async function() {
      httpception([
        {
          request: 'GET http://www.example.com/',
          response: {
            headers: {
              'Content-Type': 'text/html; charset=utf-8'
            },
            body:
              '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"></head><body><script src="http://www.somewhereelse.com/script.js"></body></html>'
          }
        },
        {
          request: 'GET http://www.somewhereelse.com/script.js',
          response: {
            statusCode: 302,
            headers: {
              Location: 'http://www.yetanotherone.com/script.js'
            }
          }
        },
        {
          request: 'GET http://www.yetanotherone.com/script.js',
          response: {
            statusCode: 302,
            headers: {
              Location: 'http://www.somewhereelse.com/script.js'
            }
          }
        }
      ]);

      const assetGraph = new AssetGraph();
      await assetGraph.loadAssets('http://www.example.com/');
      await assetGraph.populate();
      await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
        'to exhaustively satisfy',
        {
          styleSrc: ["'self'"],
          scriptSrc: ['www.somewhereelse.com', 'www.yetanotherone.com']
        }
      );
    });
  });

  it('should not list the protocol when there is a protocol-relative relation on the path', async function() {
    httpception([
      {
        request: 'GET http://www.example.com/',
        response: {
          headers: {
            'Content-Type': 'text/html; charset=utf-8'
          },
          body:
            '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'"><link rel="stylesheet" href="//www.somewhereelse.com/styles.css"></head><body></body></html>'
        }
      },
      {
        request: 'GET http://www.somewhereelse.com/styles.css',
        response: {
          headers: {
            'Content-Type': 'text/css'
          },
          body: 'body {background-image: url(foo.svg);}'
        }
      },
      {
        request: 'GET http://www.somewhereelse.com/foo.svg',
        response: {
          statusCode: 302,
          headers: {
            'Content-Type': 'image/svg+xml'
          },
          body:
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg></svg>'
        }
      }
    ]);

    const assetGraph = new AssetGraph();
    await assetGraph.loadAssets('http://www.example.com/');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to exhaustively satisfy',
      {
        styleSrc: ["'self'", 'www.somewhereelse.com'],
        imgSrc: ['www.somewhereelse.com']
      }
    );
  });

  it("should hash an inline script when there is a nonce, even when 'unsafe-inline' is permitted", async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/nonceAndUnsafeInline/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.reviewContentSecurityPolicy(undefined, { update: true });

    expect(assetGraph, 'to contain asset', 'ContentSecurityPolicy');
    expect(
      assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
      'to exhaustively satisfy',
      {
        scriptSrc: [
          "'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs='",
          "'unsafe-inline'"
        ]
      }
    );
  });

  describe('when level is set to 1', function() {
    it("should add 'unsafe-inline' for inline scripts and styles (and no hashes) when 'unsafe-inline' is not in the existing policy", async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.reviewContentSecurityPolicy(undefined, {
        update: true,
        level: 1
      });

      expect(
        assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0].parseTree,
        'to satisfy',
        {
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"]
        }
      );
    });
  });

  it('should return an info object', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineScriptAndStylesheet/'
      )
    });
    await assetGraph.loadAssets('index.html');
    const contentSecurityPolicy = assetGraph.findAssets({
      type: 'ContentSecurityPolicy'
    })[0];
    await assetGraph.populate();

    const infoObject = await assetGraph.reviewContentSecurityPolicy(undefined, {
      update: true,
      level: 1
    });

    expect(infoObject, 'to exhaustively satisfy', {
      [contentSecurityPolicy.id]: {
        additions: {
          styleSrc: {
            "'sha256-XeYlw2NVzOfB1UCIJqCyGr+0n7bA4fFslFpvKu84IAw='": [
              expect.it('to be an', AssetGraph.HtmlStyle)
            ]
          },
          scriptSrc: {
            "'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs='": [
              expect.it('to be an', AssetGraph.HtmlScript)
            ]
          }
        }
      }
    });
  });

  describe('with a style attribute', function() {
    describe('in update:true mode', function() {
      describe('with level=3', function() {
        it("should add a hash of attribute and 'unsafe-hashes' to style-src", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineStyleAttribute/'
            )
          });
          await assetGraph.loadAssets('index.html');
          await assetGraph.reviewContentSecurityPolicy(undefined, {
            level: 3,
            update: true
          });

          const csp = assetGraph.findAssets({
            type: 'ContentSecurityPolicy'
          })[0];

          expect(csp.parseTree, 'to satisfy', {
            styleSrc: [
              "'sha256-7uLHzkxvqv0UYsGK5JejxUXJey1gcHfYeV1OtXoN0B8='",
              "'unsafe-hashes'"
            ]
          });
        });
      });
    });

    describe('in validation mode', function() {
      describe('with level=3', function() {
        it("should emit two warnings, one about 'unsafe-hashes' missing and one about the hash source missing", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineStyleAttribute/'
            )
          });
          const warnSpy = sinon.spy().named('warn');
          assetGraph.on('warn', warnSpy);
          await assetGraph.loadAssets('index.html');
          await assetGraph.reviewContentSecurityPolicy(undefined, { level: 3 });

          expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(
              /An asset violates the default-src 'none' Content-Security-Policy directive:/
            );
            warnSpy(
              "testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineStyleAttribute/index.html: Missing style-src 'unsafe-hashes':\n" +
                '  inline Css in testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineStyleAttribute/index.html'
            );
          });
        });
      });
    });
  });

  describe('with an inline event handler', function() {
    describe('in update:true mode', function() {
      describe('with level=2', function() {
        it("should add 'unsafe-inline' instead of 'unsafe-hashes' and emit a warning", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/'
            )
          });
          const warnSpy = sinon.spy().named('warn');
          assetGraph.on('warn', warnSpy);
          await assetGraph.loadAssets('index.html');
          await assetGraph.reviewContentSecurityPolicy(undefined, {
            level: 2,
            update: true
          });

          expect(
            assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0]
              .parseTree,
            'to satisfy',
            {
              scriptSrc: ["'unsafe-inline'"]
            }
          );

          expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(
              `testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/index.html contains one or more inline event handlers, which cannot be whitelisted with CSP level 2 except via 'unsafe-inline', which almost defeats the purpose of having a CSP\n` +
                `The 'unsafe-hashes' CSP3 keyword will allow it, but at the time of writing the spec is not finalized and no browser implements it.`
            );
          });
        });

        describe("when the existing CSP allows 'unsafe-inline'", function() {
          it("should not add 'unsafe-hashes' or any hashes", async function() {
            const assetGraph = new AssetGraph({
              root: pathModule.resolve(
                __dirname,
                '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandlerWithUnsafeInline/'
              )
            });
            await assetGraph.loadAssets('index.html');
            await assetGraph.reviewContentSecurityPolicy(undefined, {
              level: 2,
              update: true
            });

            expect(
              assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0]
                .parseTree,
              'to satisfy',
              {
                scriptSrc: ["'unsafe-inline'"]
              }
            );
          });

          it("should not add the hash for a script as that would shadow 'unsafe-inline' and thus prohibit the event handler", async function() {
            const assetGraph = new AssetGraph({
              root: pathModule.resolve(
                __dirname,
                '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/unsafeInlineWithInlineScriptAndEventHandler/'
              )
            });
            await assetGraph.loadAssets('index.html');
            await assetGraph.reviewContentSecurityPolicy(undefined, {
              level: 2,
              update: true
            });

            expect(
              assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0]
                .parseTree,
              'to satisfy',
              {
                scriptSrc: ["'unsafe-inline'"]
              }
            );
          });
        });
      });

      describe('with level=3', function() {
        it("should add a hash of the event handler and 'unsafe-hashes' to script-src", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/'
            )
          });
          await assetGraph.loadAssets('index.html');
          await assetGraph.reviewContentSecurityPolicy(undefined, {
            level: 3,
            update: true
          });

          expect(
            assetGraph.findAssets({ type: 'ContentSecurityPolicy' })[0]
              .parseTree,
            'to satisfy',
            {
              scriptSrc: [
                "'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs='",
                "'unsafe-hashes'"
              ]
            }
          );
        });
      });
    });

    describe('in validation mode', function() {
      describe('with level=2', function() {
        it("should emit a warning about 'unsafe-inline' missing", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/'
            )
          });
          const warnSpy = sinon.spy().named('warn');
          assetGraph.on('warn', warnSpy);
          await assetGraph.loadAssets('index.html');
          await assetGraph.reviewContentSecurityPolicy(undefined, { level: 2 });

          expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(
              /An asset violates the default-src 'none' Content-Security-Policy directive:/
            );
          });
        });
      });

      describe('with level=3', function() {
        it("should emit two warnings, one about 'unsafe-hashes' missing and one about the hash source missing", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/'
            )
          });
          const warnSpy = sinon.spy().named('warn');
          assetGraph.on('warn', warnSpy);
          await assetGraph.loadAssets('index.html');
          await assetGraph.reviewContentSecurityPolicy(undefined, { level: 3 });

          expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(
              /An asset violates the default-src 'none' Content-Security-Policy directive:/
            );
            warnSpy(
              "testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/index.html: Missing script-src 'unsafe-hashes':\n" +
                '  inline JavaScript in testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/index.html'
            );
          });
        });

        it("should change the wording of the 'unsafe-hashes' warning when level >= 3", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/'
            )
          });
          const warnSpy = sinon.spy().named('warn');
          assetGraph.on('warn', warnSpy);
          await assetGraph.loadAssets('index.html');
          await assetGraph.reviewContentSecurityPolicy(undefined, { level: 3 });

          expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(
              /An asset violates the default-src 'none' Content-Security-Policy directive:/
            );
            warnSpy(/: Missing script-src 'unsafe-hashes'/);
          });
        });

        it("should only warn about the missing hash source when 'unsafe-hashes' is already whitelisted", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/'
            )
          });
          const warnSpy = sinon.spy().named('warn');
          assetGraph.on('warn', warnSpy);
          await assetGraph.loadAssets('index.html');
          assetGraph.findAssets({
            type: 'ContentSecurityPolicy'
          })[0].parseTree.scriptSrc = ["'unsafe-hashes'"];
          await assetGraph.reviewContentSecurityPolicy(undefined, { level: 3 });

          expect(warnSpy, 'to have calls satisfying', () => {
            warnSpy(/An asset violates the script-src 'unsafe-hashes'/);
          });
        });

        it("should not issue any warnings when both 'unsafe-hashes' and the hash are already whitelisted", async function() {
          const assetGraph = new AssetGraph({
            root: pathModule.resolve(
              __dirname,
              '../../testdata/transforms/reviewContentSecurityPolicy/existingContentSecurityPolicy/inlineEventHandler/'
            )
          });
          const warnSpy = sinon.spy().named('warn');
          assetGraph.on('warn', warnSpy);
          await assetGraph.loadAssets('index.html');
          assetGraph.findAssets({
            type: 'ContentSecurityPolicy'
          })[0].parseTree.scriptSrc = [
            "'unsafe-hashes'",
            "'sha256-WOdSzz11/3cpqOdrm89LBL2UPwEU9EhbDtMy2OciEhs='"
          ];
          await assetGraph.reviewContentSecurityPolicy(undefined, { level: 3 });

          expect(warnSpy, 'was not called');
        });
      });
    });
  });
});
