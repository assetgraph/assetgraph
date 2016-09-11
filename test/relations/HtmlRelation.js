/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlRelation', function () {
    describe('#attachToHead', function () {
        var attachToHead = AssetGraph.HtmlRelation.prototype.attachToHead;

        function getHtmlAsset(htmlString) {
            var graph = new AssetGraph({ root: __dirname });
            var htmlAsset = new AssetGraph.Html({
                text: htmlString || '<!doctype html><html><head></head><body></body></html>',
                url: 'doesntmatter.html'
            });

            graph.addAsset(htmlAsset);

            return htmlAsset;
        }

        function getPreloadLink() {
            return new AssetGraph.HtmlPreloadLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'foo.js' })
            });
        }

        function findRelation(asset, query) {
            return asset.assetGraph.findRelations(query, true)[0];
        }

        describe('api', function () {
            it('should throw when not passing an asset parameter', function () {
                return expect(function () {
                    attachToHead.call(null);
                }, 'to throw', /must be an Html asset/);
            });

            it('should throw when not passing an asset parameter of the wrong type', function () {
                return expect(function () {
                    attachToHead.call(null, { isAsset: true, type: 'JavaScript'});
                }, 'to throw', /must be an Html asset/);
            });

            it('should throw when not passing a position parameter', function () {
                return expect(function () {
                    attachToHead.call(null, { isAsset: true, type: 'Html'});
                }, 'to throw', /The "position" parameter must be either "first", "last", "before" or "after"/);
            });

            it('should throw when passing a wrong position parameter', function () {
                return expect(function () {
                    attachToHead.call(null, { isAsset: true, type: 'Html'}, 'foo');
                }, 'to throw', /The "position" parameter must be either "first", "last", "before" or "after"/);
            });

            it('should throw when not passing an adjacentNode parameter with a "before" position', function () {
                return expect(function () {
                    attachToHead.call(null, { isAsset: true, type: 'Html'}, 'before');
                }, 'to throw', /The "adjacentNode" parameter must be a DOM node if "position" parameter is "before" or "after"/);
            });

            it('should throw when not passing an adjacentNode parameter with a "after" position', function () {
                return expect(function () {
                    attachToHead.call(null, { isAsset: true, type: 'Html'}, 'after');
                }, 'to throw', /The "adjacentNode" parameter must be a DOM node if "position" parameter is "before" or "after"/);
            });

            it('should throw when not passing an adjacentNode that is not a child of <head>', function () {
                var htmlAsset = getHtmlAsset();

                return expect(function () {
                    attachToHead.call(null, htmlAsset, 'after', htmlAsset.parseTree.body);
                }, 'to throw', /The "adjacentNode" parameter must be a DOM node inside <head>/);
            });

            it('should throw when not defining a HTML element node on the calling scope', function () {
                return expect(function () {
                    attachToHead.call(null, { isAsset: true, type: 'Html'}, 'first');
                }, 'to throw', /must be a HTML element/);
            });
        });

        describe('with no <head> tag', function () {
            it('should create a <head> tag', function () {
                var html = getHtmlAsset('<html></html>');
                var relation = getPreloadLink();

                expect(html.outgoingRelations, 'to satisfy', []);

                relation.attachToHead(html, 'first');

                expect(html.parseTree.head, 'not to be null');
                expect(html.outgoingRelations, 'to satisfy', [
                    expect.it('to be', relation)
                ]);
            });
        });

        describe('with no relations in <head> tag', function () {
            describe('with no relations in <body> tag', function () {
                var html = '<!doctype html><html><head></head><body></body></html>';

                it('should append relation node to <head> when using "first"-position', function () {
                    var htmlAsset = getHtmlAsset(html);
                    var relation = getPreloadLink();

                    expect(htmlAsset.outgoingRelations, 'to satisfy', []);
                    expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', []);

                    relation.attachToHead(htmlAsset, 'first');

                    expect(htmlAsset.outgoingRelations, 'to satisfy', [
                        expect.it('to be', relation)
                    ]);
                    expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                        expect.it('to be', relation.node)
                    ]);
                });

                it('should append relation node to <head> when using "last"-position', function () {
                    var htmlAsset = getHtmlAsset(html);
                    var relation = getPreloadLink();

                    expect(htmlAsset.outgoingRelations, 'to satisfy', []);
                    expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', []);

                    relation.attachToHead(htmlAsset, 'last');

                    expect(htmlAsset.outgoingRelations, 'to satisfy', [
                        expect.it('to be', relation)
                    ]);
                    expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                        expect.it('to be', relation.node)
                    ]);
                });
            });

            describe('with relations in <body> tag', function () {
                var html = '<!DOCTYPE html><html><head></head><body><script src="bundle.js"></script></body></html>';

                it('should append relation node to <head> when using "first"-position', function () {
                    var htmlAsset = getHtmlAsset(html);
                    var relation = getPreloadLink();

                    expect(htmlAsset.outgoingRelations, 'to satisfy', [
                        expect.it('to be', findRelation(htmlAsset, {
                            type: 'HtmlScript',
                            href: 'bundle.js'
                        }))
                    ]);

                    expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', []);

                    relation.attachToHead(htmlAsset, 'first');

                    expect(htmlAsset.outgoingRelations, 'to satisfy', [
                        expect.it('to be', relation),
                        expect.it('to be', findRelation(htmlAsset, {
                            type: 'HtmlScript',
                            href: 'bundle.js'
                        }))
                    ]);

                    expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                        expect.it('to be', relation.node)
                    ]);
                });

                it('should append relation node to <head> when using "last"-position', function () {
                    var htmlAsset = getHtmlAsset(html);
                    var relation = getPreloadLink();

                    expect(htmlAsset.outgoingRelations, 'to satisfy', [
                        {
                            type: 'HtmlScript',
                            href: 'bundle.js'
                        }
                    ]);

                    expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', []);

                    relation.attachToHead(htmlAsset, 'last');

                    expect(htmlAsset.outgoingRelations, 'to satisfy', [
                        expect.it('to be', relation),
                        expect.it('to be', findRelation(htmlAsset, {
                            type: 'HtmlScript',
                            href: 'bundle.js'
                        }))
                    ]);

                    expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                        expect.it('to be', relation.node)
                    ]);
                });
            });
        });

        describe('with relations in <head> tag', function () {
            var html = ['<!DOCTYPE html><html><head>',
                '<meta id="tag1" charset="utf-8">',
                '<link id="tag2" rel="shortcut icon" href="/favicon.ico">',
                '<meta id="tag3" http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">',
                '<link id="tag4" rel="shortcut icon" href="/favicon.svg">',
                '<meta id="tag5" name="description" content="content description">',
                '</head><body><script src="bundle.js"></script></body></html>'
            ].join('');

            it('should append relation node first in <head> when using "first"-position', function () {
                var htmlAsset = getHtmlAsset(html);
                var relation = getPreloadLink();

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
                ]);

                expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
                ]);

                relation.attachToHead(htmlAsset, 'first');

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    relation,
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
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

            it('should append relation node last in <head> when using "last"-position', function () {
                var htmlAsset = getHtmlAsset(html);
                var relation = getPreloadLink();

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
                ]);

                expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
                ]);

                relation.attachToHead(htmlAsset, 'last');

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', relation),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
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

            it('should append relation node before <link id="tag2" rel="shortcut icon" href="/favicon.ico">', function () {
                var htmlAsset = getHtmlAsset(html);
                var relation = getPreloadLink();

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
                ]);

                expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
                ]);

                relation.attachToHead(htmlAsset, 'before', htmlAsset.parseTree.querySelector('#tag2'));

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', relation),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
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

            it('should append relation node after <meta id="tag1" charset="utf-8">', function () {
                var htmlAsset = getHtmlAsset(html);
                var relation = getPreloadLink();

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
                ]);

                expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
                ]);

                relation.attachToHead(htmlAsset, 'after', htmlAsset.parseTree.querySelector('#tag1'));

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', relation),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
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

            it('should append relation node before <meta id="tag3" http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">', function () {
                var htmlAsset = getHtmlAsset(html);
                var relation = getPreloadLink();

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
                ]);

                expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
                ]);

                relation.attachToHead(htmlAsset, 'before', htmlAsset.parseTree.querySelector('#tag3'));

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', relation),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
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

            it('should append relation node after <meta id="tag3" http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">', function () {
                var htmlAsset = getHtmlAsset(html);
                var relation = getPreloadLink();

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
                ]);

                expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
                ]);

                relation.attachToHead(htmlAsset, 'after', htmlAsset.parseTree.querySelector('#tag3'));

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', relation),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
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

            it('should append relation node before <meta id="tag5" name="description" content="content description">', function () {
                var htmlAsset = getHtmlAsset(html);
                var relation = getPreloadLink();

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
                ]);

                expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
                ]);

                relation.attachToHead(htmlAsset, 'before', htmlAsset.parseTree.querySelector('#tag5'));

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', relation),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
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

            it('should append relation node after <link id="tag4" rel="shortcut icon" href="/favicon.svg">', function () {
                var htmlAsset = getHtmlAsset(html);
                var relation = getPreloadLink();

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
                ]);

                expect(htmlAsset.parseTree.head.childNodes, 'to satisfy', [
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag1')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag2')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag3')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag4')),
                    expect.it('to be', htmlAsset.parseTree.querySelector('#tag5'))
                ]);

                relation.attachToHead(htmlAsset, 'after', htmlAsset.parseTree.querySelector('#tag4'));

                expect(htmlAsset.outgoingRelations, 'to satisfy', [
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.ico'
                    })),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlShortcutIcon',
                        href: '/favicon.svg'
                    })),
                    expect.it('to be', relation),
                    expect.it('to be', findRelation(htmlAsset, {
                        type: 'HtmlScript',
                        href: 'bundle.js'
                    }))
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

});
