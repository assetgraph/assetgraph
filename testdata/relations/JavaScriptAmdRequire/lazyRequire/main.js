define(['thing'], function (thing) {
    if (thing) {
        require(['lazyThing'], function (lazyThing) {
            alert('lazyThing: ' + lazyThing);
        });
    }
});
