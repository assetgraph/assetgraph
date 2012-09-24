
$.fn.alpha = function() {
    return this.append('<p>Alpha is Go!</p>');
};

$.fn.beta = function() {
    return this.append('<p>Beta is Go!</p>');
};

require(['jquery'], function($) {
    //the jquery.alpha.js and jquery.beta.js plugins have been loaded.
    $(function() {
        $('body').alpha().beta();
    });
});
