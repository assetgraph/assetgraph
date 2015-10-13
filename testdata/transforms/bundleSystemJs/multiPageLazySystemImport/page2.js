alert('page2');

setTimeout(function () {
    System.import('lazyRequired.js').then(function () {
        alert('yay');
    });
}, 1000);
