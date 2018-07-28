const childProcess = require('child_process');
const Promise = require('bluebird');

function limitConcurrency(concurrency, fn) {
  const queue = [];
  let numInFlight = 0;
  function proceed() {
    while (numInFlight < concurrency && queue.length > 0) {
      const job = queue.shift();
      numInFlight += 1;
      const returnValue = fn.apply(job.thisObject, job.args);
      returnValue.then(job.resolve, job.reject).finally(() => {
        numInFlight -= 1;
        proceed();
      });
    }
  }
  return function(...args) {
    const thisObject = this;
    return new Promise((resolve, reject) => {
      queue.push({
        args,
        thisObject,
        resolve,
        reject
      });
      proceed();
    });
  };
}

module.exports = limitConcurrency(20, function determineFileType(rawSrc) {
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
});
