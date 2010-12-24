#!/usr/bin/env node

var sys = require('sys'),
    uglify = require('uglify');

var ast = uglify.parser.parse("one.include('jslib:one.js');\
            one.include('ext:Ext Base');\
            one.include('ext:Ext All');\
            one.exclude('ext:Direct');\
            one.exclude('ext:Trees');\
            one.exclude('ext:Charts');\
            one.exclude('ext:Data - XML');\
            one.exclude('ext:Data - GroupingStore');\
            one.exclude('ext:Grid Foundation');\
            one.exclude('ext:Grid Editor');\
            one.exclude('ext:Grid - GroupingView');\
            one.exclude('ext:Grid - Property Grid');\
            one.exclude('ext:src/widgets/list/ListView.js');\
            one.exclude('ext:src/widgets/list/ColumnResizer.js');\
            one.exclude('ext:src/widgets/list/Sorter.js');\
            one.exclude('ext:src/widgets/list/Column.js');\
            one.exclude('ext:src/widgets/layout/AccordionLayout.js');\
            one.exclude('ext:src/widgets/layout/AbsoluteLayout.js');\
            one.exclude('ext:src/widgets/menu/ColorMenu.js');\
            one.exclude('ext:src/widgets/menu/CheckItem.js');\
            one.exclude('ext:src/widgets/menu/TextItem.js');\
            one.exclude('ext:src/widgets/form/HtmlEditor.js');\
            one.exclude('ext:src/widgets/form/Action.js');\
            one.exclude('ext:src/widgets/form/VTypes.js');\
            one.exclude('ext:src/widgets/ColorPalette.js');\
            one.exclude('ext:src/widgets/CycleButton.js');\
            one.exclude('ext:src/widgets/PagingToolbar.js');\
            one.exclude('ext:src/widgets/Editor.js');\
            one.exclude('ext:src/data/ScriptTagProxy.js');\
            one.exclude('ext:src/state/CookieProvider.js');\
            one.exclude('ext:resources/css/structure/grid.css');\
            one.exclude('ext:resources/css/visual/grid.css');\
            one.exclude('ext:resources/css/structure/editor.css');\
            one.exclude('ext:resources/css/visual/editor.css');\
            one.exclude('ext:resources/css/structure/tree.css');\
            one.exclude('ext:resources/css/visual/tree.css');\
            one.exclude('ext:resources/css/structure/progress.css');\
            one.exclude('ext:resources/css/visual/progress.css');\
            one.exclude('ext:resources/css/structure/list-view.css');\
            one.exclude('ext:resources/css/visual/list-view.css');\
            one.include('csslib:Ext/TabPanel-doNotRenderActiveTabTitleInBold.css');\
            one.include('csslib:Ext/Toolbar-forceButtonOutline.css');\
            one.include('csslib:Ext/Button-fixLineHeightInIE6And7.css');\
            one.include('jslib:Array-addJS16Methods.js');\
            one.include('jslib:Ext-disableCacheBuster.js');\
            one.include('jslib:Ext-useNativeJSON.js');\
            one.include('jslib:Ext-applyFix.js');\
            one.include('jslib:one/Viewport.js');\
            one.include('js:cal/app/Full.js');\
            one.include('csslib:one/Viewport-declareIconsSprite.css');\
            one.include('csslib:Ext/Toolbar-addPreviousAndNextIconsToIconsSprite.css');\
            one.include('csslib:Ext/LoadMask-MakeModalBlockerTransparent.css');\
            Ext.BLANK_IMAGE_URL = one.getStaticUrl('../3rdparty/common-frontend/images/icons/blank_1x1.gif');\
            Ext.onReady(function() {\
                new one.Viewport({\
                    localeBaseUrl: '../locale',\
                    localeId: cal.getCurrentLocaleIdFromCookie(),\
                    applicationConstructor: cal.app.Full\
                });\
            });");

console.log(sys.inspect(ast, false, 10));