require(['tpl!templates/foo.ko', 'someModule', 'tpl!templates/bar.ko', 'tpl!templates/templateWithEmbeddedTemplate.ko'], function () {
    alert("Alles klar!");
});
