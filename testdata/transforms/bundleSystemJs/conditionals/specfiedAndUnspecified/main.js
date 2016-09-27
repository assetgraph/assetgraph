alert(require('virtual-#{environment}.configjson'));
alert(require('virtual-#{locale}.i18n'));

require('actual-#{locale}.js');
