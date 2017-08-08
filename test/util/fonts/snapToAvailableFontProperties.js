var expect = require('unexpected');

var snap = require('../../../lib/util/fonts/snapToAvailableFontProperties');

describe('snapToAvailableFontProperties', function () {
    it('should throw a type error when not passing a @font-face declarations array', function () {
        expect(function () {
            snap();
        }, 'to throw', new TypeError('fontFaceDeclarations must be an array'));
    });

    it('should throw a type error when not passing a font properties object', function () {
        expect(function () {
            snap([]);
        }, 'to throw', new TypeError('propsToSnap must be an object'));
    });

    it('should return input values when no @font-face declarations are provided', function () {
        var snapped = snap([], {
            'font-family': 'Tahoma',
            'font-stretch': 'normal',
            'font-style': 'normal',
            'font-weight': 400
        });

        expect(snapped, 'to satisfy', {
            'font-family': 'Tahoma',
            'font-stretch': 'normal',
            'font-style': 'normal',
            'font-weight': 400
        });
    });

    it('should fill in missing font-family property', function () {
        var snapped = snap([], {});

        expect(snapped, 'to satisfy', {
            'font-family': undefined,
            'font-stretch': 'normal',
            'font-style': 'normal',
            'font-weight': 400
        });
    });

    it('should fill in missing font-stretch property', function () {
        var snapped = snap([], {
            'font-family': 'Tahoma',
            'font-style': 'normal',
            'font-weight': 400
        });

        expect(snapped, 'to satisfy', {
            'font-family': 'Tahoma',
            'font-stretch': 'normal',
            'font-style': 'normal',
            'font-weight': 400
        });
    });

    it('should fill in missing font-style property', function () {
        var snapped = snap([], {
            'font-family': 'Tahoma',
            'font-stretch': 'normal',
            'font-weight': 400
        });

        expect(snapped, 'to satisfy', {
            'font-family': 'Tahoma',
            'font-stretch': 'normal',
            'font-style': 'normal',
            'font-weight': 400
        });
    });

    it('should fill in missing font-weight property', function () {
        var snapped = snap([], {
            'font-family': 'Tahoma',
            'font-stretch': 'normal',
            'font-style': 'normal'
        });

        expect(snapped, 'to satisfy', {
            'font-family': 'Tahoma',
            'font-stretch': 'normal',
            'font-style': 'normal',
            'font-weight': 400
        });
    });

    describe('font-family', function () {
    });

    describe('font-stretch', function () {
        it('should return an exact match', function () {
            var snapped = snap(
                [
                    {
                        'font-family': 'foo',
                        'font-stretch': 'extra-condensed'
                    },
                    {
                        'font-family': 'foo',
                        'font-stretch': 'condensed'
                    },
                    {
                        'font-family': 'foo',
                        'font-stretch': 'normal'
                    }
                ],
                {
                    'font-family': 'foo',
                    'font-stretch': 'condensed'
                }
            );

            expect(snapped, 'to satisfy', {
                'font-stretch': 'condensed'
            });
        });

        describe('when looking for `normal` stretch', function () {
            it('should snap to denser alternative when available', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-stretch': 'condensed'
                        },
                        {
                            'font-family': 'foo',
                            'font-stretch': 'expanded'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-stretch': 'normal'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-stretch': 'condensed'
                });
            });

            it('should snap to expanded alternative when no denser ones exist', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-stretch': 'semi-expanded'
                        },
                        {
                            'font-family': 'foo',
                            'font-stretch': 'expanded'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-stretch': 'normal'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-stretch': 'semi-expanded'
                });
            });
        });

        describe('when looking for `semi-condensed` stretch', function () {
            it('should snap to denser alternative when available', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-stretch': 'condensed'
                        },
                        {
                            'font-family': 'foo',
                            'font-stretch': 'expanded'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-stretch': 'semi-condensed'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-stretch': 'condensed'
                });
            });

            it('should snap to expanded alternative when no denser ones exist', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-stretch': 'semi-expanded'
                        },
                        {
                            'font-family': 'foo',
                            'font-stretch': 'expanded'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-stretch': 'semi-condensed'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-stretch': 'semi-expanded'
                });
            });
        });

        describe('when looking for `semi-expanded` stretch', function () {
            it('should snap to more expanded alternative when available', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-stretch': 'condensed'
                        },
                        {
                            'font-family': 'foo',
                            'font-stretch': 'expanded'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-stretch': 'semi-expanded'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-stretch': 'expanded'
                });
            });

            it('should snap to denser alternative when no more expanded ones exist', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-stretch': 'semi-condensed'
                        },
                        {
                            'font-family': 'foo',
                            'font-stretch': 'normal'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-stretch': 'semi-expanded'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-stretch': 'normal'
                });
            });
        });
    });

    describe('font-style', function () {
        describe('when looking for italic', function () {
            it('should return an exact match', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'normal'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'italic'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'oblique'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'italic'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'italic'
                });
            });

            it('should snap to oblique', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'normal'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'oblique'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'italic'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'oblique'
                });
            });

            it('should snap to normal', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'normal'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'italic'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'normal'
                });
            });
        });

        describe('when looking for oblique', function () {
            it('should return an exact match', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'normal'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'italic'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'oblique'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'oblique'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'oblique'
                });
            });

            it('should snap to italic', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'normal'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'italic'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'oblique'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'italic'
                });
            });

            it('should snap to normal', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'normal'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'oblique'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'normal'
                });
            });
        });

        describe('when looking for normal', function () {
            it('should return an exact match', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'normal'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'italic'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'oblique'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'normal'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'normal'
                });
            });

            it('should snap to oblique', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'italic'
                        },
                        {
                            'font-family': 'foo',
                            'font-style': 'oblique'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'normal'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'oblique'
                });
            });

            it('should snap to italic', function () {
                var snapped = snap(
                    [
                        {
                            'font-family': 'foo',
                            'font-style': 'italic'
                        }
                    ],
                    {
                        'font-family': 'foo',
                        'font-style': 'normal'
                    }
                );

                expect(snapped, 'to satisfy', {
                    'font-style': 'italic'
                });
            });
        });
    });

    describe('font-weight', function () {

    });
});
