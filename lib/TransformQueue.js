const Promise = require('bluebird');

function TransformQueue(assetGraph) {
  this.assetGraph = assetGraph;
  this.transforms = [];
  this.conditions = [];
}

TransformQueue.prototype = {
  queue(...args) {
    // ...
    if (
      !this.conditions.length ||
      this.conditions[this.conditions.length - 1]
    ) {
      this.transforms.push(...args);
    }
    return this;
  },

  if(condition) {
    this.conditions.push(condition);
    return this;
  },

  else() {
    if (!this.conditions.length) {
      throw new Error('else: No condition on the stack');
    }
    this.conditions.push(!this.conditions.pop());
    return this;
  },

  endif() {
    if (!this.conditions.length) {
      throw new Error('endif: No condition on the stack');
    }
    this.conditions.pop();
    return this;
  },

  run(cb, previousResult) {
    const that = this;
    let nextTransform;
    that.assetGraph.transformQueue = that; // Hack
    // Skip past falsy transforms:
    do {
      nextTransform = that.transforms.shift();
    } while (!nextTransform && that.transforms.length);
    if (nextTransform) {
      that.assetGraph._runTransform(nextTransform, (err, result) => {
        if (err) {
          // UnexpectedError instance, avoid rendering the error message twice:
          if (err.name !== 'UnexpectedError') {
            err.message = `${nextTransform.name || 'unnamed'} transform: ${
              err.message
            }`;
          }
          if (cb) {
            cb(err);
          } else {
            throw err;
          }
        } else {
          that.run(cb, result);
        }
      });
    } else if (cb) {
      cb(null, previousResult);
    }
    return that;
  },

  then(...args) {
    // ...
    const promise = new Promise((resolve, reject) => {
      this.run((err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
    return promise.then(...args);
  }
};

// Pre-ES5 alternative for the 'if' method:
TransformQueue.prototype.if_ = TransformQueue.prototype.if;

module.exports = TransformQueue;
