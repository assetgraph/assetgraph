require(['some' + 'thing', foo ? "bar" : "quux"], function (something, barOrQuux) {
    alert("Got something!");
});
