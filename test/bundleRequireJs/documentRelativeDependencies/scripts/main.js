require(['/thingAtTheRoot.js', 'anotherThingAtTheRoot.js', 'thingInScripts'], function (thingAtTheRoot, anotherThingAtTheRoot, thingInScripts) {
    alert('got ' + thingAtTheRoot + ', ' + anotherThingAtTheRoot + ', and ' + thingInScripts);
});
