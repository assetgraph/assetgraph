var passError = require('./util/passError');

module.exports = {
    runTransform: function (transform, cb) {
        var that = this,
            startTime = new Date(),
            done = passError(cb, function () {
                that.emit('afterTransform', transform, new Date().getTime() - startTime);
                cb(null, that);
            });

        that.emit('beforeTransform', transform);

        if (transform.length < 2) {
            process.nextTick(function () {
                try {
                    transform(that);
                } catch (err) {
                    return done(err);
                }
                done();
            });
        } else {
            transform(that, done);
        }
        return that;
    },

    _proceedWithNextTransform: function () {
        var that = this;
        if (!that._transformQueue) {
            that._transformQueue = [];
        }
        // Skip past falsy transforms:
        while (that._transformQueue.length && !that._transformQueue[0]) {
            that._transformQueue.shift();
        }
        if (that._transformQueue.length) {
            that.runTransform(that._transformQueue.shift(), function (err) {
                if (err) {
                    if (that._onComplete) {
                        that._onComplete(err);
                    } else {
                        that.emit('error', err);
                    }
                } else {
                    that._proceedWithNextTransform();
                }
            });
        } else {
            if (that._onComplete) {
                that._onComplete(null, that);
            }
        }
    },

    queue: function () { // ...
        if (!this._transformQueue) {
            this._transformQueue = [];
        }
        Array.prototype.push.apply(this._transformQueue, arguments);
        return this;
    },

    run: function (cb) {
        this._onComplete = cb;
        this._proceedWithNextTransform();
        return this;
    }
};
