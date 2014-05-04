var unexpected = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

describe('Html#minify()', function () {
    var expect = unexpected.clone().addAssertion('to minify to', function (expect, subject, value, manipulator) {
        var htmlAsset = new AssetGraph.Html({text: subject});
        if (manipulator) {
            manipulator(htmlAsset);
            htmlAsset.markDirty();
        }
        htmlAsset.minify();
        expect(htmlAsset.text, 'to equal', value);
    });

    it('should leave <pre> alone', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><pre>  foo bar  </pre></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><pre>  foo bar  </pre></body></html>'
        );
    });

    it('should leave SSI comment alone', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><!--#echo "foo"--></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><!--#echo "foo"--></body></html>'
        );
    });

    it('should preserve Knockout containerless binding comment, but remove its leading and trailing whitespace', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><!-- ko foreach: blah --><div></div><!--/ko --></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><!--ko foreach: blah--><div></div><!--/ko--></body></html>'
        );
    });

    it('should preserve an already minified Knockout containerless binding comment', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><!--ko foreach: blah--><div></div><!--/ko--></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><!--ko foreach: blah--><div></div><!--/ko--></body></html>'
        );
    });

    it('should remove leading whitespace in the first text node child of a block-level element', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>   blah</div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
        );
    });

    it('should remove leading whitespace in the first text node child of a block-level element with comment in the middle', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div> <!--foo-->  blah</div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
        );
    });

    it('should remove different types of leading whitespace in the first text node child of a block-level element', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>\t   \nblah</div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
        );
    });

    it('should remove trailing whitespace in the last text node child of a block-level element', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>blah   </div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
        );
    });

    it('should remove trailing whitespace in the last text node child of a block-level element with comment in the middle', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>blah <!--foo-->  </div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
        );
    });

    it('should remove different types of trailing whitespace in last text node child of a block-level element', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>blah   \n\t</div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
        );
    });

    it('should compress sequences of more than one whitespace char in text nodes', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>blah   blah</div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>blah blah</div></body></html>'
        );
    });

    it('should compress sequences of different types of whitespace char in text nodes', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>blah \n\t  blah</div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>blah blah</div></body></html>'
        );
    });

    it('should remove an all-whitespace text node', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>   </div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div></div></body></html>'
        );
    });

    it('should remove an all-whitespace text node between block-level elements', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body>    <div></div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div></div></body></html>'
        );
    });

    it('should remove leading and trailing whitespace between block-level', function () {
        expect(
            '<!DOCTYPE html>\n<html>   <head> \r\n   </head> \n\n <body>    <div>    </div>    </body>    </html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div></div></body></html>'
        );
    });

    it('should leave a text node consisting of a single non-breaking space alone', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body>&nbsp;<div></div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body>&nbsp;<div></div></body></html>'
        );
    });

    it('should compress whitespace before and after <span data-i18n="..."> should be compressed down to one', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body>  Here is the thing:  <span data-i18n="blah">foo</span>  and furthermore...  </body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body>Here is the thing: <span data-i18n="blah">foo</span> and furthermore...</body></html>'
        );
    });

    it('should keep one leading/trailing space in text nodes below elements with data-i18n', function () {
        expect(
            '<div><span data-i18n="ShowingXToYOfZ">\n    <span>1</span>\n     -                <span>50</span>\nof                      <span>0</span>\n            </span>\n</div>',
            'to minify to',
            '<div><span data-i18n="ShowingXToYOfZ"><span>1</span> - <span>50</span>\nof <span>0</span></span></div>'
        );
    });

    it('should treat non-breaking space as a regular character when compressing whitespace', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body> &nbsp;  &nbsp; <div></div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body>&nbsp; &nbsp;<div></div></body></html>'
        );
    });

    it('should handle neighbour text nodes adding up to a sequence of more than one whitespace char', function () {
        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div>foo  </div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body><div>foo bar</div></body></html>',
            function (htmlAsset) {
                var document = htmlAsset.parseTree;
                document.getElementsByTagName('div')[0].appendChild(document.createTextNode('  bar'));
            }
        );

        expect(
            '<!DOCTYPE html>\n<html><head></head><body><div></div><div></div></body></html>',
            'to minify to',
            '<!DOCTYPE html>\n<html><head></head><body>bar bar bar bar bar<div></div><div></div></body></html>',
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
});
