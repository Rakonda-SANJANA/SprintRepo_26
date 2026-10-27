sap.ui.define([], function () {
    "use strict";

    return {
        onBackToAssets: function () {
    const lastAssetsListHash =
        sessionStorage.getItem(
            "lastAssetsListHash"
        );

    window.location.hash =
        lastAssetsListHash || "/Assets";
}
    };
});