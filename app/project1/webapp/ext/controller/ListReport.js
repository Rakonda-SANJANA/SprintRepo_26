sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageToast"
], function (
    Fragment,
    MessageToast
) {
    "use strict";

    function getQueryParameters() {
        const hash =
            window.location.hash || "";

        const queryIndex =
            hash.indexOf("?");

        if (queryIndex === -1) {
            return {};
        }

        const queryString =
            hash.substring(queryIndex + 1);

        const searchParameters =
            new URLSearchParams(queryString);

        const queryParameters = {};

        searchParameters.forEach(function (
            value,
            key
        ) {
            queryParameters[key] = value;
        });

        return queryParameters;
    }

    function navigateToDashboard(sourceRole) {
        const routeByRole = {
            admin: "AdminDashboard",
            manager: "ManagerDashboard",
            employee: "EmployeeDashboard"
        };

        const routeName =
            routeByRole[sourceRole];

        if (!routeName) {
            window.location.hash = "/";
            return;
        }

        window.location.hash =
            "/" +
            {
                AdminDashboard:
                    "admin-dashboard",

                ManagerDashboard:
                    "manager-dashboard",

                EmployeeDashboard:
                    "employee-dashboard"
            }[routeName];
    }

    function getCreateAssetControls(view) {
        return {
            assetTagInput:
                Fragment.byId(
                    view.getId(),
                    "createAssetTagInput"
                ),

            serialNumberInput:
                Fragment.byId(
                    view.getId(),
                    "createSerialNumberInput"
                ),

            categorySelect:
                Fragment.byId(
                    view.getId(),
                    "createCategorySelect"
                ),

            vendorSelect:
                Fragment.byId(
                    view.getId(),
                    "createVendorSelect"
                ),

            modelInput:
                Fragment.byId(
                    view.getId(),
                    "createModelInput"
                ),

            purchaseDatePicker:
                Fragment.byId(
                    view.getId(),
                    "createPurchaseDatePicker"
                ),

            purchaseCostInput:
                Fragment.byId(
                    view.getId(),
                    "createPurchaseCostInput"
                ),

            warrantyExpiryPicker:
                Fragment.byId(
                    view.getId(),
                    "createWarrantyExpiryPicker"
                ),

            saveButton:
                Fragment.byId(
                    view.getId(),
                    "saveAssetButton"
                )
        };
    }

    function clearCreateAssetForm(view) {
        const controls =
            getCreateAssetControls(view);

        controls.assetTagInput.setValue("");
        controls.serialNumberInput.setValue("");
        controls.modelInput.setValue("");
        controls.purchaseDatePicker.setValue("");
        controls.purchaseCostInput.setValue("");
        controls.warrantyExpiryPicker.setValue("");

        controls.assetTagInput.setValueState(
            "None"
        );

        controls.serialNumberInput.setValueState(
            "None"
        );

        controls.modelInput.setValueState(
            "None"
        );

        controls.purchaseDatePicker.setValueState(
            "None"
        );
    }

    const handlers = {
        onCreateAsset: async function () {
            const view =
                this.getEditFlow().getView();

            if (!this._createAssetDialog) {
                this._createAssetDialog =
                    await Fragment.load({
                        id: view.getId(),

                        name:
                            "project1.ext.fragments." +
                            "CreateAssetDialog",

                        controller: this
                    });

                view.addDependent(
                    this._createAssetDialog
                );

                const cancelButton =
                    Fragment.byId(
                        view.getId(),
                        "cancelCreateAssetButton"
                    );

                cancelButton.attachPress(
                    function () {
                        clearCreateAssetForm(
                            view
                        );

                        this._createAssetDialog.close();
                    }.bind(this)
                );

                const saveButton =
                    Fragment.byId(
                        view.getId(),
                        "saveAssetButton"
                    );

                saveButton.attachPress(
                    function () {
                        handlers.onConfirmCreateAsset.call(
                            this
                        );
                    }.bind(this)
                );
            }

            this._createAssetDialog.open();
        },

        onConfirmCreateAsset:
            async function () {

                const view =
                    this.getEditFlow().getView();

                const controls =
                    getCreateAssetControls(view);

                const assetTag =
                    controls.assetTagInput
                        .getValue()
                        .trim();

                const serialNumber =
                    controls.serialNumberInput
                        .getValue()
                        .trim();

                const categoryID =
                    controls.categorySelect
                        .getSelectedKey();

                const vendorID =
                    controls.vendorSelect
                        .getSelectedKey();

                const model =
                    controls.modelInput
                        .getValue()
                        .trim();

                const purchaseDate =
                    controls.purchaseDatePicker
                        .getValue();

                const purchaseCostValue =
                    controls.purchaseCostInput
                        .getValue();

                const warrantyExpiry =
                    controls.warrantyExpiryPicker
                        .getValue();

                controls.assetTagInput.setValueState(
                    assetTag
                        ? "None"
                        : "Error"
                );

                controls.serialNumberInput
                    .setValueState(
                        serialNumber
                            ? "None"
                            : "Error"
                    );

                controls.modelInput.setValueState(
                    model
                        ? "None"
                        : "Error"
                );

                controls.purchaseDatePicker
                    .setValueState(
                        purchaseDate
                            ? "None"
                            : "Error"
                    );

                if (
                    !assetTag ||
                    !serialNumber ||
                    !categoryID ||
                    !vendorID ||
                    !model ||
                    !purchaseDate
                ) {
                    MessageToast.show(
                        "Complete all required fields"
                    );

                    return;
                }

                const purchaseCost =
                    purchaseCostValue === ""
                        ? null
                        : Number(
                            purchaseCostValue
                        );

                if (
                    purchaseCost !== null &&
                    (
                        Number.isNaN(
                            purchaseCost
                        ) ||
                        purchaseCost < 0
                    )
                ) {
                    MessageToast.show(
                        "Purchase cost must be zero or greater"
                    );

                    return;
                }

                if (
                    warrantyExpiry &&
                    warrantyExpiry < purchaseDate
                ) {
                    MessageToast.show(
                        "Warranty expiry cannot be earlier than purchase date"
                    );

                    return;
                }

                controls.saveButton.setEnabled(
                    false
                );

                try {
                    const response = await fetch(
                        "/odata/v4/" +
                        "asset-management/" +
                        "CreateAsset",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            credentials: "include",

                            body: JSON.stringify({
                                assetTag:
                                    assetTag,

                                serialNumber:
                                    serialNumber,

                                categoryID:
                                    categoryID,

                                vendorID:
                                    vendorID,

                                model:
                                    model,

                                purchaseDate:
                                    purchaseDate,

                                purchaseCost:
                                    purchaseCost,

                                warrantyExpiry:
                                    warrantyExpiry ||
                                    null
                            })
                        }
                    );

                    if (!response.ok) {
                        const errorText =
                            await response.text();

                        let errorMessage =
                            "Unable to create asset";

                        try {
                            const errorResult =
                                JSON.parse(
                                    errorText
                                );

                            if (
                                errorResult.error &&
                                errorResult.error.message
                            ) {
                                errorMessage =
                                    errorResult.error.message;
                            }
                        } catch (parseError) {
                            if (errorText) {
                                errorMessage =
                                    errorText;
                            }
                        }

                        throw new Error(
                            errorMessage
                        );
                    }

                    const createdAsset =
                        await response.json();

                    clearCreateAssetForm(
                        view
                    );

                    this._createAssetDialog.close();

                    const modelInstance =
                        view.getModel();

                    if (modelInstance) {
                        modelInstance.refresh();
                    }

                    MessageToast.show(
                        (
                            createdAsset.assetTag ||
                            assetTag
                        ) +
                        " created successfully"
                    );
                } catch (error) {
                    console.error(
                        "Asset creation failed:",
                        error
                    );

                    MessageToast.show(
                        error.message ||
                        "Unable to create asset"
                    );
                } finally {
                    controls.saveButton.setEnabled(
                        true
                    );
                }
            },

        onBackToSourceDashboard: function () {
            const queryParameters =
                getQueryParameters();

            const sourceRole =
                queryParameters.sourceRole;

            navigateToDashboard(sourceRole);
        },

        onOpenAdminDashboard: function () {
            window.location.hash =
                "/admin-dashboard";
        },

        onOpenManagerDashboard: function () {
            window.location.hash =
                "/manager-dashboard";
        },

        onOpenEmployeeDashboard: function () {
            window.location.hash =
                "/employee-dashboard";
        },

        onOpenReports: function () {
            const queryParameters =
                getQueryParameters();

            let sourceRole =
                queryParameters.sourceRole;

            if (!sourceRole) {
                const userModel =
                    sap.ui.getCore().getModel(
                        "user"
                    );

                if (userModel) {
                    const role =
                        userModel.getProperty(
                            "/role"
                        );

                    sourceRole =
                        role
                            ? role.toLowerCase()
                            : null;
                }
            }

            const reportsQuery =
                new URLSearchParams();

            if (sourceRole) {
                reportsQuery.set(
                    "sourceRole",
                    sourceRole
                );
            }

            window.location.hash =
                "/reports" +
                (
                    reportsQuery.toString()
                        ? "?" +
                          reportsQuery.toString()
                        : ""
                );
        }
    };

    return handlers;
});