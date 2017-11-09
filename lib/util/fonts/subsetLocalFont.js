// https://github.com/googlefonts/tools/blob/master/experimental/make_kit.py
// https://github.com/filamentgroup/glyphhanger/blob/master/index.js

// Installation:
// pip install fonttools brotli zopfli

var childProcess = require('child_process');

try {
    childProcess.execSync('pyftsubset --help');
} catch (err) {
    throw new Error('Subsetting tool not available. How to install: `pip install fonttools brotli zopfli`');
}

var Promise = require('bluebird');
var fs = require('fs');
var getTemporaryFilePath = require('gettemporaryfilepath');

var allowedFormats = [
    'woff',
    'woff2'
];

var readFile = Promise.promisify(fs.readFile);
var writeFile = Promise.promisify(fs.writeFile);
var unlink = Promise.promisify(fs.unlink);
var execFile = Promise.promisify(childProcess.execFile);

function subsetLocalFont(inputBuffer, format, text) {
    if (allowedFormats.indexOf(format) === -1) {
        throw new Error('Invalid output format: `' + format + '`. Allowed formats: ' + allowedFormats.map(function (t) { return '`' + t + '`'; }).join(', '));
    }

    text = text || '*';

    var tempInputFileName = getTemporaryFilePath({ prefix: 'input-', suffix: '.' + format });
    var tempOutputFileName = getTemporaryFilePath({ prefix: 'output-', suffix: '.' + format });

    return writeFile(tempInputFileName, inputBuffer)
        .then(function (result) {
            var args = [
                tempInputFileName,
                '--output-file=' + tempOutputFileName + '',
                '--obfuscate_names',
                '--flavor=' + format,
                '--text="' + text.replace('"', '\\"') +  '"'
            ];

            if (format === 'woff') {
                args.push('--with-zopfli');
            }

            // console.log(args.join(' '));

            return execFile('pyftsubset', args);
        })
        .then(function () {
            return readFile(tempOutputFileName);
        })
        .tap(function () {
            unlink(tempInputFileName);
            unlink(tempOutputFileName);
        });
}

module.exports = subsetLocalFont;
