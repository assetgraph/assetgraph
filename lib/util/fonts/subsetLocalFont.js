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
var execFile = Promise.promisify(childProcess.execFile);

function subsetLocalFont(inputBuffer, format, text, ignoreMissingUnicodes) {
    if (allowedFormats.indexOf(format) === -1) {
        throw new Error('Invalid output format: `' + format + '`. Allowed formats: ' + allowedFormats.map(function (t) { return '`' + t + '`'; }).join(', '));
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

    var missingChars = [];

    return writeFile(tempInputFileName, inputBuffer)
        .then(function (result) {
            return execFile('pyftsubset', args.concat(['--no-ignore-missing-unicodes']));
        })
        .catch(function (err) {
            if (err.message.indexOf('fontTools.ttLib.TTLibError: Not a TrueType or OpenType font (not enough data)') !== -1) {
                throw new Error('Not a TrueType or OpenType font');
            } else {
                var matchMissingUnicodes = err.message.match(
                    /fontTools\.subset\.MissingUnicodesSubsettingError: \[([\s\S]*)\]/
                );
                if (matchMissingUnicodes) {
                    Array.prototype.push.apply(missingChars, matchMissingUnicodes[1].split(/,\s*/).map(function (quotedUPlus) {
                        return String.fromCharCode(parseInt(quotedUPlus.replace(/'U+(.*)'/, '$1'), 16));
                    }));
                    // Retry without --ignore-missing-unicodes:
                    return execFile('pyftsubset', args);
                }
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
