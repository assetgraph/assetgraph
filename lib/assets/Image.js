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

_.extend(Image.prototype, {
    defaultEncoding: null,

    getCanvasImage: memoizeAsyncAccessor('canvasImage', function (cb) {
        function makeImage(bufferOrFsPath, cb) {
            var canvasImage = new Canvas.Image();
            canvasImage.onerror = function (err) {
                process.nextTick(function () {
                    cb(err);
                });
            };
            canvasImage.onload = function () {
                cb(null, canvasImage);
            };
            canvasImage.src = bufferOrFsPath;
        }

        var that = this;
        this.getSerializedSrc(passError(cb, function (src) {
            if (that.type === 'PNG' || that.type === 'JPEG') {
                makeImage(src, cb);
            } else {
                // Use GraphicsMagick while waiting for GIF support: https://github.com/LearnBoost/node-canvas/issues/78
                var buffers = [];
                child_process.spawn('gm', ['convert', that.type.toLowerCase() + ':-', 'png:-']).on('data', function (buffer) {
                    buffers.push(buffer);
                }).on('exit', function () {
                    makeImage(Buffer.concat(buffers), cb);
                }).on('error', cb);
            }
        }));
    })
});

module.exports = Image;
