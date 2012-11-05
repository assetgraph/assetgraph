var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

function createTestCase(inputHtml, expectedOutputHtml, manipulator) {
    return {
        topic: function () {
            var htmlAsset = new AssetGraph.assets.Html({text: inputHtml});
            if (manipulator) {
                manipulator(htmlAsset);
                htmlAsset.markDirty();
            }
            htmlAsset.minify();
            return htmlAsset.text;
        },
        'should return the expected output when minified': function (text) {
            assert.equal(text, expectedOutputHtml);
        }
    };
}


vows.describe('Html.minify').addBatch({
    'pre tag should be left alone': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><pre>  foo bar  </pre></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><pre>  foo bar  </pre></body></html>'
    ),
    'SSI comment should be left alone': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><!--#echo "foo"--></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><!--#echo "foo"--></body></html>'
    ),
    'Knockout containerless binding comment should be preserved but have its leading and trailing whitespace removed': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><!-- ko foreach: blah --><div></div><!--/ko --></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><!--ko foreach: blah--><div></div><!--/ko--></body></html>'
    ),
    'leading whitespace in first text node child of block-level': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>   blah</div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'leading whitespace in first text node child of block-level with comment in the middle': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div> <!--foo-->  blah</div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'leading whitespace in first text node child of block-level, different types of whitespace': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>\t   \nblah</div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'trailing whitespace in last text node child of block-level': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>blah   </div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'trailing whitespace in last text node child of block-level with comment in the middle': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>blah <!--foo-->  </div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'trailing whitespace in last text node child of block-level, different types of whitespace': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>blah   \n\t</div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'sequence of more than one whitespace char in text node': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>blah   blah</div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah blah</div></body></html>'
    ),
    'sequence of more than one whitespace char in text node, different types of whitespace': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>blah \n\t  blah</div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah blah</div></body></html>'
    ),
    'All-whitespace text node': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>   </div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div></div></body></html>'
    ),
    'All-whitespace text node between block-level': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body>    <div></div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div></div></body></html>'
    ),
    'Leading and trailing whitespace between block-level': createTestCase(
        '<!DOCTYPE html>\n<html>   <head> \r\n   </head> \n\n <body>    <div>    </div>    </body>    </html>',
        '<!DOCTYPE html>\n<html><head></head><body><div></div></body></html>'
    ),
    'Text node consisting of a single non-breaking space should be left alone': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body>&nbsp;<div></div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body>&nbsp;<div></div></body></html>'
    ),
    'Whitespace before and after <span data-i18n="..."> should be compressed down to one, but not completely removed': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body>  Here is the thing:  <span data-i18n="blah">foo</span>  and furthermore...  </body></html>',
        '<!DOCTYPE html>\n<html><head></head><body>Here is the thing: <span data-i18n="blah">foo</span> and furthermore...</body></html>'
    ),
    'Text nodes below tags with data-i18n should keep one leading/trailing space': createTestCase(
        '<div><span data-i18n="ShowingXToYOfZ">\n    <span>1</span>\n     -                <span>50</span>\nof                      <span>0</span>\n            </span>\n</div>',
        '<div><span data-i18n="ShowingXToYOfZ"><span>1</span> - <span>50</span>\nof <span>0</span></span></div>'
    ),
    'Non-breaking space should be treated as a regular character when compressing whitespace': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body> &nbsp;  &nbsp; <div></div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body>&nbsp; &nbsp;<div></div></body></html>'
    ),
    'Neighbour text nodes adding up to a sequence of more than one whitespace char': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>foo  </div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>foo bar</div></body></html>',
        function (htmlAsset) {
            var document = htmlAsset.parseTree;
            document.getElementsByTagName('div')[0].appendChild(document.createTextNode('  bar'));
        }
    ),
    'Neighbour text nodes adding up to a sequence of more than one whitespace char': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div></div><div></div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body>bar bar bar bar bar<div></div><div></div></body></html>',
        function (htmlAsset) {
            var document = htmlAsset.parseTree,
                firstDiv = document.getElementsByTagName('div')[0];
            for (var i = 0 ; i < 5 ; i += 1) {
                firstDiv.parentNode.insertBefore(document.createTextNode('  bar  '), firstDiv);
            }
        }
    ),
    'trailing whitespace in inline tag followed by leading whitespace in text node should be trimmed': createTestCase(
        '<div><span>foo </span> bar</div>',
        '<div><span>foo</span> bar</div>' // I'm actually not sure that this one is perfectly safe
    ),
    'trailing whitespace in inline tag followed by leading whitespace in next sibling should be trimmed': createTestCase(
        '<div><span>foo </span><span> bar</span></div>',
        '<div><span>foo </span><span>bar</span></div>' // I'm actually not sure that this one is perfectly safe
    ),
    'trailing whitespace in inline tag followed by leading whitespace in child node of next sibling should be trimmed': createTestCase(
        '<div><span>foo </span><span><span> bar</span></span></div>',
        '<div><span>foo </span><span><span>bar</span></span></div>' // I'm actually not sure that this one is perfectly safe
    ),
    'whitespace inside anchor should be preserved': createTestCase(
        '<ul>\n    <li>\n        <a><i></i> Bar</a>\n    </li>\n</ul>',
        '<ul><li><a><i></i> Bar</a></li></ul>'
    )
})['export'](module);
