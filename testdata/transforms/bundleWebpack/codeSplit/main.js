alert('main!');

require.ensure(['./split'], function() {
    require('./split');
});
