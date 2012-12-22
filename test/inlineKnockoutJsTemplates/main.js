require(['tpl!templates/foo.ko', 'module', 'tpl!templates/bar.ko', 'tpl!templates/templateWithEmbeddedTemplate.ko'], function () {
    alert("Alles klar!");
});
