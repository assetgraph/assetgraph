/*global exports, require*/
var _ = require('underscore'),
    nextId = 1;

function Base(config) {
    _.extend(this, config);
    this.id = nextId;
    nextId += 1;
}

_.extend(Base.prototype, {
    toString: function () {
        return "[" + this.type + "/" + this.id + ": " + ((this.from && this.to) ? this.from.toString() + " => " + this.to.toString() : " unattached") + "]";
    }
});

exports.Base = Base;
