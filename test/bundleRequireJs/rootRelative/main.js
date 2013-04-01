require(['text!/foo.txt', 'text!foo.txt'], function (fooText1, fooText2) {
    alert("fooText1=" + fooText1 + " fooText2=" + fooText2);
});
