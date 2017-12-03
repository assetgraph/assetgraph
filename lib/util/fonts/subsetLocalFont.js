// https://github.com/googlefonts/tools/blob/master/experimental/make_kit.py
// https://github.com/filamentgroup/glyphhanger/blob/master/index.js

// Installation:
// pip install fonttools brotli zopfli

var fontCmap = require('font-cmap');
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
var execFile = Promise.promisify(childProcess.execFile);

function subsetLocalFont(inputBuffer, format, text, ignoreMissingUnicodes) {
    if (allowedFormats.indexOf(format) === -1) {
        throw new Error('Invalid output format: `' + format + '`. Allowed formats: ' + allowedFormats.map(function (t) { return '`' + t + '`'; }).join(', '));
    }

    var missingChars = [];

    try {
        var obj = fontCmap(inputBuffer);

        for (var i = 0 ; i < text.length ; i += 1) {
            if (typeof obj[text.charCodeAt(i)] === 'undefined') {
                missingChars.push(text.charAt(i));
            }
        }
    } catch (err) {
        if (/Unsupported OpenType version/.test(err.message)) {
            return Promise.reject(new Error('Not a TrueType or OpenType font'));
        } else {
            return Promise.reject(err);
        }
    }

    text = text || '*';

    var tempInputFileName = getTemporaryFilePath({ prefix: 'input-', suffix: '.' + format });
    var tempOutputFileName = getTemporaryFilePath({ prefix: 'output-', suffix: '.' + format });

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

    return writeFile(tempInputFileName, inputBuffer)
        .then(function (result) {
            return execFile('pyftsubset', args);
        })
        .catch(function (err) {
            if (err.message.indexOf('fontTools.ttLib.TTLibError: Not a TrueType or OpenType font (not enough data)') !== -1) {
                throw new Error('Not a TrueType or OpenType font');
            }

            throw err;
        })
        .then(function () {
            return readFile(tempOutputFileName);
        })
        .then(function (buffer) {
            return {
                buffer: buffer,
                missingChars: missingChars
            };
        })
        .finally(function () {
            fs.unlink(tempInputFileName, function () {});
            fs.unlink(tempOutputFileName, function () {});
        });
}

module.exports = subsetLocalFont;
