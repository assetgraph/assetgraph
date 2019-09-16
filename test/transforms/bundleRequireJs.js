const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const fs = require('fs');
const AssetGraph = require('../../lib/AssetGraph');
const mozilla = require('source-map');
const requirejs = fs.readFileSync(
  pathModule.resolve(
    __dirname,
    '../../testdata/transforms/bundleRequireJs/almond/mixed/require.js'
  ),
  'utf8'
);
const almond = fs.readFileSync(
  pathModule.resolve(
    __dirname,
    '../../testdata/transforms/bundleRequireJs/almond/mixed/almond.js'
  ),
  'utf8'
);

describe('transforms/bundleRequireJs', function() {
  it('should handle the jquery-require-sample test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/jquery-require-sample/webapp/'
      )
    });
    await assetGraph.loadAssets('app.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'JavaScript');

    await assetGraph.bundleRequireJs({ type: 'Html' });

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].href, 'to equal', 'scripts/require.js');
    expect(htmlScripts[1].to, 'to have the same AST as', function() {
      /* eslint-disable */
      var jquery = {};
      define('jquery', function() {});
      $.fn.alpha = function() {
        return this.append('<p>Alpha is Go!</p>');
      };
      define('jquery.alpha', function() {});
      $.fn.beta = function() {
        return this.append('<p>Beta is Go!</p>');
      };
      define('jquery.beta', function() {});
      require(['jquery', 'jquery.alpha', 'jquery.beta'], function($) {
        $(function() {
          $('body')
            .alpha()
            .beta();
        });
      });
      define('main', function() {});
      /* eslint-enable */
    });

    await assetGraph.serializeSourceMaps();

    expect(assetGraph, 'to contain asset', 'SourceMap');
    const sourceMap = assetGraph.findAssets({ type: 'SourceMap' })[0];
    expect(sourceMap.parseTree, 'to satisfy', {
      file: '/scripts/main-bundle.js',
      sources: expect.it('to contain', '/scripts/main.js')
    });
    expect(
      new mozilla.SourceMapConsumer(sourceMap.parseTree).originalPositionFor({
        line: 6,
        column: 10
      }),
      'to satisfy',
      {
        source: '/scripts/jquery.alpha.js',
        line: 2,
        column: 0 // Not quite right?
      }
    );
  });

  it('should handle a test case with a text dependency', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/textDependency/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs({ type: 'Html' });
    await assetGraph.populate({ from: { type: 'JavaScript' } });

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].href, 'to equal', 'require.js');
  });

  it('should handle a test case with a module that has multiple define calls pointing at it', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/multipleIncoming/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'JavaScript');

    await assetGraph.bundleRequireJs({ type: 'Html' });

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].href, 'to equal', 'require.js');
    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('popular', [], function() {
        alert("I'm a popular helper module");
        return 'foo';
      });
      define('module1', ['popular'], function() {
        return 'module1';
      });
      define('module2', ['popular'], function() {
        return 'module2';
      });
      require(['module1', 'module2'], function(module1, module2) {
        alert('Got it all!');
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle another case with a module that has multiple define calls pointing at it', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/multipleIncoming2/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs({ type: 'Html' });
    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });

    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].href, 'to equal', 'require.js');
    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('module2', [], function() {
        return 'module2';
      });
      define('module1', ['module2'], function() {
        return 'module1';
      });
      require(['module1', 'module2'], function(module1, module2) {
        alert('Got it all!');
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a test case with a module that is included via a script tag and a JavaScriptAmdRequire relation', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/nonOrphanedJavaScript/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs({ type: 'Html' });
    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });

    expect(htmlScripts, 'to have length', 3);
    expect(htmlScripts[0].href, 'to equal', 'includedInHtmlAndViaRequire.js');
    expect(htmlScripts[1].href, 'to equal', 'require.js');
    expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      alert('includedInHtmlAndViaRequire.js');
      define('includedInHtmlAndViaRequire', function() {});
      require(['includedInHtmlAndViaRequire'], function(foo) {
        alert('Here we are!');
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a test case that uses require(...) to fetch a css file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/cssRequire/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    expect(assetGraph, 'to contain assets', 'JavaScript', 2);

    await assetGraph.bundleRequireJs({ type: 'Html' });
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'HtmlStyle');
    expect(assetGraph, 'to contain asset', 'Css');
    expect(assetGraph, 'to contain relation', 'CssImage');
    expect(assetGraph, 'to contain asset', 'Png');
  });

  it('should handle a test case that includes a JavaScriptStaticUrl relation', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/withOneStaticUrl/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'JavaScript');

    await assetGraph.bundleRequireJs({ type: 'Html' });
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'JavaScriptStaticUrl');
    expect(assetGraph, 'to contain asset', 'Png');

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('module2', [], function() {
        return 'foo.png'.toString('url');
      });
      define('module1', ['module2'], function() {
        return 'module1';
      });
      define('module3', [], function() {
        alert('module3.js');
      });
      require([
        'module1',
        'module2',
        'module3'
      ], function(module1, module2, module3) {
        alert('Got it all');
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a umd test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/umd/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs({ type: 'Html' });
    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });

    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      (function(root, factory) {
        if (typeof module !== 'undefined') {
          module.exports = factory();
        } else if (typeof root.define === 'function' && define.amd) {
          define('myumdmodule', factory);
        } else {
          root.myModule = factory();
        }
      })(this, function() {
        return true;
      });
      require(['myumdmodule'], function(myUmdModule) {
        alert(myUmdModule);
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a umd test case where the wrapper has a dependency in the define call', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/umdWithDependency/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs({ type: 'Html' });
    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });

    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].href, 'to equal', 'require.js');
    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('someDependency', [], function() {
        alert('got the dependency!');
      });
      (function(root, factory) {
        if (typeof module !== 'undefined') {
          module.exports = factory();
        } else if (typeof root.define === 'function' && define.amd) {
          define('myumdmodule', ['someDependency'], factory);
        } else {
          root.myModule = factory();
        }
      })(this, function(someDependency) {
        return true;
      });
      require(['myumdmodule'], function(myUmdModule) {
        alert(myUmdModule);
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a non-umd test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/nonUmd/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs({ type: 'Html' });
    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });

    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].href, 'to equal', 'require.js');
    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      (function(global) {
        var signals = function() {
          return true;
        };
        if (typeof define === 'function' && define.amd) {
          define('signals', [], function() {
            return signals;
          });
        } else if (typeof module !== 'undefined' && module.exports) {
          module.exports = signals;
        } else {
          global['signals'] = signals;
        }
      })(this);
      require(['signals'], function(myUmdModule) {
        alert(signals);
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a test case with multiple Html files depending on the same modules', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/multipleHtmls/'
      )
    });
    await assetGraph.loadAssets('*.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs({ type: 'Html' });
    const htmlScripts1 = assetGraph.findRelations({
      type: 'HtmlScript',
      from: { fileName: 'index1.html' }
    });

    expect(htmlScripts1, 'to have length', 2);
    expect(htmlScripts1[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('someDependency', [], function() {
        alert('here is the dependency of the common module');
      });
      define('commonModule', ['someDependency'], function() {
        alert('here is the common module');
      });
      require(['commonModule'], function(commonModule) {
        alert('here we are in app1!');
      });
      define('app1', function() {});
      /* eslint-enable */
    });

    const htmlScripts2 = assetGraph.findRelations({
      type: 'HtmlScript',
      from: { fileName: 'index2.html' }
    });
    expect(htmlScripts2, 'to have length', 2);
    expect(htmlScripts2[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('someDependency', [], function() {
        alert('here is the dependency of the common module');
      });
      define('commonModule', ['someDependency'], function() {
        alert('here is the common module');
      });
      require(['commonModule'], function(commonModule) {
        alert('here we are in app2!');
      });
      define('app2', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a test case using the less! plugin', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/lessPlugin/'
      )
    });
    await assetGraph.loadAssets('index*.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs({ type: 'Html' });

    expect(
      assetGraph.findRelations({
        type: 'HtmlStyle',
        from: { fileName: 'index.html' }
      }),
      'to satisfy',
      [{ href: 'main-bundle.css' }]
    );
    expect(
      assetGraph.findRelations({
        type: 'HtmlStyle',
        from: { fileName: 'index2.html' }
      }),
      'to satisfy',
      [{ href: 'main2-bundle.css' }]
    );
  });

  it('should handle a test case with a shims config', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/shim/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs();
    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });

    expect(htmlScripts, 'to have length', 3);
    expect(htmlScripts[0].to.text, 'to match', /var require\s*=/);
    expect(htmlScripts[1].to.url, 'to match', /\/require\.js$/);

    expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      alert('someDependency');
      define('someDependency', function() {});
      alert('nonAmdModule1');
      define('nonAmdModule1', ['someDependency'], function() {});
      alert('someOtherDependency');
      define('someOtherDependency', function() {});
      alert('nonAmdModule2');
      window.foo = { bar: 'foo dot bar' };
      define('nonAmdModule2', ['someOtherDependency'], (function(global) {
        return function() {
          var ret, fn;
          return ret || global.foo.bar;
        };
      })(this));
      require([
        'nonAmdModule1',
        'nonAmdModule2'
      ], function(nonAmdModule1, nonAmdModule2) {
        alert("Got 'em all!");
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a test case with a non-string items in the require array', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/nonString/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph.findAssets({ type: 'JavaScript' }), 'to satisfy', [
      { fileName: 'require.js' }
    ]);

    await assetGraph.bundleRequireJs({ type: 'Html' });

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      require([
        'some' + 'thing',
        foo ? 'bar' : 'quux'
      ], function(something, barOrQuux) {
        alert('Got something!');
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a test case with relative dependencies', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/relativeDependencies/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph.findAssets({ type: 'JavaScript' }), 'to satisfy', [
      { fileName: 'require.js' }
    ]);

    await assetGraph.bundleRequireJs({ type: 'Html' });

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts, 'to have length', 2);

    expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);
    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('subdir/subsubdir/quux', [], function() {
        alert('quux!');
      });
      define('subdir/bar', ['./subsubdir/quux'], function(quux) {
        alert('bar!');
      });
      define('subdir/foo', ['./bar', './subsubdir/quux'], function(bar) {
        alert('foo!');
      });
      require(['subdir/foo'], function(foo) {
        alert("Got 'em all!");
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  // This test isn't that interesting as the require.js optimizer leaves the asset on the CDN:
  it('should handle a test case with a paths config that points jquery at a CDN', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/httpPath/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(
      assetGraph.findAssets({ type: 'JavaScript', isInline: false }),
      'to satisfy',
      [{ fileName: 'require.js' }]
    );

    await assetGraph.bundleRequireJs();

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      require(['jquery'], function($) {
        $(function() {
          alert('Ready!');
        });
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  it('should handle a test case with a paths config that maps theLibrary to 3rdparty/theLibrary', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/paths/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs();
    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });

    expect(htmlScripts, 'to have length', 3);
    expect(htmlScripts[1].to.url, 'to match', /\/require\.js$/);

    expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('theLibrary', [], function() {
        return 'the contents of theLibrary';
      });
      define('subdir/bar', [], function() {
        return 'bar';
      });
      define('subdir/foo', ['./bar'], function(bar) {
        alert('Got bar: ' + bar);
        return {};
      });
      require(['theLibrary', 'subdir/foo'], function(theLibrary) {
        alert('Got the library: ' + theLibrary);
      });
      define('main', function() {});
      /* eslint-enable */
    });
  });

  // https://github.com/assetgraph/assetgraph-builder/issues/542
  it('should support the wrap option', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/wrap/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs();

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts, 'to have length', 3);
    expect(htmlScripts[1].to.url, 'to match', /\/require\.js$/);

    expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      (function() {
        define('theLibrary', [], function() {
          return 'the contents of theLibrary';
        });
        require(['theLibrary'], function(theLibrary) {
          alert('Got the library: ' + theLibrary);
        });
        define('main', function() {});
      })();
      /* eslint-enable */
    });
  });

  it('should handle a test case with a data-main that only contains a define (#127)', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/issue127/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs();

    const htmlScripts = assetGraph.findRelations({ type: 'HtmlScript' });
    expect(htmlScripts, 'to have length', 2);
    expect(htmlScripts[0].href, 'to equal', 'require.js');
    expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function() {
      /* eslint-disable */
      define('main', [], function() {
        alert('It gets lonely in here if nobody runs me');
      });
      /* eslint-enable */
    });
  });

  /*
    // This is a common mistake that require.js tolerates, although it does have the side effect that the module definition
    // function is run twice. This test case asserts that bundleRequireJs emits an error as the build will be broken.
    it('should handle a test case with a module that is referred to both with and without the .js extension', function () {
        const warns = [];
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/bundleRequireJs/multipleIncomingWithAndWithoutDotJsSuffix/')});
        assetGraph.on('warn', err => warns.push(err));
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(warns, 'to have length', 0);
        expect(assetGraph, 'to contain assets', 'JavaScript', 5);

        await assetGraph.bundleRequireJs();

        expect(warns, 'This test has failed once in a random manner. If you see this again expect it to be a race condition', 'to be ok');
        expect(warns, 'to have length', 1);
        expect(warns[0].message.replace(/^file:\/\/[^\s]* /, ''), 'is referred to as both popular and popular.js, 'to equal', please omit the .js extension in define/require');
    });
    */
  it('should handle a test case with a umdish factory pattern', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/bundleRequireJs/umdishBackboneLocalstorage/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.bundleRequireJs();

    expect(
      assetGraph.findRelations({ type: 'HtmlScript' })[1].to.parseTree,
      'to have the same AST as',
      function() {
        /* eslint-disable */
        (function(root) {
          root._ = 'UNDERSCORE';
        })(this);
        define('underscore', function() {});
        (function(root) {
          root.Backbone = 'BACKBONE';
        })(this);
        define('backbone', function() {});
        (function(root, factory) {
          if (typeof exports === 'object' && typeof require === 'function') {
            module.exports = factory(
              require('underscore'),
              require('backbone')
            );
          } else if (typeof define === 'function' && define.amd) {
            define('backbone-localstorage', [
              'underscore',
              'backbone'
            ], function(_, Backbone) {
              return factory(_ || root._, Backbone || root.Backbone);
            });
          } else {
            factory(root._, root.Backbone);
          }
        })(this, function(_, Backbone) {
          return 'LOCALSTORAGE';
        });
        require(['backbone-localstorage'], function(bbls) {
          alert(bbls);
        });
        define('main', function() {});
        /* eslint-enable */
      }
    );
  });

  describe('with a data-almond attribute', function() {
    it('should handle a non-almond test case', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/bundleRequireJs/almond/mixed/'
        )
      });
      await assetGraph.loadAssets('require-pure.html');
      await assetGraph.populate({
        from: { type: 'Html' },
        followRelations: { type: 'HtmlScript', to: { protocol: 'file:' } }
      });
      await assetGraph.populate();

      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' }).pop().text,
        'to equal',
        requirejs
      );

      await assetGraph.bundleRequireJs();

      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(
        assetGraph.findAssets({ type: 'JavaScript' }).pop().text,
        'to equal',
        requirejs
      );
    });

    it('should handle a test case with several data-almond attributes', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/bundleRequireJs/almond/mixed/'
        )
      });
      await assetGraph.loadAssets('require-almond.html');
      await assetGraph.populate({
        from: { type: 'Html' },
        followRelations: { type: 'HtmlScript', to: { protocol: 'file:' } }
      });
      await assetGraph.populate();

      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(assetGraph, 'to contain relations', 'HtmlScript', 2);

      expect(
        assetGraph.findRelations({ type: 'HtmlScript' })[0].to.text,
        'to equal',
        requirejs
      );

      await assetGraph.bundleRequireJs();
      await assetGraph.populate();

      expect(assetGraph, 'to contain assets', 'JavaScript', 2);
      expect(assetGraph, 'to contain relations', 'HtmlScript', 4);

      expect(
        assetGraph.findAssets({ fileName: 'almond.js' })[0].text,
        'to equal',
        almond
      );
    });

    it('should handle a test case where multiple Html assets use the same require.js and have a data-almond attribute', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/bundleRequireJs/almond/multipleHtml/'
        )
      });
      await assetGraph.loadAssets('*.html');
      await assetGraph.populate({
        from: { type: 'Html' },
        followRelations: { type: 'HtmlScript', to: { protocol: 'file:' } }
      });
      await assetGraph.populate();

      expect(assetGraph, 'to contain assets', 'Html', 2);
      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(assetGraph, 'to contain relations', 'HtmlScript', 2);

      await assetGraph.bundleRequireJs();

      expect(assetGraph, 'to contain asset', 'JavaScript');
      expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
      for (const htmlAsset of assetGraph.findAssets({ type: 'Html' })) {
        expect(htmlAsset.text.match(/<script/g), 'to have length', 1);
      }
    });
  });
});
