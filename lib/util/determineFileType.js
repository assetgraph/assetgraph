const childProcess = require('child_process');
const pLimit = require('p-limit');

const limit = pLimit(4);

function determineFileType(rawSrc) {
  // Work the magic
  return new Promise((resolve, reject) => {
    const fileProcess = childProcess.spawn('file', ['-b', '--mime-type', '-']);
    let fileOutput = '';

    fileProcess.on('error', reject);

    // The 'file' utility might close its stdin as soon as it has figured out the content type:
    fileProcess.stdin.on('error', () => {});

    fileProcess.stdout
      .on('data', chunk => {
        fileOutput += chunk;
      })
      .on('end', () => {
        let contentType = fileOutput.match(/^([^\n]*)/)[1];
        if (contentType === 'text/x-c') {
          // The file util on mac detects anything containing /* ... */ as C source code,
          // which isn't really helpful in a web context.
          contentType = 'text/plain';
        }
        resolve(contentType);
      });

    fileProcess.stdin.end(rawSrc);
  });
}

module.exports = rawSrc => limit(() => determineFileType(rawSrc));
