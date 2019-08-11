const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/moveAssets', function() {
  it('should throw if mandatory second argument is missing', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/blah/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://www.example.com/blah/quux.html'
    });

    expect(
      () => assetGraph.moveAssets(),
      'to throw',
      'The second parameter must be a function or a string'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to another absolute url', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/blah/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://www.example.com/blah/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return 'http://www.example.com/blah/someotherplace.html';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'http://www.example.com/blah/someotherplace.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to an absolute url without a file name', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/blah/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://www.example.com/blah/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return 'http://www.example.com/w00p/';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'http://www.example.com/w00p/quux.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to a relative url', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://www.example.com/blah/hey/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return 'otherdir/someotherplace.html';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'http://www.example.com/blah/hey/otherdir/someotherplace.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to a relative url without a file name', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://www.example.com/blah/yay/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return 'otherdir/';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'http://www.example.com/blah/yay/otherdir/quux.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to a relative url with ../', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://www.example.com/blah/hey/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return '../someotherplace.html';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'http://www.example.com/blah/someotherplace.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to a relative url with ../ but without a file name', async function() {
    const assetGraph = new AssetGraph({ root: 'file:///foo/bar/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'file:///foo/bar/hey/blah/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return '../';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'file:///foo/bar/hey/quux.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to a root-relative url', async function() {
    const assetGraph = new AssetGraph({ root: 'file:///foo/bar/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'file:///foo/bar/hello.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return '/yay.html';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'file:///foo/bar/yay.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to a root-relative url without a file name', async function() {
    const assetGraph = new AssetGraph({ root: 'file:///foo/bar/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'file:///foo/bar/blah/foo/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return '/';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'file:///foo/bar/quux.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to a root-relative url without file name', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'http://www.example.com/blah/hey/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return '/';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'http://www.example.com/quux.html'
    );
  });

  it('should handle a test case with a non-inline asset that is moved to a root-relative url without file name, file: urls', async function() {
    const assetGraph = new AssetGraph({ root: 'file:///foo/bar/' });
    assetGraph.addAsset({
      type: 'Html',
      text: 'foo',
      url: 'file:///foo/bar/baz/quux.html'
    });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return '/';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'file:///foo/bar/quux.html'
    );
  });

  it('should handle a test case with an inline asset that is moved to an absolute url', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/blah/' });
    assetGraph.addAsset({ type: 'Html', text: 'foo' });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return 'http://www.example.com/foo/someotherplace.html';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'http://www.example.com/foo/someotherplace.html'
    );
  });

  it('should handle a test case with an inline asset that is moved to an absolute url without a file name', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/blah/' });
    assetGraph.addAsset({
      type: 'Html',
      text: '<style>body { color: maroon; }</style>'
    });
    await assetGraph.moveAssets(
      { type: 'Css' },
      asset => 'http://www.example.com/foo/'
    );

    expect(
      assetGraph.findAssets({ type: 'Css' })[0].url,
      'to equal',
      'http://www.example.com/foo/'
    );
  });

  it('should handle a test case with an inline asset that is moved to a relative url', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/blah/' });
    assetGraph.addAsset({ type: 'Html', text: 'foo' });
    await assetGraph.moveAssets({ type: 'Html' }, function(asset) {
      return 'here/there.html';
    });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].url,
      'to equal',
      'http://www.example.com/blah/here/there.html'
    );
  });

  it('should handle a test case with an inline asset that is moved to a relative url without a file name', async function() {
    const assetGraph = new AssetGraph({ root: 'http://www.example.com/blah/' });
    assetGraph.addAsset({
      type: 'Html',
      text: '<style>body { color: maroon; }</style>'
    });
    await assetGraph.moveAssets({ type: 'Css' }, function(asset) {
      return 'here/';
    });

    expect(
      assetGraph.findAssets({ type: 'Css' })[0].url,
      'to equal',
      'http://www.example.com/blah/here/'
    );
  });

  it('should handle a test case with an inline asset that is moved to a root-relative url', async function() {
    const assetGraph = new AssetGraph({ root: 'file:///foo/bar/' });
    assetGraph.addAsset({
      type: 'Html',
      text: '<style>body { color: maroon; }</style>'
    });
    await assetGraph.moveAssets({ type: 'Css' }, function(asset) {
      return '/there.css';
    });

    expect(
      assetGraph.findAssets({ type: 'Css' })[0].url,
      'to equal',
      'file:///foo/bar/there.css'
    );
  });

  it('should handle a test case with an inline asset that is moved to a root-relative url without a file name', async function() {
    const assetGraph = new AssetGraph({ root: 'file:///foo/bar/' });
    assetGraph.addAsset({
      type: 'Html',
      text: '<style>body { color: maroon; }</style>'
    });
    await assetGraph.moveAssets({ type: 'Css' }, function(asset) {
      return '/';
    });

    expect(
      assetGraph.findAssets({ type: 'Css' })[0].url,
      'to equal',
      'file:///foo/bar/'
    );
  });
});
