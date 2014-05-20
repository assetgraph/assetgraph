require.config({
    baseUrl: 'lib'
});

require(['submodule'], function (sub) {
    alert('loaded ' + sub);
});
