/*global exports, require*/
exports.byType = {};
exports.typeByExtension = {};

function register(config) {
    var type = config.type,
        Constructor = require('./' + type);
    Constructor.prototype.type = type;
    exports.byType[config.type] = Constructor;
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
register({type: 'Image', extensions: ['jpg', 'jpeg', 'gif', 'png', 'ico']});
