// Gets the command line options using the optimist library, then converts --camel-case to camelCase

var optimist = require('optimist'),
    _ = require('underscore');

module.exports = function (options) {
    if (options.usage) {
        optimist.usage(options.usage);
    }
    if (options.demand) {
        optimist.demand(options.demand);
    }
    var commandLineOptions = {};
    _.each(optimist.argv, function (value, optionName) {
        commandLineOptions[optionName.replace(/-([a-z])/g, function ($0, $1) {
            return $1.toUpperCase();
        })] = value;
    });
    return commandLineOptions;
};
