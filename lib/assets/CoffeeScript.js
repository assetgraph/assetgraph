var util = require('util'),
    _ = require('underscore'),
    Text = require('./Text');

function CoffeeScript(config) {
    Text.call(this, config);
}

util.inherits(CoffeeScript, Text);

_.extend(CoffeeScript.prototype, {
    contentType: 'text/coffeescript',

    defaultExtension: '.coffee'
});

module.exports = CoffeeScript;
