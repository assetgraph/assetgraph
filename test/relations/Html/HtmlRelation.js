const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlRelation', function() {
  describe('#attach', function() {
    describe('when there is an existing relation in both <head> and <body>', function() {
      let htmlAsset;
      beforeEach(function() {
        htmlAsset = new AssetGraph().addAsset({
          type: 'Html',
          text:
            '<!DOCTYPE html>' +
            '<html>' +
            '<head><link rel="stylesheet" href="existingheadstyles.css"></head>' +
            '<body><div><link rel="stylesheet" href="existingbodystyles.css"></div></body>' +
            '</html>'
        });
      });

      it('should support a position of firstInHead', function() {
        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlStyle',
            to: { url: 'newstyles.css' }
          },
          'firstInHead'
        );
        expect(
          htmlAsset.outgoingRelations,
          'to have length',
          3
        ).and('to satisfy', { 0: relation });
        expect(
          htmlAsset.text,
          'to contain',
          '<head><link rel="stylesheet" href="newstyles.css"><link rel="stylesheet" href="existingheadstyles.css">'
        );
      });

      it('should support a position of lastInHead', function() {
        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlStyle',
            to: { url: 'newstyles.css' }
          },
          'lastInHead'
        );
        expect(
          htmlAsset.outgoingRelations,
          'to have length',
          3
        ).and('to satisfy', { 1: relation });
        expect(
          htmlAsset.text,
          'to contain',
          '<head><link rel="stylesheet" href="existingheadstyles.css"><link rel="stylesheet" href="newstyles.css"></head>'
        );
      });

      it('should support a position of firstInBody', function() {
        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlStyle',
            to: { url: 'newstyles.css' }
          },
          'firstInBody'
        );
        expect(
          htmlAsset.outgoingRelations,
          'to have length',
          3
        ).and('to satisfy', { 1: relation });
        expect(
          htmlAsset.text,
          'to contain',
          '</head><body><link rel="stylesheet" href="newstyles.css"><div><link rel="stylesheet" href="existingbodystyles.css"></div></body>'
        );
      });

      it('should support a position of lastInBody', function() {
        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlStyle',
            to: { url: 'newstyles.css' }
          },
          'lastInBody'
        );
        expect(
          htmlAsset.outgoingRelations,
          'to have length',
          3
        ).and('to satisfy', { 2: relation });
        expect(
          htmlAsset.text,
          'to contain',
          '</head><body><div><link rel="stylesheet" href="existingbodystyles.css"></div><link rel="stylesheet" href="newstyles.css"></body>'
        );
      });

      describe('with position=first', function() {
        it('should honor the preferredPosition of the relation type when adding the first relation of its kind, even when other relation types are present', function() {
          const relation = htmlAsset.addRelation(
            {
              type: 'HtmlScript',
              to: { url: 'script.js', type: 'JavaScript' }
            },
            'first'
          );
          expect(
            htmlAsset.outgoingRelations,
            'to have length',
            3
          ).and('to satisfy', { 2: relation });
          expect(
            htmlAsset.text,
            'to contain',
            '</head><body><div><link rel="stylesheet" href="existingbodystyles.css"></div><script src="script.js"></script></body>'
          );
        });
      });

      describe('with position=last', function() {
        it('should honor the preferredPosition of the relation type when adding the first relation of its kind, even when other relation types are present', function() {
          const relation = htmlAsset.addRelation(
            {
              type: 'HtmlScript',
              to: { url: 'script.js', type: 'JavaScript' }
            },
            'last'
          );
          expect(
            htmlAsset.outgoingRelations,
            'to have length',
            3
          ).and('to satisfy', { 2: relation });
          expect(
            htmlAsset.text,
            'to contain',
            '</head><body><div><link rel="stylesheet" href="existingbodystyles.css"></div><script src="script.js"></script></body>'
          );
        });
      });
    });
  });

  describe('attaching to <head>', function() {
    function getHtmlAsset(htmlString) {
      return new AssetGraph({ root: __dirname }).addAsset({
        type: 'Html',
        text:
          htmlString ||
          '<!doctype html><html><head></head><body></body></html>',
        url: 'doesntmatter.html'
      });
    }

    function findRelation(asset, query) {
      return asset.assetGraph.findRelations(query)[0];
    }

    describe('with no <head> tag', function() {
      it('should create a <head> tag', function() {
        const htmlAsset = getHtmlAsset('<html></html>');

        expect(htmlAsset.outgoingRelations, 'to satisfy', []);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'firstInHead'
        );

        expect(htmlAsset.parseTree.head, 'not to be null');
        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it('to be', relation)
        ]);
      });
    });

    describe('with no relations in <head> tag', function() {
      describe('with no relations in <body> tag', function() {
        const html = '<!doctype html><html><head></head><body></body></html>';

        it('should append relation node to <head> when using "first"-position', function() {
          const htmlAsset = getHtmlAsset(html);
          expect(htmlAsset.outgoingRelations, 'to satisfy', []);

          expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', []);

          const relation = htmlAsset.addRelation(
            {
              type: 'HtmlPreloadLink',
              to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
            },
            'firstInHead'
          );

          expect(htmlAsset.outgoingRelations, 'to satisfy', [
            expect.it('to be', relation)
          ]);
          expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
            expect.it('to be', relation.node)
          ]);
        });

        it('should append relation node to <head> when using "last"-position', function() {
          const htmlAsset = getHtmlAsset(html);

          expect(htmlAsset.outgoingRelations, 'to satisfy', []);
          expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', []);

          const relation = htmlAsset.addRelation(
            {
              type: 'HtmlPreloadLink',
              to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
            },
            'lastInHead'
          );

          expect(htmlAsset.outgoingRelations, 'to satisfy', [
            expect.it('to be', relation)
          ]);
          expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
            expect.it('to be', relation.node)
          ]);
        });
      });

      describe('with relations in <body> tag', function() {
        const html =
          '<!DOCTYPE html><html><head></head><body><script src="bundle.js"></script></body></html>';

        it('should append relation node to <head> when using "first"-position', function() {
          const htmlAsset = getHtmlAsset(html);

          expect(htmlAsset.outgoingRelations, 'to satisfy', [
            expect.it(
              'to be',
              findRelation(htmlAsset, {
                type: 'HtmlScript',
                href: 'bundle.js'
              })
            )
          ]);

          expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', []);

          const relation = htmlAsset.addRelation(
            {
              type: 'HtmlPreloadLink',
              to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
            },
            'firstInHead'
          );

          expect(htmlAsset.outgoingRelations, 'to satisfy', [
            expect.it('to be', relation),
            expect.it(
              'to be',
              findRelation(htmlAsset, {
                type: 'HtmlScript',
                href: 'bundle.js'
              })
            )
          ]);

          expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
            expect.it('to be', relation.node)
          ]);
        });

        it('should append relation node to <head> when using "last"-position', function() {
          const htmlAsset = getHtmlAsset(html);

          expect(htmlAsset.outgoingRelations, 'to satisfy', [
            {
              type: 'HtmlScript',
              href: 'bundle.js'
            }
          ]);
          expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', []);

          const relation = htmlAsset.addRelation(
            {
              type: 'HtmlPreloadLink',
              to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
            },
            'lastInHead'
          );

          expect(htmlAsset.outgoingRelations, 'to satisfy', [
            expect.it('to be', relation),
            expect.it(
              'to be',
              findRelation(htmlAsset, {
                type: 'HtmlScript',
                href: 'bundle.js'
              })
            )
          ]);

          expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
            expect.it('to be', relation.node)
          ]);
        });
      });
    });

    describe('with relations in <head> tag', function() {
      const html = [
        '<!DOCTYPE html><html><head>',
        '<meta id="tag1" charset="utf-8">',
        '<link id="tag2" rel="shortcut icon" href="/favicon.ico">',
        '<meta id="tag3" http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">',
        '<link id="tag4" rel="shortcut icon" href="/favicon.svg">',
        '<meta id="tag5" name="description" content="content description">',
        '</head><body><script src="bundle.js"></script></body></html>'
      ].join('');

      it('should append relation node first in <head> when using "first"-position', function() {
        const htmlAsset = getHtmlAsset(html);

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'firstInHead'
        );

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          relation,
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', relation.node),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);
      });

      it('should append relation node last in <head> when using "last"-position', function() {
        const htmlAsset = getHtmlAsset(html);

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'lastInHead'
        );

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it('to be', relation),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5')),
          expect.it('to be', relation.node)
        ]);
      });

      it('should append relation node before <link id="tag2" rel="shortcut icon" href="/favicon.ico">', function() {
        const htmlAsset = getHtmlAsset(html);

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'before',
          htmlAsset.parseTree.querySelector('#tag2')
        );

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it('to be', relation),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', relation.node),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);
      });

      it('should append relation node after <meta id="tag1" charset="utf-8">', function() {
        const htmlAsset = getHtmlAsset(html);

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'after',
          htmlAsset.parseTree.querySelector('#tag1')
        );

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it('to be', relation),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', relation.node),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);
      });

      it('should append relation node before <meta id="tag3" http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">', function() {
        const htmlAsset = getHtmlAsset(html);

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'before',
          htmlAsset.parseTree.querySelector('#tag3')
        );

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it('to be', relation),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', relation.node),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);
      });

      it('should append relation node after <meta id="tag3" http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">', function() {
        const htmlAsset = getHtmlAsset(html);

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'after',
          htmlAsset.parseTree.querySelector('#tag3')
        );

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it('to be', relation),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', relation.node),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);
      });

      it('should append relation node before <meta id="tag5" name="description" content="content description">', function() {
        const htmlAsset = getHtmlAsset(html);

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'before',
          htmlAsset.parseTree.querySelector('#tag5')
        );

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it('to be', relation),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', relation.node),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);
      });

      it('should append relation node after <link id="tag4" rel="shortcut icon" href="/favicon.svg">', function() {
        const htmlAsset = getHtmlAsset(html);

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);

        const relation = htmlAsset.addRelation(
          {
            type: 'HtmlPreloadLink',
            to: { type: 'JavaScript', text: '"use strict"', url: 'foo.js' }
          },
          'after',
          htmlAsset.parseTree.querySelector('#tag4')
        );

        expect(htmlAsset.outgoingRelations, 'to satisfy', [
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.ico'
            })
          ),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlShortcutIcon',
              href: '/favicon.svg'
            })
          ),
          expect.it('to be', relation),
          expect.it(
            'to be',
            findRelation(htmlAsset, {
              type: 'HtmlScript',
              href: 'bundle.js'
            })
          )
        ]);

        expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
          expect.it('to be', relation.node),
          expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
        ]);
      });
    });
  });

  describe('#inline', function() {
    it('should preserve the fragment identifier', function() {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        url: 'https://example.com/',
        text: '<img src="image.svg#foo">'
      });

      assetGraph.addAsset({
        type: 'Svg',
        url: 'https://example.com/image.svg',
        text: `<?xml version="1.0" encoding="UTF-8"?>
          <svg width="82px" height="90px" viewBox="0 0 82 90" version="1.1" xmlns="http://www.w3.org/2000/svg">
              <g id="heart">
                  <path d="M32,11.2c0,2.7-1.2,5.1-3,6.8l0,0L19,28c-1,1-2,2-3,2s-2-1-3-2L3,18c-1.9-1.7-3-4.1-3-6.8C0,6.1,4.1,2,9.2,2
                  c2.7,0,5.1,1.2,6.8,3c1.7-1.9,4.1-3,6.8-3C27.9,1.9,32,6.1,32,11.2z"/>
              </g>
          </svg>
        `
      });

      htmlAsset.outgoingRelations[0].fragment = '#yadda';

      htmlAsset.outgoingRelations[0].hrefType = 'inline';

      expect(htmlAsset.text, 'to contain', 'AgICAgICA=#yadda">');
    });
  });
});
