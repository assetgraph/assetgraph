/*global exports, require*/
exports.byType = {};
exports.typeByExtension = {};
exports.typeByContentType = {};

function register(config) {
    var type = config.type,
        Constructor = require('./' + type)[type];
    Constructor.prototype.type = type;
    exports.byType[config.type] = Constructor;
    exports.typeByContentType[Constructor.prototype.contentType] = type; // Support path.extname
    if (config.extensions) {
        config.extensions.forEach(function (extension) {
            exports.typeByExtension[extension] = type;
            exports.typeByExtension['.' + extension] = type; // Support path.extname
        });
    }
}

register({type: 'JavaScript', extensions: ['js']});
register({type: 'HTML', extensions: ['template', 'html', 'xhtml', 'php']});
register({type: 'CSS', extensions: ['css']});
register({type: 'HTC', extensions: ['htc']});
register({type: 'PNG', extensions: ['png']});
register({type: 'GIF', extensions: ['gif']});
register({type: 'JPEG', extensions: ['jpg', 'jpeg']});
register({type: 'ICO', extensions: ['ico']});
