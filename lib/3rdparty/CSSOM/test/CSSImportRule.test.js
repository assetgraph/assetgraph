module('CSSImportRule');

test("@import url('button.css');", function(){
	var r = new CSSOM.CSSImportRule;
	r.cssText = "@import url('button.css');";
	equal(r.href, 'button.css');
	equal([].join.call(r.media, ', '), '');
});

test('@import url("button.css");', function(){
	var r = new CSSOM.CSSImportRule;
	r.cssText = '@import url("button.css");';
	equal(r.href, 'button.css');
	equal([].join.call(r.media, ', '), '');
});

test('@import url(button.css);', function(){
	var r = new CSSOM.CSSImportRule;
	r.cssText = '@import url(button.css);';
	equal(r.href, 'button.css');
	equal([].join.call(r.media, ', '), '');
});

test('@import "button.css";', function(){
	var r = new CSSOM.CSSImportRule;
	r.cssText = '@import "button.css";';
	equal(r.href, 'button.css');
	equal([].join.call(r.media, ', '), '');
});

test("@import 'button.css';", function(){
	var r = new CSSOM.CSSImportRule;
	r.cssText = "@import 'button.css';";
	equal(r.href, 'button.css');
	equal([].join.call(r.media, ', '), '');
});

test("@import url(size/medium.css) all;", function(){
	var r = new CSSOM.CSSImportRule;
	r.cssText = '@import url(size/medium.css) all;';
	equal(r.href, 'size/medium.css');
	equal([].join.call(r.media, ', '), "all");
	equal(r.media.mediaText, "all");
});

test('@import url(old.css) screen and (color), projection and (min-color: 256);', function() {
	var r = new CSSOM.CSSImportRule;
	r.cssText = '@import url(old.css) screen and (color), projection and (min-color: 256);';
	equal(r.href, 'old.css');
	equal([].join.call(r.media, ', '), 'screen and (color), projection and (min-color: 256)');
	equal(r.media.mediaText, 'screen and (color), projection and (min-color: 256)');
});
