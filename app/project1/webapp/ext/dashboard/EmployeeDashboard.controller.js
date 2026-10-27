sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (
    Controller,
    JSONModel,
    MessageToast,
    Fragment
) {
    "use strict";

    return Controller.extend(
        "project1.ext.dashboard.EmployeeDashboard",
        {
            onInit: async function () {
                try {
                    await Promise.all([
                        this._loadEmployeeDashboard(),
                        this._loadMaintenanceStatusChart()
                    ]);
                } catch (error) {
                    console.error(
                        "Employee dashboard loading failed:",
                        error
                    );

                    MessageToast.show(
                        "Unable to load Employee Dashboard"
                    );
                }
            },

            _fetchAsEmployee:
                async function (endpoint) {
                    const response =
                        await fetch(
                            endpoint,
                            {
                                method: "GET",

                                headers: {
                                    "Accept":
                                        "application/json"
                                },

                                credentials:
                                    "include"
                            }
                        );

                    if (!response.ok) {
                        const errorText =
                            await response.text();

                        throw new Error(
                            `${response.status} ` +
                            `${response.statusText}: ` +
                            errorText
                        );
                    }

                    return response.json();
                },

            _getErrorMessage:
                async function (
                    response,
                    defaultMessage
                ) {
                    const errorText =
                        await response.text();

                    if (!errorText) {
                        return defaultMessage;
                    }

                    try {
                        const errorResult =
                            JSON.parse(errorText);

                        if (
                            errorResult.error &&
                            errorResult.error.message
                        ) {
                            return typeof
                                errorResult.error.message ===
                                "string"
                                ? errorResult.error.message
                                : errorResult.error.message.value ||
                                      defaultMessage;
                        }
                    } catch (parseError) {
                        return errorText;
                    }

                    return defaultMessage;
                },

            _loadEmployeeDashboard:
                async function () {
                    const data =
                        await this._fetchAsEmployee(
                            "/odata/v4/" +
                            "asset-management/" +
                            "GetEmployeeDashboard()"
                        );

                    this.getView().setModel(
                        new JSONModel(data),
                        "employee"
                    );
                },

            _loadMaintenanceStatusChart:
                async function () {
                    const data =
                        await this._fetchAsEmployee(
                            "/odata/v4/" +
                            "asset-management/" +
                            "GetMaintenanceStatusChart()"
                        );

                    const records =
                        Array.isArray(data.value)
                            ? data.value
                            : [];

                    this.getView().setModel(
                        new JSONModel(records),
                        "maintenanceChart"
                    );
                },

            onRequestAsset:
                async function () {
                    const view =
                        this.getView();

                    if (
                        !this
                            ._createAssetRequestDialog
                    ) {
                        this._createAssetRequestDialog =
                            await Fragment.load({
                                id:
                                    view.getId(),

                                name:
                                    "project1.ext." +
                                    "fragments." +
                                    "CreateAssetRequestDialog",

                                controller:
                                    this
                            });

                        view.addDependent(
                            this
                                ._createAssetRequestDialog
                        );

                        const categorySelect =
                            Fragment.byId(
                                view.getId(),
                                "assetRequestCategorySelect"
                            );

                        const prioritySelect =
                            Fragment.byId(
                                view.getId(),
                                "assetRequestPrioritySelect"
                            );

                        const reasonInput =
                            Fragment.byId(
                                view.getId(),
                                "assetRequestReasonInput"
                            );

                        const submitButton =
                            Fragment.byId(
                                view.getId(),
                                "submitAssetRequestButton"
                            );

                        const cancelButton =
                            Fragment.byId(
                                view.getId(),
                                "cancelAssetRequestButton"
                            );

                        cancelButton.attachPress(
                            function () {
                                reasonInput.setValue(
                                    ""
                                );

                                reasonInput
                                    .setValueState(
                                        "None"
                                    );

                                prioritySelect
                                    .setSelectedKey(
                                        "MEDIUM"
                                    );

                                this
                                    ._createAssetRequestDialog
                                    .close();
                            }.bind(this)
                        );

                        submitButton.attachPress(
                            async function () {
                                const categoryID =
                                    categorySelect
                                        .getSelectedKey();

                                const priority =
                                    prioritySelect
                                        .getSelectedKey();

                                const reason =
                                    reasonInput
                                        .getValue()
                                        .trim();

                                reasonInput
                                    .setValueState(
                                        reason
                                            ? "None"
                                            : "Error"
                                    );

                                if (
                                    !categoryID ||
                                    !priority ||
                                    !reason
                                ) {
                                    MessageToast.show(
                                        "Complete all required fields"
                                    );

                                    return;
                                }

                                submitButton
                                    .setEnabled(
                                        false
                                    );

                                try {
                                    const response =
                                        await fetch(
                                            "/odata/v4/" +
                                            "asset-management/" +
                                            "CreateAssetRequest",
                                            {
                                                method:
                                                    "POST",

                                                headers: {
                                                    "Content-Type":
                                                        "application/json",

                                                    "Accept":
                                                        "application/json"
                                                },

                                                credentials:
                                                    "include",

                                                body:
                                                    JSON.stringify(
                                                        {
                                                            categoryID:
                                                                categoryID,

                                                            reason:
                                                                reason,

                                                            priority:
                                                                priority
                                                        }
                                                    )
                                            }
                                        );

                                    if (
                                        !response.ok
                                    ) {
                                        const errorMessage =
                                            await this
                                                ._getErrorMessage(
                                                    response,
                                                    "Unable to create asset request"
                                                );

                                        throw new Error(
                                            errorMessage
                                        );
                                    }

                                    await response.json();

                                    reasonInput.setValue(
                                        ""
                                    );

                                    reasonInput
                                        .setValueState(
                                            "None"
                                        );

                                    prioritySelect
                                        .setSelectedKey(
                                            "MEDIUM"
                                        );

                                    this
                                        ._createAssetRequestDialog
                                        .close();

                                    MessageToast.show(
                                        "Asset request submitted successfully"
                                    );
                                } catch (error) {
                                    console.error(
                                        "Asset request creation failed:",
                                        error
                                    );

                                    MessageToast.show(
                                        error.message ||
                                        "Unable to create asset request"
                                    );
                                } finally {
                                    submitButton
                                        .setEnabled(
                                            true
                                        );
                                }
                            }.bind(this)
                        );
                    }

                    this
                        ._createAssetRequestDialog
                        .open();
                },

            onRaiseMaintenanceRequest:
                async function () {
                    const view =
                        this.getView();

                    try {
                        const assignedAssetsData =
                            await this._fetchAsEmployee(
                                "/odata/v4/" +
                                "asset-management/" +
                                "GetMyAssignedAssets()"
                            );

                        const assignedAssets =
                            Array.isArray(
                                assignedAssetsData.value
                            )
                                ? assignedAssetsData.value
                                : [];

                        if (
                            assignedAssets.length ===
                            0
                        ) {
                            MessageToast.show(
                                "No assigned assets are available"
                            );

                            return;
                        }

                        view.setModel(
                            new JSONModel(
                                assignedAssets
                            ),
                            "myAssignedAssets"
                        );

                        if (
                            !this
                                ._maintenanceRequestDialog
                        ) {
                            this._maintenanceRequestDialog =
                                await Fragment.load({
                                    id:
                                        view.getId(),

                                    name:
                                        "project1.ext." +
                                        "fragments." +
                                        "RaiseMaintenanceRequestDialog",

                                    controller:
                                        this
                                });

                            view.addDependent(
                                this
                                    ._maintenanceRequestDialog
                            );

                            const cancelButton =
                                Fragment.byId(
                                    view.getId(),
                                    "cancelMaintenanceRequestButton"
                                );

                            const submitButton =
                                Fragment.byId(
                                    view.getId(),
                                    "submitMaintenanceRequestButton"
                                );

                            cancelButton.attachPress(
                                function () {
                                    const descriptionInput =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceDescriptionInput"
                                        );

                                    const warrantyCheckBox =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceWarrantyCheckBox"
                                        );

                                    const nextDueDatePicker =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceNextDueDatePicker"
                                        );

                                    descriptionInput
                                        .setValue("");

                                    descriptionInput
                                        .setValueState(
                                            "None"
                                        );

                                    warrantyCheckBox
                                        .setSelected(
                                            false
                                        );

                                    nextDueDatePicker
                                        .setValue("");

                                    nextDueDatePicker
                                        .setValueState(
                                            "None"
                                        );

                                    this
                                        ._maintenanceRequestDialog
                                        .close();
                                }.bind(this)
                            );

                            submitButton.attachPress(
                                async function () {
                                    const assetSelect =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceAssetSelect"
                                        );

                                    const typeSelect =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceTypeSelect"
                                        );

                                    const descriptionInput =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceDescriptionInput"
                                        );

                                    const vendorSelect =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceVendorSelect"
                                        );

                                    const warrantyCheckBox =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceWarrantyCheckBox"
                                        );

                                    const nextDueDatePicker =
                                        Fragment.byId(
                                            view.getId(),
                                            "maintenanceNextDueDatePicker"
                                        );

                                    const assetID =
                                        assetSelect
                                            .getSelectedKey();

                                    const maintenanceType =
                                        typeSelect
                                            .getSelectedKey();

                                    const description =
                                        descriptionInput
                                            .getValue()
                                            .trim();

                                    const serviceVendorID =
                                        vendorSelect
                                            .getSelectedKey();

                                    const coveredByWarranty =
                                        warrantyCheckBox
                                            .getSelected();

                                    const nextDueDate =
                                        nextDueDatePicker
                                            .getValue();

                                    descriptionInput
                                        .setValueState(
                                            description
                                                ? "None"
                                                : "Error"
                                        );

                                    nextDueDatePicker
                                        .setValueState(
                                            nextDueDate
                                                ? "None"
                                                : "Error"
                                        );

                                    if (
                                        !assetID ||
                                        !maintenanceType ||
                                        !description ||
                                        !nextDueDate
                                    ) {
                                        MessageToast.show(
                                            "Complete all required fields"
                                        );

                                        return;
                                    }

                                    submitButton
                                        .setEnabled(
                                            false
                                        );

                                    try {
                                        const response =
                                            await fetch(
                                                "/odata/v4/" +
                                                "asset-management/" +
                                                "RaiseMaintenanceRequest",
                                                {
                                                    method:
                                                        "POST",

                                                    headers: {
                                                        "Content-Type":
                                                            "application/json",

                                                        "Accept":
                                                            "application/json"
                                                    },

                                                    credentials:
                                                        "include",

                                                    body:
                                                        JSON.stringify(
                                                            {
                                                                assetID:
                                                                    assetID,

                                                                maintenanceType:
                                                                    maintenanceType,

                                                                description:
                                                                    description,

                                                                serviceVendorID:
                                                                    serviceVendorID ||
                                                                    null,

                                                                coveredByWarranty:
                                                                    coveredByWarranty,

                                                                nextDueDate:
                                                                    nextDueDate
                                                            }
                                                        )
                                                }
                                            );

                                        if (
                                            !response.ok
                                        ) {
                                            const errorMessage =
                                                await this
                                                    ._getErrorMessage(
                                                        response,
                                                        "Unable to raise maintenance request"
                                                    );

                                            throw new Error(
                                                errorMessage
                                            );
                                        }

                                        await response.json();

                                        descriptionInput
                                            .setValue("");

                                        descriptionInput
                                            .setValueState(
                                                "None"
                                            );

                                        warrantyCheckBox
                                            .setSelected(
                                                false
                                            );

                                        nextDueDatePicker
                                            .setValue("");

                                        nextDueDatePicker
                                            .setValueState(
                                                "None"
                                            );

                                        this
                                            ._maintenanceRequestDialog
                                            .close();

                                        await Promise.all([
                                            this
                                                ._loadEmployeeDashboard(),

                                            this
                                                ._loadMaintenanceStatusChart()
                                        ]);

                                        MessageToast.show(
                                            "Maintenance request raised successfully"
                                        );
                                    } catch (error) {
                                        console.error(
                                            "Maintenance request failed:",
                                            error
                                        );

                                        MessageToast.show(
                                            error.message ||
                                            "Unable to raise maintenance request"
                                        );
                                    } finally {
                                        submitButton
                                            .setEnabled(
                                                true
                                            );
                                    }
                                }.bind(this)
                            );
                        }

                        this
                            ._maintenanceRequestDialog
                            .open();
                    } catch (error) {
                        console.error(
                            "Unable to load assigned assets:",
                            error
                        );

                        MessageToast.show(
                            "Unable to load assigned assets"
                        );
                    }
                },

            onReturnedAssetsPress:
                function () {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo(
                            "Reports",
                            {
                                "?query": {
                                    reportTab:
                                        "assignments",

                                    assignmentStatus:
                                        "RETURNED",

                                    sourceRole:
                                        "employee"
                                }
                            }
                        );
                },

            onAssignedAssetsPress:
                function () {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo(
                            "Reports",
                            {
                                "?query": {
                                    reportTab:
                                        "assignments",

                                    assignmentStatus:
                                        "ASSIGNED",

                                    sourceRole:
                                        "employee"
                                }
                            }
                        );
                },

            onMaintenanceRequestsPress:
                function () {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo(
                            "Reports",
                            {
                                "?query": {
                                    reportTab:
                                        "maintenance",

                                    maintenanceStatus:
                                        "OPEN",

                                    sourceRole:
                                        "employee"
                                }
                            }
                        );
                },

            onNavBack: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("Landing");
            }
        }
    );
});