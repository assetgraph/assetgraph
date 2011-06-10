Ext.define('Quux.Bar', {
    'extends': 'Quux.Base',
    requires: ['Quux.Baz'],
    mixins: ['Quux.SomeMixin'],
    uses: 'Quux.SomethingLazyLoaded',
    constructor: function () {
        alert('Hello from Quux.Bar!');
    }
});
