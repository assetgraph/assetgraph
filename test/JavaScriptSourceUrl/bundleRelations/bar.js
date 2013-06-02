function bar() {
    alert("bar");
}

setTimeout(function () {
    throw new Error("argh");
}, 1000);
