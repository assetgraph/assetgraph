var expect = require('unexpected');
var getRules = require('../../../lib/util/fonts/getCssRulesByProperty');

describe('util/fonts/getCssRulesByProperty', function () {
    it('should throw when not passing an array of properties as first argument', function () {
        expect(getRules, 'to throw', 'properties argument must be an array');
    });

    it('should throw when not passing a cssSource as second argument', function () {
        expect(function () { getRules(['padding']); }, 'to throw', 'cssSource argument must be a string containing valid CSS');
    });

    it('should throw when not passing an incomingMedia array as the third argument', function () {
        expect(function () { getRules(['padding'], 'body { color: maroon; }'); }, 'to throw', 'incomingMedia argument must be an array');
    });

    it('should throw when not passing a valid CSS document in cssSource', function () {
        expect(function () { getRules(['padding'], 'sdkjlasjdlk'); }, 'to throw');
    });

    it('should return empty arrays when no properties apply', function () {
        expect(getRules(['padding'], 'h1 { color: red; }', []), 'to exhaustively satisfy', {
            padding: []
        });
    });

    it('should return an array of matching property values', function () {
        expect(getRules(['color'], 'h1 { color: red; } h2 { color: blue; }', []), 'to exhaustively satisfy', {
            color: [
                {
                    selector: 'h1',
                    incomingMedia: [],
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'red',
                    important: false
                },
                {
                    selector: 'h2',
                    incomingMedia: [],
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'blue',
                    important: false
                }
            ]
        });
    });

    it('should handle linine styles through `bogusselector`-selector', function () {
        expect(getRules(['color'], 'bogusselector { color: red; }', []), 'to exhaustively satisfy', {
            color: [
                {
                    selector: undefined,
                    incomingMedia: [],
                    specificityArray: [1, 0, 0, 0],
                    prop: 'color',
                    value: 'red',
                    important: false
                }
            ]
        });
    });

    it('should memoize the results of a call', function () {
        getRules.cache.reset();

        expect(getRules(['color'], 'h1 { color: red; }', []), 'to exhaustively satisfy', {
            color: [
                {
                    selector: 'h1',
                    incomingMedia: [],
                    specificityArray: [0, 0, 0, 1],
                    prop: 'color',
                    value: 'red',
                    important: false
                }
            ]
        });

        expect(getRules.cache.values(), 'to satisfy', [
            [
                null,
                {
                    color: [
                        {
                            selector: 'h1',
                            incomingMedia: [],
                            specificityArray: [0, 0, 0, 1],
                            prop: 'color',
                            value: 'red',
                            important: false
                        }
                    ]
                }
            ]
        ]);
    });

    describe('overridden values', function () {
        it('should return the last defined value', function () {
            expect(getRules(['color'], 'h1 { color: red; color: blue; }', []), 'to exhaustively satisfy', {
                color: [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'color',
                        value: 'red',
                        important: false
                    },
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'color',
                        value: 'blue',
                        important: false
                    }
                ]
            });
        });
    });

    describe('shorthand font-property', function () {
        it('should ignore invalid shorthands', function () {
            var result = getRules(['font-family', 'font-size'], 'h1 { font: 15px; }', []);

            expect(result, 'to exhaustively satisfy', {
                'font-family': [],
                'font-size': []
            });
        });

        it('register the longhand value from a valid shorthand', function () {
            var result = getRules(['font-family', 'font-size'], 'h1 { font: 15px serif; }', []);

            expect(result, 'to exhaustively satisfy', {
                'font-family': [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-family',
                        value: 'serif',
                        important: false
                    }
                ],
                'font-size': [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-size',
                        value: '15px',
                        important: false
                    }
                ]
            });
        });

        it('should set initial values for requested properties which are not defined in shorthand', function () {
            var result = getRules(['font-family', 'font-size', 'font-style', 'font-weight'], 'h1 { font: 15px serif; }', []);

            expect(result, 'to exhaustively satisfy', {
                'font-family': [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-family',
                        value: 'serif',
                        important: false
                    }
                ],
                'font-size': [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-size',
                        value: '15px',
                        important: false
                    }
                ],
                'font-style': [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-style',
                        value: 'normal',
                        important: false
                    }
                ],
                'font-weight': [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-weight',
                        value: 400,
                        important: false
                    }
                ]
            });
        });

        it('register the longhand value from a shorthand', function () {
            var result = getRules(['font-family', 'font-size'], 'h1 { font-size: 10px; font: 15px serif; font-size: 20px }', []);

            expect(result, 'to exhaustively satisfy', {
                'font-family': [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-family',
                        value: 'serif',
                        important: false
                    }
                ],
                'font-size': [
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-size',
                        value: '10px',
                        important: false
                    },
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-size',
                        value: '15px',
                        important: false
                    },
                    {
                        selector: 'h1',
                        incomingMedia: [],
                        specificityArray: [0, 0, 0, 1],
                        prop: 'font-size',
                        value: '20px',
                        important: false
                    }
                ]
            });
        });
    });
});
