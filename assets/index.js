/*global exports, require*/
exports.typeByExtension = {};
exports.typeByContentType = {};

function register(type, extensions) {
    var Constructor = require('./' + type)[type];
    Constructor.prototype.type = type;
    exports[type] = Constructor;
    exports.typeByContentType[Constructor.prototype.contentType] = type;
    if (extensions) {
        extensions.forEach(function (extension) {
            exports.typeByExtension[extension] = type;
            exports.typeByExtension['.' + extension] = type; // Support path.extname
        });
        Constructor.prototype.defaultExtension = extensions[0];
    }
}

register('JavaScript', ['js']);
register('HTML', ['html', 'template', 'xhtml', 'php']);
register('CSS', ['css']);
register('HTC', ['htc']);
register('PNG', ['png']);
register('GIF', ['gif']);
register('JPEG', ['jpg', 'jpeg']);
register('ICO', ['ico']);
register('CacheManifest', ['manifest']);
