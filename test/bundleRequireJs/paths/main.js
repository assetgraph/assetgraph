require.config({
    paths: {
        theLibrary: '3rdparty/theLibrary'
    }
});

require(['theLibrary', 'subdir/foo'], function (theLibrary) {
    alert("Got the library: " + theLibrary);
});
