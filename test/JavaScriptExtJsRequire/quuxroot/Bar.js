Ext.define('Quux.Bar', {
    extend: 'Quux.Base',
    requires: ['Quux.Baz', 'Quux.SomethingElse'],
    mixins: ['Quux.SomeMixin'],
    constructor: function () {
        alert('Hello from Quux.Bar!');
    }
});
