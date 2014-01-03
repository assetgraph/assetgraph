function TransformQueue(assetGraph) {
    this.assetGraph = assetGraph;
    this.transforms = [];
    this.conditions = [];
}

TransformQueue.prototype = {
    queue: function () { // ...
        if (!this.conditions.length || this.conditions[this.conditions.length - 1]) {
            Array.prototype.push.apply(this.transforms, arguments);
        }
        return this;
    },

    if: function (condition) {
        this.conditions.push(condition);
        return this;
    },

    else: function () {
        if (!this.conditions.length) {
            throw new Error('else: No condition on the stack');
        }
        this.conditions.push(!this.conditions.pop());
        return this;
    },

    endif: function () {
        if (!this.conditions.length) {
            throw new Error('endif: No condition on the stack');
        }
        this.conditions.pop();
        return this;
    },

    run: function (cb) {
        var that = this,
            nextTransform;
        that.assetGraph.transformQueue = that; // Hack
        // Skip past falsy transforms:
        do {
            nextTransform = that.transforms.shift();
        } while (!nextTransform && that.transforms.length);
        if (nextTransform) {
            that.assetGraph._runTransform(nextTransform, function (err) {
                if (err) {
                    err.message = (nextTransform.name || 'unnamed') + " transform: " + err.message;
                    if (cb) {
                        cb(err);
                    } else {
                        that.assetGraph.emit('error', err);
                    }
                } else {
                    that.run(cb);
                }
            });
        } else if (cb) {
            cb(null, that.assetGraph);
        }
        return that;
    }
};

// Pre-ES5 alternative for the 'if' method:
TransformQueue.prototype.if_ = TransformQueue.prototype.if;

module.exports = TransformQueue;
