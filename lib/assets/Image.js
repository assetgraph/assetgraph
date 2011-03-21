var util = require('util'),
    fs = require('fs'),
    child_process = require('child_process'),
    _ = require('underscore'),
    Canvas = require('canvas'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    Base = require('./Base').Base;

function Image(config) {
    Base.call(this, config);
}

util.inherits(Image, Base);

_.extend(Image.prototype, {
    encoding: null,

    serialize: function (cb) {
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            cb(null, src);
        }));
    },

    getCanvasImage: memoizeAsyncAccessor('image', function (cb) {
        // This will be a major mess until node-canvas supports GIF and loading from a Buffer/stream/data url
        // https://github.com/learnboost/node-canvas/issues#issue/49
        function makeImage(imagePath, cb) {
            var image = new Canvas.Image();
            image.onerror = cb;
            image.onload = function () {
                cb(null, image);
            };
            image.src = imagePath;
        }

        var that = this;
        this.serialize(error.passToFunction(cb, function (src) {
            var tmpFilePrefix = '/tmp/' + Math.floor(Math.random() * 10000000),
                tmpFileName = tmpFilePrefix + '.' + that.defaultExtension;

            fs.writeFile(tmpFileName, src, that.encoding, error.passToFunction(cb, function () {
                if (that.type === 'PNG' || that.type === 'JPEG') {
                    makeImage(tmpFileName, function (err, image) {
                        fs.unlink(tmpFileName, function () {
                            cb(err, image);
                        });
                    });
                } else {
                    var tmpPngFileName = tmpFilePrefix + '.png',
                        convertProcess = child_process.spawn('gm', ['convert', tmpFileName, tmpPngFileName]);
                    convertProcess.on('exit', function () {
                        makeImage(tmpPngFileName, function (err, image) {
                            fs.unlink(tmpFileName, function () {
                                fs.unlink(tmpPngFileName, function () {
                                    cb(err, image);
                                });
                            });
                        });
                    });
                }
            }));
        }));
    })
});

exports.Image = Image;
