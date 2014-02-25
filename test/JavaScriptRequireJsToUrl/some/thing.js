define(['require'], function (require) {
    alert('From a module in a different directory' + require.toUrl('blah.txt'));
});
