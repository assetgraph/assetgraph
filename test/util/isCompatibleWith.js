const AssetGraph = require('../../lib/AssetGraph');
const expect = require('../unexpected-with-plugins');
const isCompatibleWith = require('../../lib/util/isCompatibleWith');

describe('isCompatibleWith', function() {
  it('should consider Css compatible with Asset', function() {
    expect(
      isCompatibleWith(
        new AssetGraph().addAsset({ type: 'Css', text: '' }),
        undefined
      ),
      'to be true'
    );
  });

  it('should consider Atom compatible with Xml', function() {
    expect(
      isCompatibleWith(
        new AssetGraph().addAsset({
          type: 'Atom',
          text: '<?xml version="1.0" encoding="utf-8"?><foo></foo>'
        }),
        'Xml'
      ),
      'to be true'
    );
  });

  it('should consider Xml compatible with Atom', function() {
    expect(
      isCompatibleWith(
        new AssetGraph().addAsset({
          type: 'Xml',
          text: '<?xml version="1.0" encoding="utf-8"?><foo></foo>'
        }),
        'Atom'
      ),
      'to be true'
    );
  });

  it('should consider Css incompatible with JavaScript', function() {
    expect(
      isCompatibleWith(
        new AssetGraph().addAsset({ type: 'Css', text: '' }),
        'JavaScript'
      ),
      'to be false'
    );
  });
});
