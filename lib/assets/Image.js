var util = require('util'),
    fs = require('fs'),
    child_process = require('child_process'),
    _ = require('underscore'),
    Canvas = require('canvas'),
    error = require('../util/error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    Base = require('./Base');

function Image(config) {
    Base.call(this, config);
}

util.inherits(Image, Base);

_.extend(Image.prototype, {
    defaultEncoding: null,

    getCanvasImage: memoizeAsyncAccessor('canvasImage', function (cb) {
        // This will be a major mess until node-canvas supports GIF and loading from a Buffer/stream/data url
        // https://github.com/learnboost/node-canvas/issues#issue/49
        function makeImage(fsPath, cb) {
            var canvasImage = new Canvas.Image();
            canvasImage.onerror = function (err) {
                process.nextTick(function () {
                    cb(err);
                });
            };
            canvasImage.onload = function () {
                cb(null, canvasImage);
            };
            canvasImage.src = fsPath;
        }

        var that = this;
        this.getSerializedSrc(error.passToFunction(cb, function (src) {
            var tmpFilePrefix = '/tmp/' + Math.floor(Math.random() * 10000000),
                tmpFileName = tmpFilePrefix + that.defaultExtension;

            fs.writeFile(tmpFileName, src, null, error.passToFunction(cb, function () {
                if (that.type === 'PNG' || that.type === 'JPEG') {
                    makeImage(tmpFileName, function (err, canvasImage) {
                        fs.unlink(tmpFileName);
                        if (err) {
                            return cb(err);
                        }
                        cb(null, canvasImage);
                    });
                } else {
                    var tmpPngFileName = tmpFilePrefix + '.png',
                        convertProcess = child_process.spawn('gm', ['convert', tmpFileName, tmpPngFileName]);
                    convertProcess.on('exit', function () {
                        makeImage(tmpPngFileName, function (err, canvasImage) {
                            fs.unlink(tmpFileName);
                            fs.unlink(tmpPngFileName);
                            if (err) {
                                return cb(err);
                            }
                            cb(null, canvasImage);
                        });
                    });
                }
            }));
        }));
    })
});

module.exports = Image;
