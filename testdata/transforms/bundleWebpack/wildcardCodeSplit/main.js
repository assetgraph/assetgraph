alert('main!');

var aOrB = Math.random() > .5 ? 'a' : 'b';

import('./split' + aOrB).then(function () {
    console.log('yup');
});
