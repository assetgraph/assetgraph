require('fs').readdirSync(__dirname).forEach(function (fileName) {
    if (/\.js$/.test(fileName) && fileName !== 'index.js') {
        var type = fileName.replace(/\.js$/, '');
        exports.__defineGetter__(type, function () {
            var Constructor = require('./' + fileName);
            Constructor.prototype.type = type;
            return Constructor;
        });
    }
});
