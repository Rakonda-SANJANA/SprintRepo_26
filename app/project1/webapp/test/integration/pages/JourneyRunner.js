sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"project1/test/integration/pages/AssetsList.gen",
	"project1/test/integration/pages/AssetsObjectPage.gen"
], function (JourneyRunner, AssetsListGenerated, AssetsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('project1') + '/test/flp.html#app-preview',
        pages: {
			onTheAssetsListGenerated: AssetsListGenerated,
			onTheAssetsObjectPageGenerated: AssetsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

