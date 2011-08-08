/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlVideoPoster(config) {
    Base.call(this, config);
}

util.inherits(HtmlVideoPoster, Base);

extendWithGettersAndSetters(HtmlVideoPoster.prototype, {
    get href() {
        return this.node.getAttribute('poster');
    },

    set href(url) {
        this.node.setAttribute('poster', url);
    }
});

module.exports = HtmlVideoPoster;
