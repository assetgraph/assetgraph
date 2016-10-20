var childProcess = require('child_process');
var Promise = require('bluebird');

module.exports = function determineFileType(rawSrc) {
    // Work the magic
    return new Promise(function (resolve, reject) {
        var fileProcess = childProcess.spawn('file', ['-b', '--mime-type', '-']),
            fileOutput = '';

        fileProcess.on('error', reject);

        // The 'file' utility might close its stdin as soon as it has figured out the content type:
        fileProcess.stdin.on('error', function () {});

        fileProcess.stdout.on('data', function (chunk) {
            fileOutput += chunk;
        }).on('end', function () {
            resolve(fileOutput.match(/^([^\n]*)/)[1]);
        });

        fileProcess.stdin.end(rawSrc);
    });
};
