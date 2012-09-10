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
    'leading whitespace in text node': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>   blah</div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'leading whitespace in text node, different types of whitespace': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>\t   \nblah</div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'trailing whitespace in text node': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body><div>blah   </div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div>blah</div></body></html>'
    ),
    'trailing whitespace in text node, different types of whitespace': createTestCase(
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
    'All-whitespace text node between tags': createTestCase(
        '<!DOCTYPE html>\n<html><head></head><body>    <div></div></body></html>',
        '<!DOCTYPE html>\n<html><head></head><body><div></div></body></html>'
    ),
    'Leading and trailing whitespace between tags': createTestCase(
        '<!DOCTYPE html>\n<html>   <head> \r\n   </head> \n\n <body>    <div>    </div>    </body>    </html>',
        '<!DOCTYPE html>\n<html><head></head><body><div></div></body></html>'
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
    )
})['export'](module);
