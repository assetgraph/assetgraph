var util = require('util'),
    child_process = require('child_process'),
    fs = require('fs'),
    temp = require('temp'),
    _ = require('underscore'),
    Canvas = require('canvas'),
    passError = require('../util/passError'),
    memoizeAsyncAccessor = require('../util/memoizeAsyncAccessor'),
    Base = require('./Base');

require('bufferjs');

function Image(config) {
    Base.call(this, config);
}

util.inherits(Image, Base);

function makeCanvasImage(bufferOrFsPath, cb) {
    var canvasImage = new Canvas.Image();
    canvasImage.onerror = function (err) {
        process.nextTick(function () {
            cb(err);
        });
    };
    canvasImage.onload = function () {
        process.nextTick(function () {
            cb(null, canvasImage);
        });
    };
    canvasImage.src = bufferOrFsPath;
}

_.extend(Image.prototype, {
    defaultEncoding: null,

    getCanvasImage: memoizeAsyncAccessor('canvasImage', function (cb) {
        var that = this;
        this.getSerializedSrc(passError(cb, function (src) {
            if (that.type === 'Png' || that.type === 'Jpeg') {
                makeCanvasImage(src, cb);
            } else {
                // Use GraphicsMagick while waiting for gif support: https://github.com/LearnBoost/node-canvas/issues/78
                var buffers = [],
                    convertProcess = child_process.spawn('gm', ['convert', that.type.toLowerCase() + ':-', 'png:-']);

                convertProcess.stdout.on('data', function (buffer) {
                    buffers.push(buffer);
                });
                convertProcess.on('exit', function () {
                    makeCanvasImage(Buffer.concat(buffers), cb);
                }).on('error', function (err) {console.warn("err! " + err.stack); cb(err);});

                convertProcess.stdin.write(src);
                convertProcess.stdin.end();
            }
        }));
    })
});

module.exports = Image;
