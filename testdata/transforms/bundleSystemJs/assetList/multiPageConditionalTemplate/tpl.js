var translate = typeof window !== 'undefined' && window.TRHTML;

function getBaseNameFromUrl(url) {
    return url.split('/').pop().replace(/\.ko$/, '');
}

var injectTemplates = function injectTemplates(templates) {
    templates.forEach(function (tpl) {
        var s = document.createElement('script');
        s.id = tpl.id;
        s.innerHTML = tpl.content;
        s.type = 'text/html';
        document.head.appendChild(s);
    });
};

module.exports = {
    fetch: function (load, fetch) {
        var builder = this.builder;
        return fetch(load)
        .then(function (source) {
            if (builder) {
                load.metadata.templateContent = source;
            } else {
                injectTemplates([
                    {
                        id: getBaseNameFromUrl(load.address),
                        content: translate ? translate(source) : source
                    }
                ]);
            }
            return '';
        });
    },
    bundle: function (loads) {
        return {
            source: '(' + injectTemplates.toString() + ')(' + JSON.stringify(loads.map(function (load) {
                return {
                    id: getBaseNameFromUrl(load.address),
                    content: load.metadata.templateContent
                };
            }), null, 2) + ');'
        };
    },
    listAssets: function (loads) {
        return loads.map(function (load) {
            return {
                url: load.address,
                source: load.metadata.templateContent,
                type: 'knockout-template'
            };
        });
    }
};
