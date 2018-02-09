var arePredicatesExhaustive = require('../../lib/util/arePredicatesExhaustive');
var expect = require('../unexpected-with-plugins');

describe('arePredicatesExhaustive', function() {
  it('should return true for a single empty object', function() {
    expect(arePredicatesExhaustive([{}]), 'to be true');
  });

  it('should return false for a single object with a false predicate', function() {
    expect(arePredicatesExhaustive([{ foo: false }]), 'to be false');
  });

  it('should return false for a single object with a true predicate', function() {
    expect(arePredicatesExhaustive([{ foo: true }]), 'to be false');
  });

  it('should return true for two objects with a predicate in true and false states, respectively', function() {
    expect(
      arePredicatesExhaustive([{ foo: true }, { foo: false }]),
      'to be true'
    );
  });

  it('should return true for two objects with a predicate in true and false states, respectively, and a 3rd object mentioning a second predicate', function() {
    expect(
      arePredicatesExhaustive([{ foo: true }, { foo: false }, { bar: true }]),
      'to be true'
    );
  });

  it('should return true for four objects covering all combinations of two predicates', function() {
    expect(
      arePredicatesExhaustive([
        { foo: true, bar: true },
        { foo: false, bar: false },
        { foo: true, bar: false },
        { foo: false, bar: true }
      ]),
      'to be true'
    );
  });

  it('should return true for four objects covering all but one combination of two predicates and with a duplicate', function() {
    expect(
      arePredicatesExhaustive([
        { foo: true, bar: true },
        { foo: false, bar: false },
        { foo: true, bar: true },
        { foo: false, bar: true }
      ]),
      'to be false'
    );
  });

  it('should return false for three objects covering all but one combination of two predicates', function() {
    expect(
      arePredicatesExhaustive([
        { foo: true, bar: true },
        { foo: false, bar: false },
        { foo: true, bar: false }
      ]),
      'to be false'
    );
  });
});
