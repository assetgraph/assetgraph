var expect = require('../../unexpected-with-plugins').clone();
var getCounterCharacters = require('../../../lib/util/fonts/getCounterCharacters');

describe('getCounterCharacters', function () {
    describe('with system:fixed', function () {
        describe('without an explicit fallback', function () {
            it('should fall back to decimal when rendering a number outside the range', function () {
                expect(getCounterCharacters({
                    props: {
                        system: 'fixed',
                        symbols: 'A B C D'
                    }
                }, [], [1, 3, 5]), 'to equal', 'AC5');
            });
        });

        describe('with an explicit @custom-counter fallback', function () {
            it('should fall back to the fallback style when rendering a number outside the range', function () {
                expect(getCounterCharacters({
                    props: {
                        system: 'fixed',
                        symbols: 'A B C D',
                        fallback: 'foo'
                    }
                }, [ { name: 'foo', props: { system: 'fixed', symbols: 'Ⓐ Ⓑ Ⓒ Ⓓ Ⓔ Ⓕ' } } ], [1, 3, 5]), 'to equal', 'ACⒺ');
            });
        });

        describe('with an explicit fallback to a built-in counter style', function () {
            it('should fall back to the fallback style when rendering a number outside the range', function () {
                expect(getCounterCharacters({
                    props: {
                        system: 'fixed',
                        symbols: 'A B C D',
                        fallback: 'upper-roman'
                    }
                }, [], [1, 3, 5]), 'to equal', 'ACV');
            });
        });
    });

    describe('with system:cyclic', function () {
        it('should wrap around', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'cyclic',
                    symbols: 'A B C D'
                }
            }, [], [1, 3, 5]), 'to equal', 'ACA');
        });

        it('should fall back', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'cyclic',
                    symbols: 'A B'
                }
            }, [], [-1, 0]), 'to equal', '-10');
        });
    });

    describe('with system:symbolic', function () {
        it('should wrap around and duplicate the symbols one more time after each wrap', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'symbolic',
                    symbols: 'A B'
                }
            }, [], [1, 2, 3, 4, 5]), 'to equal', 'ABAABBAAA');
        });

        it('should fall back', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'symbolic',
                    symbols: 'A B'
                }
            }, [], [-1, 0]), 'to equal', '-10');
        });
    });

    describe('with system:alphabetic', function () {
        it('should wrap around and intepret the symbols as digits', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'alphabetic',
                    symbols: 'A B'
                }
            }, [], [1, 2, 3, 4, 5]), 'to equal', 'ABAAABBA');
        });

        it('should fall back', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'alphabetic',
                    symbols: 'A B'
                }
            }, [], [-1, 0]), 'to equal', '-10');
        });
    });

    describe('with system:numeric', function () {
        it('should wrap around and interpret the symbols as digits', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'numeric',
                    symbols: 'A B'
                }
            }, [], [0, 1, 2, 3, 4]), 'to equal', 'ABAAABBA');
        });

        it('should fall back', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'numeric',
                    symbols: 'A B'
                }
            }, [], [-1]), 'to equal', '-1');
        });
    });

    describe('with system:additive', function () {
        it('should render the values correctly', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'additive',
                    range: '1 3999',
                    'additive-symbols': '1000 M, 900 CM, 500 D, 400 CD, 100 C, 90 XC, 50 L, 40 XL, 10 X, 9 IX, 5 V, 4 IV, 1 I'
                }
            }, [], [123]), 'to equal', 'CXXIII');
        });

        it('should support quoted strings', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'additive',
                    range: '1 3999',
                    'additive-symbols': '100 \'C,foo\', 90 XC, 50 L, 40 XL, 10 X, 9 IX, 5 V, 4 IV, 1 I'
                }
            }, [], [123]), 'to equal', 'C,fooXXIII');
        });

        it('should not mind if the symbols are not defined in order of decreasing value', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'additive',
                    range: '1 3999',
                    'additive-symbols': '1000 M, 900 CM, 500 D, 400 CD, 90 XC, 50 L, 40 XL, 10 X, 9 IX, 5 V, 4 IV, 1 I, 100 C'
                }
            }, [], [123]), 'to equal', 'CXXIII');
        });

        it('should fall back', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'numeric',
                    symbols: 'A B'
                }
            }, [], [-1]), 'to equal', '-1');
        });
    });

    describe('with a range', function () {
        it('should fall back when rendering values outside of the range', function () {
            expect(getCounterCharacters({
                props: {
                    system: 'alphabetic',
                    symbols: 'A B C D E F G H I J K L',
                    range: '1 2, 4 5, 7 infinite'
                }
            }, [], [1, 2, 3, 4, 5, 6, 7, 9999]), 'to equal', 'AB3DE6GEIEC');
        });
    });
});
