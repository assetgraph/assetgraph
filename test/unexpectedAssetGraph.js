const URL = require('url');
const urlTools = require('urltools');
const esprima = require('esprima');
const escodegen = require('escodegen');

module.exports = {
  name: 'unexpected-assetgraph',
  installInto(expect) {
    expect.addType({
      name: 'AssetGraph.asset',
      base: 'object',
      identify(obj) {
        return obj && obj.isAsset && obj.constructor !== Object;
      },
      equal(a, b) {
        return (
          a.type === b.type &&
          a.urlOrDescription === b.urlOrDescription &&
          (a.isText ? a.text : a.rawSrc) === (b.isText ? b.text : b.rawSrc)
          // && same outgoing relations
        );
      },
      inspect(asset, depth, output) {
        return output
          .text(`${asset.type}(`)
          .text(asset.urlOrDescription)
          .text(')');
      },
      getKeys(value) {
        return ['type', 'url', 'isLoaded', 'isInline', 'isRedirect'];
      }
    });

    expect.addType({
      name: 'AssetGraph',
      base: 'object',
      identify(obj) {
        return obj && obj.isAssetGraph && obj.constructor !== Object;
      },
      inspect(assetGraph, depth, output) {
        output.text('AssetGraph(').nl();

        assetGraph.findAssets({ isInline: false }).forEach(function(asset) {
          output
            .text(
              `${asset.isLoaded ? ' ' : '!'} ${urlTools.buildRelativeUrl(
                assetGraph.root,
                asset.url
              )}`
            )
            .nl();
        });

        return output.text(')');
      }
    });

    expect.addType({
      name: 'AssetGraph.relation',
      base: 'object',
      identify(obj) {
        return obj && obj.isRelation && obj.constructor !== Object;
      },
      equal(a, b) {
        return a === b;
      },
      inspect(relation, depth, output) {
        return output
          .text(`${relation.type}(`)
          .text(relation.toString())
          .text(')');
      },
      getKeys(value) {
        return ['type', 'hrefType', 'href', 'crossorigin', 'canonical'];
      }
    });

    expect.addAssertion(
      [
        '<AssetGraph> to contain [no] (asset|assets) <string|object|number?>',
        '<AssetGraph> to contain [no] (asset|assets) <string|object|number> <number?>'
      ],
      (expect, subject, value, number) => {
        expect.errorMode = 'nested';
        if (typeof value === 'string') {
          value = { type: value };
        } else if (typeof value === 'number') {
          number = value;
          value = {};
        }
        if (expect.flags.no) {
          return expect(subject.findAssets(value), 'to satisfy', []);
        } else if (typeof number === 'undefined') {
          number = 1;
        }
        const foundAssets = subject.findAssets(value);
        expect(foundAssets, 'to have length', number);
        if (number === 1) {
          return foundAssets[0];
        } else {
          return foundAssets;
        }
      }
    );

    expect.addAssertion(
      '<AssetGraph> to contain (url|urls) <string|array?>',
      function(expect, subject, urls) {
        if (!Array.isArray(urls)) {
          urls = [urls];
        }
        urls = urls.map(url => URL.resolve(subject.root, url));
        expect.errorMode = 'nested';
        urls.forEach(function(url) {
          expect(subject.findAssets({ url }), 'to have length', 1);
        });
      }
    );

    expect.addAssertion(
      '<AssetGraph> to contain [no] (relation|relations) <string|object|number?>',
      function(expect, subject, queryObj) {
        let number;
        if (typeof queryObj === 'string') {
          queryObj = { type: queryObj };
        } else if (typeof queryObj === 'number') {
          number = queryObj;
          queryObj = {};
        }
        if (expect.flags.no) {
          number = 0;
        } else if (typeof number === 'undefined') {
          number = 1;
        }
        expect.errorMode = 'nested';
        const foundRelations = subject.findRelations(queryObj);
        expect(foundRelations, 'to have length', number);
        if (number === 1) {
          return foundRelations[0];
        } else {
          return foundRelations;
        }
      }
    );

    expect.addAssertion(
      '<AssetGraph> to contain [no] (relation|relations) [including unresolved] <string|object|number> <number?>',
      function(expect, subject, queryObj, number) {
        if (typeof queryObj === 'string') {
          queryObj = { type: queryObj };
        } else if (typeof queryObj === 'number') {
          number = queryObj;
          queryObj = {};
        }
        if (expect.flags.no) {
          number = 0;
        } else if (typeof number === 'undefined') {
          number = 1;
        }
        expect.errorMode = 'nested';
        expect(
          subject.findRelations(queryObj, expect.flags['including unresolved']),
          'to have length',
          number
        );
      }
    );

    function toAst(stringOrAssetOrFunctionOrAst) {
      if (typeof stringOrAssetOrFunctionOrAst === 'string') {
        return esprima.parse(stringOrAssetOrFunctionOrAst);
      } else if (stringOrAssetOrFunctionOrAst.isAsset) {
        return stringOrAssetOrFunctionOrAst.parseTree;
      } else if (typeof stringOrAssetOrFunctionOrAst === 'function') {
        return {
          type: 'Program',
          body: esprima.parse(`!${stringOrAssetOrFunctionOrAst.toString()}`)
            .body[0].expression.argument.body.body
        };
      } else {
        return stringOrAssetOrFunctionOrAst;
      }
    }

    function prettyPrintAst(ast) {
      return escodegen.generate(ast);
    }

    expect.addAssertion('[not] to have the same AST as', function(
      expect,
      subject,
      value
    ) {
      expect(
        prettyPrintAst(toAst(subject)),
        '[not] to equal',
        prettyPrintAst(toAst(value))
      );
    });
  }
};
