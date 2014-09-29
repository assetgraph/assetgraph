/*global document*/
define({
    load: function (name, req, load, config, map) {
        var url = name,
            linkElement = document.createElement('link'),
            headElement = document.getElementsByTagName('head')[0],
            parentModuleName = map && map.parentMap && map.parentMap.name,
            parentScriptElement,
            i,
            childNode;

        linkElement.setAttribute('href', url);
        linkElement.setAttribute('rel', 'stylesheet');

        if (parentModuleName) {
            for (i = 0 ; i < headElement.childNodes.length ; i += 1) {
                childNode = headElement.childNodes[i];
                if (childNode.nodeType === 1 && childNode.nodeName.toLowerCase() === 'script' && childNode.getAttribute('data-requiremodule') === parentModuleName) {
                    parentScriptElement = childNode;
                    break;
                }
            }
        }

        if (parentScriptElement) {
            headElement.insertBefore(linkElement, parentScriptElement);
        } else {
            headElement.appendChild(linkElement);
        }
        load();
    }
});
