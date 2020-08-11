const expect = require('../unexpected-with-plugins');
const {
  addMissingNamespaces,
  removeAddedNamespaces,
} = require('../../lib/util/svgNamespaces');

describe('svgNamespaces', () => {
  describe('addMissingNamespaces', () => {
    it('should deal with an empty string', () => {
      expect(addMissingNamespaces(''), 'to be', '');
    });

    it('should add implicit namespaces', () => {
      expect(
        addMissingNamespaces('<svg>\n<element:g xlink:href=""></g></svg>'),
        'to be',
        '<svg xmlns:element="http://fake" xmlns:xlink="http://fake">\n<element:g xlink:href=""></g></svg>'
      );
    });

    it('should not add namespaces for reserved keywords', () => {
      expect(
        addMissingNamespaces('<svg><svg:g xmlns:href="" xml:foo=""></g></svg>'),
        'to be',
        '<svg><svg:g xmlns:href="" xml:foo=""></g></svg>'
      );
    });

    it('should not add namespaces for already declared namespaces', () => {
      expect(
        addMissingNamespaces(
          '<svg xmlns:xlink="foo"><g xmlns:href=""></g></svg>'
        ),
        'to be',
        '<svg xmlns:xlink="foo"><g xmlns:href=""></g></svg>'
      );
    });

    it('should deal correctly with both implicit and delacred namespaces', () => {
      expect(
        addMissingNamespaces(
          '<svg xmlns:xlink="foo"><g xmlns:href  =""><element:foo /></g></svg>'
        ),
        'to be',
        '<svg xmlns:element="http://fake" xmlns:xlink="foo"><g xmlns:href  =""><element:foo /></g></svg>'
      );
    });

    it('should not add namespaces for content', () => {
      expect(
        addMissingNamespaces('<svg><text>hello:world</text></svg>'),
        'to be',
        '<svg><text>hello:world</text></svg>'
      );
    });
  });

  describe('removeAddedNamespaces', () => {
    it('should remove faked anmespaces', () => {
      expect(
        removeAddedNamespaces(
          '<svg xmlns:element="http://fake" xmlns:xlink="http://fake"><element:g xlink:href=""></g></svg>'
        ),
        'to be',
        '<svg><element:g xlink:href=""></g></svg>'
      );
    });

    it('should leave non-faked namespace declarations', () => {
      expect(
        removeAddedNamespaces(
          '<svg><svg:g xmlns:href="" xml:foo=""></g></svg>'
        ),
        'to be',
        '<svg><svg:g xmlns:href="" xml:foo=""></g></svg>'
      );
    });

    it('should deal correctly with both implicit and delacred namespaces', () => {
      expect(
        removeAddedNamespaces(
          '<svg xmlns:element="http://fake" xmlns:xlink="foo"><g xmlns:href=""><element:foo /></g></svg>'
        ),
        'to be',
        '<svg xmlns:xlink="foo"><g xmlns:href=""><element:foo /></g></svg>'
      );
    });
  });
});
