function bar() {alert("bar");}
setTimeout(function(){throw new Error("argh");}, 1000);

//@ sourceURL=bar.js

function foo() {alert("foo");}

//@ sourceURL=foo.js
