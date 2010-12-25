#!/usr/bin/env node

var assets = require('./assets');

var dataUrl = "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAPCAYAAABut3YUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAPZJREFUeNpi/PX7LwOFwAyIG6HseiA+Ra5BjBQ6xg+IVwAxJ5T/HYgjgHgTOYYxUeCQUiBeh+QQBih7HVSOLiHDDMSTgTiTgLrpQJwLxH9p5RhOaLT4EakeFF3RQPyF2o6RhkaBGYkheRmIPYH4KbXSjC4QnyTDIch6danhGCcgPgwNGXKBNNQMb0ocEwXE24GYn4FyADJjI76Ej88x7UC8FIjZGKgHQDlxGtRsZmISMMjy+dBQoSXYBC0gv+NyDD80xzgx0AeAqg4fIH6NHk0qQHyMjg6B1WvHYDkNFjIgwS1ALMowMOAjEAeBHINe2Q0U+AUQYACQ10C2QNhRogAAAABJRU5ErkJggg==')";

/*
var urlMatch = dataUrl.match(/\burl\((\'|\"|)([^\'\"]+)\1\)/);
console.log(urlMatch);
process.exit();
*/
var css = new assets.byType.CSS({
    src: "div.bar { background-image: url(/foo.png); } table {font-weight: bold; background: red;} span {background-image: " + dataUrl + ";}"
});

css.getRelations(function (err, result) {
    console.log("Got the rels!");
});
