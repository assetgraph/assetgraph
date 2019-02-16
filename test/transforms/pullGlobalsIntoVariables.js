/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const espree = require('espree-papandreou');
const escodegen = require('escodegen-papandreou');

function getFunctionBodySource(fn) {
  return escodegen.generate(
    espree.parse(fn.toString().replace(/^function\s*\(\) \{\n|\}$/g, ''))
  );
}

describe('transforms/pullGlobalsIntoVariables', function() {
  it('should handle a test case with a single JavaScript asset', async function() {
    const assetGraph = new AssetGraph();
    await assetGraph
      .loadAssets({
        type: 'JavaScript',
        url: 'file:///foo.js',
        text: getFunctionBodySource(function() {
          /* eslint-disable */
          var MATHMIN = 2;
          var parseInt = function() {
            return 99;
          };
          function parseFloat() {
            return 99.0;
          }
          var quux = function isFinite() {
            return false;
          };
          var id = setTimeout(function foo() {
            var bar = Math.min(
              Math.min(4, 6),
              Math.max(4, 6) +
                Math.floor(8.2) +
                foo.bar.quux.baz +
                foo.bar.quux.w00p +
                parseInt('123') +
                parseInt('456'),
              parseFloat('99.5') +
                parseFloat('99.5') +
                isFinite(1) +
                isFinite(1)
            );
            setTimeout(foo, 100);
          }, 100);
          /* eslint-enable */
        })
      })
      .pullGlobalsIntoVariables(
        { type: 'JavaScript' },
        {
          globalNames: [
            'foo.bar.quux',
            'setTimeout',
            'Math',
            'Math.max',
            'Math.floor',
            'Math.min',
            'isFinite',
            'parseFloat',
            'parseInt'
          ]
        }
      );

    for (const asset of assetGraph.findAssets()) {
      asset.prettyPrint();
    }

    expect(
      assetGraph.findAssets({ type: 'JavaScript' })[0].text,
      'to equal',
      getFunctionBodySource(function() {
        /* eslint-disable */
        var SETTIMEOUT = setTimeout,
          MATH = Math,
          MATHMIN_ = MATH.min,
          FOOBARQUUX = foo.bar.quux;
        var MATHMIN = 2;
        var parseInt = function() {
          return 99;
        };
        function parseFloat() {
          return 99.0;
        }
        var quux = function isFinite() {
          return false;
        };
        var id = SETTIMEOUT(function foo() {
          var bar = MATHMIN_(
            MATHMIN_(4, 6),
            MATH.max(4, 6) +
              MATH.floor(8.2) +
              FOOBARQUUX.baz +
              FOOBARQUUX.w00p +
              parseInt('123') +
              parseInt('456'),
            parseFloat('99.5') + parseFloat('99.5') + isFinite(1) + isFinite(1)
          );
          SETTIMEOUT(foo, 100);
        }, 100);
        /* eslint-enable */
      })
    );
  });

  it('should handle a case with a single JavaScript when run with wrapInFunction:true', async function() {
    const assetGraph = new AssetGraph();
    await assetGraph
      .loadAssets({
        type: 'JavaScript',
        url: 'file:///foo.js',
        /* eslint-disable */
        text: getFunctionBodySource(function() {
          alert(Math.floor(10.8) + Math.floor(20.4) + Math.min(3, 5));
        })
        /* eslint-enable */
      })
      .pullGlobalsIntoVariables(
        { type: 'JavaScript' },
        { wrapInFunction: true }
      );

    for (const asset of assetGraph.findAssets()) {
      asset.prettyPrint();
    }

    expect(
      assetGraph.findAssets({ type: 'JavaScript' })[0].text,
      'to equal',
      /* eslint-disable */
      getFunctionBodySource(function() {
        (function(MATH, MATHFLOOR) {
          alert(MATHFLOOR(10.8) + MATHFLOOR(20.4) + MATH.min(3, 5));
        })(Math, Math.floor);
      })
      /* eslint-enable */
    );
  });

  it('should handle a test case with a single JavaScript asset when run with stringLiterals:true', async function() {
    const assetGraph = new AssetGraph();
    await assetGraph
      .loadAssets({
        type: 'JavaScript',
        url: 'file:///foo.js',
        text: getFunctionBodySource(function() {
          /* eslint-disable */
          var a = 'foobarquux',
            b = 'foobarquux';
          f.foobarquux();
          /* eslint-enable */
        })
      })
      .pullGlobalsIntoVariables(
        { type: 'JavaScript' },
        { stringLiterals: true }
      );

    for (const asset of assetGraph.findAssets()) {
      asset.prettyPrint();
    }

    expect(
      assetGraph.findAssets({ type: 'JavaScript' })[0].text,
      'to equal',
      getFunctionBodySource(function() {
        /* eslint-disable */
        var FOOBARQUUX = 'foobarquux';
        var a = FOOBARQUUX,
          b = FOOBARQUUX;
        f[FOOBARQUUX]();
        /* eslint-enable */
      })
    );
  });
});
