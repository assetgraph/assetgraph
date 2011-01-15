 util = require('util'),
    path = require('path'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function Image (config) {
    Base.call(this, config);
}

util.inherits(Image, Base);

_.extend(Image.prototype, {
    encoding: 'binary',

    getContentType: function () {
        if ('contentType' in this) {
            return this.contentType;
        } else {
            // Try guessing it from the url
            // FIXME: Split into PNG/GIF/JPEG subclasses!
            var url = this.url || this.originalUrl,
                contentType;
            if (url) {
                contentType = {
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg'
                }[(path.extname(url) || '').toLowerCase()];
            }
            if (contentType) {
                return contentType;
            } else {
                throw "Image.getContentType couldn't work it out";
            }
        }
    }
});

exports.Image = Image;
