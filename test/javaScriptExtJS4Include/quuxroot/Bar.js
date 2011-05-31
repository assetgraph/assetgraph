Ext.define('Quux.Bar', {
    'extends': 'Quux.Base',
    requires: ['Quux.Baz'],
    mixins: ['Quux.SomeMixin'],
    constructor: function () {
        alert('Hello from Quux.Bar!');
    }
});
