const childProcess = require('child_process');
const Promise = require('bluebird');

function limitConcurrency(concurrency, fn) {
  var queue = [];
  var numInFlight = 0;
  function proceed() {
    while (numInFlight < concurrency && queue.length > 0) {
      var job = queue.shift();
      numInFlight += 1;
      var returnValue = fn.apply(job.thisObject, job.args);
      returnValue.then(job.resolve, job.reject).finally(() => {
        numInFlight -= 1;
        proceed();
      });
    }
  }
  return function() {
    // ...
    var args = Array.prototype.slice.call(arguments);
    var thisObject = this;
    return new Promise((resolve, reject) => {
      queue.push({
        args: args,
        thisObject: thisObject,
        resolve: resolve,
        reject: reject
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
        resolve(fileOutput.match(/^([^\n]*)/)[1]);
      });

    fileProcess.stdin.end(rawSrc);
  });
});
