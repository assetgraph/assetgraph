var util = require('util'),
    HtmlScript = require('./HtmlScript');

function HtmlJsx(config) {
    HtmlScript.call(this, config);
}

util.inherits(HtmlJsx, HtmlScript);

module.exports = HtmlJsx;
