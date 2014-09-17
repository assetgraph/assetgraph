/*global describe, it*/
var unexpected = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    passError = require('passerror'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs;

describe('assets/Html', function () {
    var expect = unexpected.clone().addAssertion('to minify to', function (expect, subject, value, manipulator) {
        var htmlAsset = new AssetGraph.Html({text: subject});
        if (manipulator) {
            manipulator(htmlAsset);
            htmlAsset.markDirty();
        }
        htmlAsset.minify();
        expect(htmlAsset.text, 'to equal', value);
    });

    it('should handle a test case with a javascript: url', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/Html/javascriptUrl/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain relation', 'HtmlAnchor');
                expect(assetGraph, 'to contain asset', 'JavaScript');

                var javaScript = assetGraph.findAssets({type: 'JavaScript', isInline: true})[0];
                javaScript.parseTree.body.push(new uglifyJs.AST_SimpleStatement({
                    body: new uglifyJs.AST_Call({
                        expression: new uglifyJs.AST_SymbolRef({name: 'alert'}),
                        args: [new uglifyJs.AST_String({value: 'bar'})]
                    })
                }));
                javaScript.markDirty();

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /bar/);
            })
            .run(done);
    });

    describe('#text', function () {
        it('should get text of asset instantiated with rawSrc property', function () {
            expect(new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>')
            }).text, 'to equal', '<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>');
        });

        it('should get text of AssetGraph.Html with rawSrcProxy', function (done) {
            var asset = new AssetGraph.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            asset.load(passError(done, function () {
                expect(asset.text, 'to equal', '<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>');
                done();
            }));
        });

        it('should get text of AssetGraph.Html instantiated with text property', function () {
            expect(new AssetGraph.Html({
                text: '<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>'
            }).text, 'to equal', '<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>');
        });

        it('should get text of AssetGraph.Html instantiated with rawSrc property and modified parse tree', function () {
            var htmlAsset = new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>')
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            expect(htmlAsset.text, 'to equal', '<!DOCTYPE html><html><body>Not so much!</body></html>');
        });

        it('should get text of AssetGraph.Html with rawSrcProxy and modified parse tree', function (done) {
            var htmlAsset = new AssetGraph.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            htmlAsset.load(passError(done, function () {
                htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
                htmlAsset.markDirty();
                expect(htmlAsset.text, 'to equal', '<!DOCTYPE html><html><body>Not so much!</body></html>');
                done();
            }));
        });

        it('should get text of AssetGraph.Html with text property and modified parse tree', function () {
            var htmlAsset = new AssetGraph.Html({
                text: '<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>'
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            expect(htmlAsset.text, 'to equal', '<!DOCTYPE html><html><body>Not so much!</body></html>');
        });
    });

    describe('#rawSrc', function () {
        it('should get rawSrc of AssetGraph.Html with rawSrc property', function () {
            expect(new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>')
            }).rawSrc, 'to equal', new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>', 'utf-8'));
        });

        it('should get rawSrc of AssetGraph.Html with rawSrcProxy', function (done) {
            var asset = new AssetGraph.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            asset.load(passError(done, function () {
                expect(asset.rawSrc, 'to equal', new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>', 'utf-8'));
                done();
            }));
        });

        it('should get rawSrc of AssetGraph.Html instantiated with text property', function () {
            expect(new AssetGraph.Html({
                text: '<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>'
            }).rawSrc, 'to equal', new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>', 'utf-8'));
        });

        it('should get rawSrc of AssetGraph.Html with rawSrc property and modified parse tree', function () {
            var htmlAsset = new AssetGraph.Html({
                rawSrc: new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>')
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            expect(htmlAsset.rawSrc, 'to equal', new Buffer('<!DOCTYPE html><html><body>Not so much!</body></html>', 'utf-8'));
        });

        it('should get rawSrc of AssetGraph.Html with rawSrcProxy and modified parse tree', function (done) {
            var htmlAsset = new AssetGraph.Html({
                rawSrcProxy: function (cb) {
                    process.nextTick(function () {
                        cb(null, new Buffer('<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>'));
                    });
                }
            });
            htmlAsset.load(passError(done, function () {
                htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
                htmlAsset.markDirty();
                expect(htmlAsset.rawSrc, 'to equal', new Buffer('<!DOCTYPE html><html><body>Not so much!</body></html>', 'utf-8'));
                done();
            }));
        });

        it('should get rawSrc of AssetGraph.Html with text property and modified parse tree', function () {
            var htmlAsset = new AssetGraph.Html({
                text: '<!DOCTYPE html><html><body>Hello, world!\u263a</body></html>'
            });
            htmlAsset.parseTree.body.firstChild.nodeValue = 'Not so much!';
            htmlAsset.markDirty();
            expect(htmlAsset.rawSrc, 'to equal', new Buffer('<!DOCTYPE html><html><body>Not so much!</body></html>', 'utf-8'));
        });
    });

    describe('template escaping', function () {
        function createAsset(inputHtml) {
            return new AssetGraph.Html({
                text: inputHtml
            });
        }

        it('should handle a non-templated HTML asset', function () {
            var asset = createAsset('<div></div>');

            expect(asset.internalText, 'to equal', asset.text);
        });

        it('should handle an underscore template', function () {
            var asset = createAsset('<div><% foo %></div>');

            expect(asset.internalText, 'not to equal', asset.text);
            expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
            expect(asset._templateReplacements['⋖5⋗'], 'to equal', '<% foo %>');
            expect(asset.text, 'to equal', '<div><% foo %></div>');

            asset.parseTree.firstChild.removeChild(asset.parseTree.firstChild.firstChild);
            asset.markDirty();
            expect(asset.text, 'to equal', '<div></div>');

            asset.text = '<div><% bar %></div>';
            expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
            expect(asset.text, 'to equal', '<div><% bar %></div>');
        });

        it('should handle the PHP template syntax', function () {
            var asset = createAsset('<div><? foo ?></div>');

            expect(asset.internalText, 'not to equal', asset.text);
            expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
            expect(asset._templateReplacements['⋖5⋗'], 'to equal', '<? foo ?>');
            expect(asset.text, 'to equal', '<div><? foo ?></div>');

            asset.text = '<div><? bar ?></div>';
            expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
            expect(asset.text, 'to equal', '<div><? bar ?></div>');
        });

        it('should handle a an underscore template with a PHP close tag inside the dynamic part', function () {
            var asset = createAsset('<div><% foo ?> %></div>');

            expect(asset.internalText, 'to equal', '<div>⋖5⋗</div>');
            expect(asset.text, 'to equal', '<div><% foo ?> %></div>');
        });
    });

    describe('#minify()', function () {
        it('should leave <pre> alone', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><pre>  foo bar  </pre></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><pre>  foo bar  </pre></body></html>'
            );
        });

        it('should leave SSI comment alone', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><!--#echo "foo"--></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><!--#echo "foo"--></body></html>'
            );
        });

        it('should preserve Knockout containerless binding comment, but remove its leading and trailing whitespace', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><!-- ko foreach: blah --><div></div><!--/ko --></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><!--ko foreach: blah--><div></div><!--/ko--></body></html>'
            );
        });

        it('should preserve an already minified Knockout containerless binding comment', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><!--ko foreach: blah--><div></div><!--/ko--></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><!--ko foreach: blah--><div></div><!--/ko--></body></html>'
            );
        });

        it('should preserve Htmlizer containerless binding comment, but remove its leading and trailing whitespace', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><!-- hz foreach: blah --><div></div><!--/hz --></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><!--hz foreach: blah--><div></div><!--/hz--></body></html>'
            );
        });

        it('should remove leading whitespace in the first text node child of a block-level element', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>   blah</div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>blah</div></body></html>'
            );
        });

        it('should remove leading whitespace in the first text node child of a block-level element with comment in the middle', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div> <!--foo-->  blah</div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>blah</div></body></html>'
            );
        });

        it('should remove different types of leading whitespace in the first text node child of a block-level element', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>\t   \nblah</div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>blah</div></body></html>'
            );
        });

        it('should remove trailing whitespace in the last text node child of a block-level element', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>blah   </div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>blah</div></body></html>'
            );
        });

        it('should remove trailing whitespace in the last text node child of a block-level element with comment in the middle', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>blah <!--foo-->  </div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>blah</div></body></html>'
            );
        });

        it('should remove different types of trailing whitespace in last text node child of a block-level element', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>blah   \n\t</div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>blah</div></body></html>'
            );
        });

        it('should compress sequences of more than one whitespace char in text nodes', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>blah   blah</div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>blah blah</div></body></html>'
            );
        });

        it('should compress sequences of different types of whitespace char in text nodes', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>blah \n\t  blah</div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>blah blah</div></body></html>'
            );
        });

        it('should remove an all-whitespace text node', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>   </div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div></div></body></html>'
            );
        });

        it('should remove an all-whitespace text node between block-level elements', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body>    <div></div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div></div></body></html>'
            );
        });

        it('should remove leading and trailing whitespace between block-level', function () {
            expect(
                '<!DOCTYPE html><html>   <head> \r\n   </head> \n\n <body>    <div>    </div>    </body>    </html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div></div></body></html>'
            );
        });

        it('should leave a text node consisting of a single non-breaking space alone', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body>&nbsp;<div></div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body>&nbsp;<div></div></body></html>'
            );
        });

        it('should compress whitespace before and after <span data-i18n="..."> should be compressed down to one', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body>  Here is the thing:  <span data-i18n="blah">foo</span>  and furthermore...  </body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body>Here is the thing: <span data-i18n=blah>foo</span> and furthermore...</body></html>'
            );
        });

        it('should keep one leading/trailing space in text nodes below elements with data-i18n', function () {
            expect(
                '<div><span data-i18n="ShowingXToYOfZ">\n    <span>1</span>\n     -                <span>50</span>\nof                      <span>0</span>\n            </span>\n</div>',
                'to minify to',
                '<div><span data-i18n=ShowingXToYOfZ><span>1</span> - <span>50</span> of <span>0</span></span></div>'
            );
        });

        it('should treat non-breaking space as a regular character when compressing whitespace', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body> &nbsp;  &nbsp; <div></div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body>&nbsp; &nbsp;<div></div></body></html>'
            );
        });

        it('should handle neighbour text nodes adding up to a sequence of more than one whitespace char', function () {
            expect(
                '<!DOCTYPE html><html><head></head><body><div>foo  </div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body><div>foo bar</div></body></html>',
                function (htmlAsset) {
                    var document = htmlAsset.parseTree;
                    document.getElementsByTagName('div')[0].appendChild(document.createTextNode('  bar'));
                }
            );

            expect(
                '<!DOCTYPE html><html><head></head><body><div></div><div></div></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body>bar bar bar bar bar<div></div><div></div></body></html>',
                function (htmlAsset) {
                    var document = htmlAsset.parseTree,
                        firstDiv = document.getElementsByTagName('div')[0];
                    for (var i = 0 ; i < 5 ; i += 1) {
                        firstDiv.parentNode.insertBefore(document.createTextNode('  bar  '), firstDiv);
                    }
                }
            );
        });

        it('should trim trailing whitespace in an inline element followed by a text node with leading whitespace', function () {
            expect(
                '<div><span>foo </span> bar</div>',
                'to minify to',
                '<div><span>foo</span> bar</div>' // I'm actually not sure that this one is perfectly safe
            );
        });

        it('should trim trailing whitespace in inline tag followed by leading whitespace in the next sibling', function () {
            expect(
                '<div><span>foo </span><span> bar</span></div>',
                'to minify to',
                '<div><span>foo </span><span>bar</span></div>' // I'm actually not sure that this one is perfectly safe
            );
        });

        it('should trim trailing whitespace in inline tag followed by leading whitespace in the child node of the next sibling', function () {
            expect(
                '<div><span>foo </span><span><span> bar</span></span></div>',
                'to minify to',
                '<div><span>foo </span><span><span>bar</span></span></div>' // I'm actually not sure that this one is perfectly safe
            );
        });

        it('should preserve whitespace inside anchor', function () {
            expect(
                '<ul>\n    <li>\n        <a><i></i> Bar</a>\n    </li>\n</ul>',
                'to minify to',
                '<ul><li><a><i></i> Bar</a></li></ul>'
            );
        });

        it('should preserve whitespace after SSI include in non-blocklevel context', function () {
            expect(
                '<div><span></span> <!--# echo "foo" --> bar</div>',
                'to minify to',
                '<div><span></span> <!--# echo "foo" --> bar</div>'
            );
        });

        it('should remove whitespace before and after SSI include in block-level context', function () {
            expect(
                '<div><div></div> <!--# echo "foo" --> </div>',
                'to minify to',
                '<div><div></div><!--# echo "foo" --></div>'
            );
        });

        it('should remove whitespace between </title> and conditional comment in <head>', function () {
            expect(
                '<html><head><title>The title</title> <!--[if lt IE 8]><![endif]--></head></html>',
                'to minify to',
                '<html><head><title>The title</title><!--[if lt IE 8]><![endif]--></head></html>'
            );
        });

        it('should apply the configured html-minifier transformations', function () {
            expect(
                '<!DOCTYPE html>\n<html><head></head><body id=" " class="foo"><script type="text/javascript">foo();</script><input type="text" disabled="disabled"></body></html>',
                'to minify to',
                '<!DOCTYPE html><html><head></head><body class=foo><script>foo();</script><input type=text disabled></body></html>'
            );
        });
    });
});
