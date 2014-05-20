/*global define, $, ko*/
define({
    load: function (url, req, load, config) {
        if (!ko.templateSources.externalTemplate) {
            ko.templateSources.externalTemplate = function (template) {
                this.data = {};
                this.template = ko.externalTemplateEngine.templates[template];
            };

            ko.templateSources.externalTemplate.prototype.data = function (key, value) {
                if (value) {
                    return this.data[key];
                } else {
                    this.data[key] = value;
                }
            };

            ko.templateSources.externalTemplate.prototype.text = function (value) {
                if (value) {
                    this.template = value;
                } else {
                    return this.template;
                }
            };

            ko.externalTemplateEngine = function () {
                var nativeTemplateEngine = new ko.nativeTemplateEngine(),
                    nativeMakeTemplateSource = nativeTemplateEngine.makeTemplateSource;

                nativeTemplateEngine.makeTemplateSource = function (template) {
                    if (typeof template === 'string' && ko.externalTemplateEngine.templates[template]) {
                        return new ko.templateSources.externalTemplate(template);
                    } else {
                        return nativeMakeTemplateSource(template);
                    }
                };

                return nativeTemplateEngine;
            };

            ko.externalTemplateEngine.templates = {};

            ko.setTemplateEngine(new ko.externalTemplateEngine());
        }

        $.ajax({
            url: url,
            success: function (htmlString) {
                var templateId = url.split('/').pop().replace(/\.ko$/, '');

                if (templateId in ko.externalTemplateEngine.templates) {
                    throw new Error("tpl plugin for require.js: More than one of the loaded templates have the file name " + templateId + ".ko, skipped " + url + ". Please disambiguate by changing at least one of the file names.");
                } else {
                    // Translate the template if AssetGraph-builder's bootstrapper script is present and we're not using the default language:
                    if (window.TRHTML && (!window.DEFAULTLOCALEID || LOCALEID !== DEFAULTLOCALEID) && window.TRANSLATE !== false) {
                        htmlString = TRHTML(htmlString);
                    }
                    ko.externalTemplateEngine.templates[templateId] = htmlString;
                }
                load(htmlString);
            }
        });
    }
});
