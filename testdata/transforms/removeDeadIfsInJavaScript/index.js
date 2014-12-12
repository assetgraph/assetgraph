if (foo) {
    doNotTouchMe();
}

if (foo) {
    if (true) {
        hoistMe();
    }
}

if (true) {
    if (foo) {
        hoistMe();
    }
}

if (foo) {
    if ("foo" === "bar") {
        removeMe();
    }
}

if (true) {
    keepMe();
}

if ("foo" === "bar") {
    removeMe();
}

if ("afoo" === "afoo") {
    keepMe();
}

if ("bfoo" === "bfoo") {
    if (true) {
        keepMe();
    }
}

if ("foo" === "bar") {
    if (true) {
        removeMe();
    }
}

if ("foo" === "bar") {
    keepMe();
} else {
    keepMe();
}

function fooBar() {
    if ("foo" === "foo") {
        keepMe();
    }
    if ("foo" === "bar") {
        removeMe();
    }
}
