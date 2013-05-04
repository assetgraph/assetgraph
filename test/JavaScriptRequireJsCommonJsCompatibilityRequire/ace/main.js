require([
    'ace/ace',
    'css!3rdparty/ace/css/editor.css' // For some reason the 'paths' setting doesn't apply to modules loaded via plugins
], function (ace) {
    new ace.edit('editor');
});
