/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/I18n', function() {
  it('should handle a test case where an I18n asset is created and pretty-printed', function() {
    const i18nAsset = new AssetGraph().addAsset({
      type: 'I18n',
      text: '{"c": {"b": {"e": false, "d": true}, "a": 3}, "b": 2}'
    });

    expect(Object.keys(i18nAsset.parseTree), 'to equal', ['c', 'b']);

    i18nAsset.prettyPrint();
    expect(Object.keys(i18nAsset.parseTree), 'to equal', ['b', 'c']);
    expect(Object.keys(i18nAsset.parseTree.c), 'to equal', ['a', 'b']);
    expect(Object.keys(i18nAsset.parseTree.c.b), 'to equal', ['e', 'd']);

    i18nAsset.parseTree.a = { foo: 'bar' };
    i18nAsset.prettyPrint();
    expect(Object.keys(i18nAsset.parseTree), 'to equal', ['a', 'b', 'c']);
  });
});
