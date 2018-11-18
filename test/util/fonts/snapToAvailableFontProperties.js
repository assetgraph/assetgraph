const expect = require('unexpected');

const snap = require('../../../lib/util/fonts/snapToAvailableFontProperties');

describe('snapToAvailableFontProperties', function() {
  it('should throw a type error when not passing a @font-face declarations array', function() {
    expect(
      function() {
        snap();
      },
      'to throw',
      new TypeError('fontFaceDeclarations must be an array')
    );
  });

  it('should throw a type error when not passing a font properties object', function() {
    expect(
      function() {
        snap([]);
      },
      'to throw',
      new TypeError('propsToSnap must be an object')
    );
  });

  it('should return undefined when no @font-face declarations are provided', function() {
    var snapped = snap([], {
      'font-family': 'Tahoma',
      'font-stretch': 'normal',
      'font-style': 'normal',
      'font-weight': '400'
    });

    expect(snapped, 'to be undefined');
  });

  it('should fill in missing font-stretch property', function() {
    var snapped = snap(
      [
        {
          'font-family': 'Tahoma',
          'font-stretch': 'normal',
          'font-style': 'normal',
          'font-weight': '400'
        }
      ],
      {
        'font-family': 'Tahoma',
        'font-style': 'normal',
        'font-weight': '400'
      }
    );

    expect(snapped, 'to satisfy', {
      'font-family': 'Tahoma',
      'font-stretch': 'normal',
      'font-style': 'normal',
      'font-weight': '400'
    });
  });

  it('should fill in missing font-style property', function() {
    var snapped = snap(
      [
        {
          'font-family': 'Tahoma',
          'font-stretch': 'normal',
          'font-style': 'normal',
          'font-weight': '400'
        }
      ],
      {
        'font-family': 'Tahoma',
        'font-stretch': 'normal',
        'font-weight': '400'
      }
    );

    expect(snapped, 'to satisfy', {
      'font-family': 'Tahoma',
      'font-stretch': 'normal',
      'font-style': 'normal',
      'font-weight': '400'
    });
  });

  it('should fill in missing font-weight property', function() {
    var snapped = snap(
      [
        {
          'font-family': 'Tahoma',
          'font-stretch': 'normal',
          'font-style': 'normal',
          'font-weight': '400'
        }
      ],
      {
        'font-family': 'Tahoma',
        'font-stretch': 'normal',
        'font-style': 'normal'
      }
    );

    expect(snapped, 'to satisfy', {
      'font-family': 'Tahoma',
      'font-stretch': 'normal',
      'font-style': 'normal',
      'font-weight': '400'
    });
  });

  describe('font-family', function() {
    it('should return an exact match', function() {
      var snapped = snap(
        [
          {
            'font-family': 'foo'
          }
        ],
        {
          'font-family': 'foo'
        }
      );

      expect(snapped, 'to satisfy', {
        'font-family': 'foo'
      });
    });

    it('should return a case insensitive match', function() {
      var snapped = snap(
        [
          {
            'font-family': 'Foo'
          }
        ],
        {
          'font-family': 'foO'
        }
      );

      expect(snapped, 'to satisfy', {
        'font-family': 'Foo'
      });
    });

    it('should unquote quoted values', function() {
      var snapped = snap(
        [
          {
            'font-family': 'foo font'
          }
        ],
        {
          'font-family': '"foo font"'
        }
      );

      expect(snapped, 'to satisfy', {
        'font-family': 'foo font'
      });
    });

    it('should match the first font in a multiple value assignment', function() {
      var snapped = snap(
        [
          {
            'font-family': 'foo'
          }
        ],
        {
          'font-family': 'foo, bar, baz'
        }
      );

      expect(snapped, 'to satisfy', {
        'font-family': 'foo'
      });
    });

    it('should not match the subsequent fonts in a multiple value assignment', function() {
      var snapped = snap(
        [
          {
            'font-family': 'foo'
          }
        ],
        {
          'font-family': 'bar, foo, baz'
        }
      );

      expect(snapped, 'to be undefined');
    });
  });

  describe('font-stretch', function() {
    it('should return an exact match', function() {
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

    it('should return a case insensitive match', function() {
      var snapped = snap(
        [
          {
            'font-family': 'foo',
            'font-stretch': 'extra-condensed'
          },
          {
            'font-family': 'foo',
            'font-stretch': 'conDENSED'
          },
          {
            'font-family': 'foo',
            'font-stretch': 'normal'
          }
        ],
        {
          'font-family': 'foo',
          'font-stretch': 'CONdensed'
        }
      );

      expect(snapped, 'to satisfy', {
        'font-stretch': 'conDENSED'
      });
    });

    describe('when looking for `normal` stretch', function() {
      it('should snap to denser alternative when available', function() {
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

      it('should snap to expanded alternative when no denser ones exist', function() {
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

    describe('when looking for `semi-condensed` stretch', function() {
      it('should snap to denser alternative when available', function() {
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

      it('should snap to expanded alternative when no denser ones exist', function() {
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

    describe('when looking for `semi-expanded` stretch', function() {
      it('should snap to more expanded alternative when available', function() {
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

      it('should snap to denser alternative when no more expanded ones exist', function() {
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

    describe('with CSS Fonts 4 ranges', function() {
      it('should snap to an entry with a range that contains the desired value', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-stretch': 'ultra-condensed' },
            {
              'font-family': 'foo',
              'font-stretch': 'extra-condensed semi-condensed'
            },
            { 'font-family': 'foo', 'font-stretch': 'expanded' }
          ],
          {
            'font-family': 'foo',
            'font-stretch': 'condensed'
          }
        );

        expect(snapped, 'to satisfy', {
          'font-stretch': 'extra-condensed semi-condensed'
        });
      });

      it('should prefer a range containing the value to a an inexact match within the range', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-stretch': 'extra-condensed' },
            {
              'font-family': 'foo',
              'font-stretch': 'ultra-condensed ultra-expanded'
            }
          ],
          {
            'font-family': 'foo',
            'font-stretch': 'condensed'
          }
        );

        expect(snapped, 'to satisfy', {
          'font-stretch': 'ultra-condensed ultra-expanded'
        });
      });
    });
  });

  describe('font-style', function() {
    describe('when looking for italic', function() {
      it('should return an exact match', function() {
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

      it('should return a case insensitive match', function() {
        var snapped = snap(
          [
            {
              'font-family': 'foo',
              'font-style': 'normal'
            },
            {
              'font-family': 'foo',
              'font-style': 'itaLIC'
            },
            {
              'font-family': 'foo',
              'font-style': 'oblique'
            }
          ],
          {
            'font-family': 'foo',
            'font-style': 'ITAlic'
          }
        );

        expect(snapped, 'to satisfy', {
          'font-style': 'itaLIC'
        });
      });

      it('should snap to oblique', function() {
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

      it('should snap to normal', function() {
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

    describe('when looking for oblique', function() {
      it('should return an exact match', function() {
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

      it('should snap to italic', function() {
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

      it('should snap to normal', function() {
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

    describe('when looking for normal', function() {
      it('should return an exact match', function() {
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

      it('should snap to oblique', function() {
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

      it('should snap to italic', function() {
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

  describe('font-weight', function() {
    describe('relative font-weights', function() {
      it('should snap to the exact value', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '400' },
            { 'font-family': 'foo', 'font-weight': '500' },
            { 'font-family': 'foo', 'font-weight': '600' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '500'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '500' });
      });

      it('should snap to a case insensitive match', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': 'boLD' },
            { 'font-family': 'foo', 'font-weight': 'light' },
            { 'font-family': 'foo', 'font-weight': 'normal' }
          ],
          {
            'font-family': 'foo',
            'font-weight': 'BOld'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': 'boLD' });
      });

      it('should snap to the best available lighter value', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '100' },
            { 'font-family': 'foo', 'font-weight': '200' },
            { 'font-family': 'foo', 'font-weight': '500' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '300'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '200' });
      });

      it('should snap to the best available bolder value', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '500' },
            { 'font-family': 'foo', 'font-weight': '700' },
            { 'font-family': 'foo', 'font-weight': '800' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '600'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '700' });
      });

      it('should snap to the exact value plus 1 lighter', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '500' },
            { 'font-family': 'foo', 'font-weight': '700' },
            { 'font-family': 'foo', 'font-weight': '800' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '700+lighter'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '500' });
      });

      it('should snap to the exact value plus 2 lighter', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '500' },
            { 'font-family': 'foo', 'font-weight': '700' },
            { 'font-family': 'foo', 'font-weight': '800' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '800+lighter+lighter'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '500' });
      });

      it('should snap to the best available value plus 1 lighter', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '500' },
            { 'font-family': 'foo', 'font-weight': '700' },
            { 'font-family': 'foo', 'font-weight': '800' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '900+lighter'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '700' });
      });

      it('should snap to the best available value plus 2 lighter', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '500' },
            { 'font-family': 'foo', 'font-weight': '700' },
            { 'font-family': 'foo', 'font-weight': '800' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '900+lighter+lighter'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '500' });
      });

      it('should not snap to a lighter weight than what is available', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '200' },
            { 'font-family': 'foo', 'font-weight': '300' },
            { 'font-family': 'foo', 'font-weight': '400' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '300+lighter+lighter'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '200' });
      });

      it('should snap to the exact value plus 1 bolder', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '200' },
            { 'font-family': 'foo', 'font-weight': '300' },
            { 'font-family': 'foo', 'font-weight': '400' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '300+bolder'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '400' });
      });

      it('should snap to the exact value plus 2 bolder', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '200' },
            { 'font-family': 'foo', 'font-weight': '300' },
            { 'font-family': 'foo', 'font-weight': '400' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '200+bolder+bolder'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '400' });
      });

      it('should snap to best available value plus 1 bolder', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '200' },
            { 'font-family': 'foo', 'font-weight': '300' },
            { 'font-family': 'foo', 'font-weight': '400' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '100+bolder'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '300' });
      });

      it('should snap to best available value plus 2 bolder', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '200' },
            { 'font-family': 'foo', 'font-weight': '300' },
            { 'font-family': 'foo', 'font-weight': '400' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '100+bolder+bolder'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '400' });
      });

      it('should not snap to a bolder weight than what is available', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '200' },
            { 'font-family': 'foo', 'font-weight': '300' },
            { 'font-family': 'foo', 'font-weight': '400' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '300+bolder+bolder'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '400' });
      });

      it('should snap to the correct value given both lighter and bolder modifications', function() {
        var snapped = snap(
          [
            { 'font-family': 'foo', 'font-weight': '200' },
            { 'font-family': 'foo', 'font-weight': '300' },
            { 'font-family': 'foo', 'font-weight': '400' }
          ],
          {
            'font-family': 'foo',
            'font-weight': '300+bolder+lighter'
          }
        );

        expect(snapped, 'to satisfy', { 'font-weight': '300' });
      });
    });
  });
});
