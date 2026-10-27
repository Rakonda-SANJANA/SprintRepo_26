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
        "project1.ext.dashboard.AdminDashboard",
        {
            onInit: async function () {
                try {
                    await Promise.all([
                        this._loadAdminDashboard(),
                        this._loadAssetStatusChart(),
                        this._loadArchiveReasonChart()
                    ]);
                } catch (error) {
                    console.error(
                        "Admin dashboard loading failed:",
                        error
                    );

                    MessageToast.show(
                        "Unable to load Admin Dashboard"
                    );
                }
            },

            _loadAdminDashboard: async function () {
                const response = await fetch(
                    "/odata/v4/asset-management/" +
                    "GetAdminDashboard()"
                );

                if (!response.ok) {
                    throw new Error(
                        "Unable to load Admin dashboard"
                    );
                }

                const data =
                    await response.json();

                this.getView().setModel(
                    new JSONModel(data),
                    "admin"
                );
            },

            _loadAssetStatusChart: async function () {
                const response = await fetch(
                    "/odata/v4/asset-management/" +
                    "GetAssetStatusChart()"
                );

                if (!response.ok) {
                    throw new Error(
                        "Unable to load asset status chart"
                    );
                }

                const data =
                    await response.json();

                const records =
                    Array.isArray(data.value)
                        ? data.value
                        : [];

                this.getView().setModel(
                    new JSONModel(records),
                    "assetChart"
                );
            },

            _loadArchiveReasonChart:
                async function () {

                    const response = await fetch(
                        "/odata/v4/asset-management/" +
                        "GetArchiveReasonChart()"
                    );

                    if (!response.ok) {
                        throw new Error(
                            "Unable to load archive reason chart"
                        );
                    }

                    const data =
                        await response.json();

                    const records =
                        Array.isArray(data.value)
                            ? data.value
                            : [];

                    this.getView().setModel(
                        new JSONModel(records),
                        "archiveChart"
                    );
                },

            _downloadBinaryReport: async function (
                endpoint,
                fileName,
                mimeType
            ) {
                const response =
                    await fetch(endpoint);

                if (!response.ok) {
                    throw new Error(
                        `Export request failed: ${endpoint}`
                    );
                }

                const result =
                    await response.json();

                const binaryValue =
                    result.value;

                let byteArray;

                if (
                    binaryValue &&
                    binaryValue.type === "Buffer" &&
                    Array.isArray(binaryValue.data)
                ) {
                    byteArray =
                        new Uint8Array(
                            binaryValue.data
                        );
                } else if (
                    typeof binaryValue === "string"
                ) {
                    const binaryString =
                        atob(binaryValue);

                    byteArray =
                        new Uint8Array(
                            binaryString.length
                        );

                    for (
                        let index = 0;
                        index < binaryString.length;
                        index++
                    ) {
                        byteArray[index] =
                            binaryString.charCodeAt(
                                index
                            );
                    }
                } else {
                    throw new Error(
                        "Unsupported export response format"
                    );
                }

                const blob = new Blob(
                    [byteArray],
                    {
                        type: mimeType
                    }
                );

                const downloadUrl =
                    URL.createObjectURL(blob);

                const downloadLink =
                    document.createElement("a");

                downloadLink.href =
                    downloadUrl;

                downloadLink.download =
                    fileName;

                document.body.appendChild(
                    downloadLink
                );

                downloadLink.click();

                document.body.removeChild(
                    downloadLink
                );

                URL.revokeObjectURL(
                    downloadUrl
                );
            },

            onExportPdf: async function () {
                try {
                    await this._downloadBinaryReport(
                        "/odata/v4/asset-management/" +
                        "ExportAssetReportPDF()",
                        "AssetReport.pdf",
                        "application/pdf"
                    );

                    MessageToast.show(
                        "PDF report downloaded"
                    );
                } catch (error) {
                    console.error(
                        "PDF export failed:",
                        error
                    );

                    MessageToast.show(
                        "Unable to download PDF report"
                    );
                }
            },

            onExportExcel: async function () {
                try {
                    await this._downloadBinaryReport(
                        "/odata/v4/asset-management/" +
                        "ExportAssetReportExcel()",
                        "AssetReport.xlsx",
                        "application/vnd.openxmlformats-" +
                        "officedocument.spreadsheetml.sheet"
                    );

                    MessageToast.show(
                        "Excel report downloaded"
                    );
                } catch (error) {
                    console.error(
                        "Excel export failed:",
                        error
                    );

                    MessageToast.show(
                        "Unable to download Excel report"
                    );
                }
            },

            onAddEmployee: async function () {
                const view =
                    this.getView();

                if (!this._createEmployeeDialog) {
                    this._createEmployeeDialog =
                        await Fragment.load({
                            id: view.getId(),

                            name:
                                "project1.ext.fragments." +
                                "CreateEmployeeDialog",

                            controller: this
                        });

                    view.addDependent(
                        this._createEmployeeDialog
                    );

                    const cancelButton =
                        Fragment.byId(
                            view.getId(),
                            "cancelCreateEmployeeButton"
                        );

                    cancelButton.attachPress(
                        function () {
                            const fullNameInput =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeeNameInput"
                                );

                            const emailInput =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeeEmailInput"
                                );

                            const phoneInput =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeePhoneInput"
                                );

                            const locationInput =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeeLocationInput"
                                );

                            fullNameInput.setValue("");
                            emailInput.setValue("");
                            phoneInput.setValue("");
                            locationInput.setValue("");

                            fullNameInput.setValueState(
                                "None"
                            );

                            emailInput.setValueState(
                                "None"
                            );

                            locationInput.setValueState(
                                "None"
                            );

                            this._createEmployeeDialog.close();
                        }.bind(this)
                    );

                    const saveButton =
                        Fragment.byId(
                            view.getId(),
                            "saveEmployeeButton"
                        );

                    saveButton.attachPress(
                        async function () {
                            const fullNameInput =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeeNameInput"
                                );

                            const emailInput =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeeEmailInput"
                                );

                            const phoneInput =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeePhoneInput"
                                );

                            const departmentSelect =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeeDepartmentSelect"
                                );

                            const locationInput =
                                Fragment.byId(
                                    view.getId(),
                                    "createEmployeeLocationInput"
                                );

                            const fullName =
                                fullNameInput
                                    .getValue()
                                    .trim();

                            const email =
                                emailInput
                                    .getValue()
                                    .trim();

                            const phone =
                                phoneInput
                                    .getValue()
                                    .trim();

                            const departmentID =
                                departmentSelect
                                    .getSelectedKey();

                            const location =
                                locationInput
                                    .getValue()
                                    .trim();

                            fullNameInput.setValueState(
                                fullName
                                    ? "None"
                                    : "Error"
                            );

                            emailInput.setValueState(
                                email
                                    ? "None"
                                    : "Error"
                            );

                            locationInput.setValueState(
                                location
                                    ? "None"
                                    : "Error"
                            );

                            if (
                                !fullName ||
                                !email ||
                                !departmentID ||
                                !location
                            ) {
                                MessageToast.show(
                                    "Complete all required fields"
                                );

                                return;
                            }

                            saveButton.setEnabled(
                                false
                            );

                            try {
                                const response =
                                    await fetch(
                                        "/odata/v4/" +
                                        "asset-management/" +
                                        "CreateEmployee",
                                        {
                                            method: "POST",

                                            headers: {
                                                "Content-Type":
                                                    "application/json",

                                                "Accept":
                                                    "application/json"
                                            },

                                            credentials:
                                                "include",

                                            body:
                                                JSON.stringify({
                                                    fullName:
                                                        fullName,

                                                    email:
                                                        email,

                                                    phone:
                                                        phone ||
                                                        null,

                                                    departmentID:
                                                        departmentID,

                                                    location:
                                                        location
                                                })
                                        }
                                    );

                                if (!response.ok) {
                                    const errorText =
                                        await response.text();

                                    let errorMessage =
                                        "Unable to create employee";

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
                                                errorResult
                                                    .error
                                                    .message;
                                        }
                                    } catch (
                                        parseError
                                    ) {
                                        if (errorText) {
                                            errorMessage =
                                                errorText;
                                        }
                                    }

                                    throw new Error(
                                        errorMessage
                                    );
                                }

                                await response.json();

                                fullNameInput.setValue("");
                                emailInput.setValue("");
                                phoneInput.setValue("");
                                locationInput.setValue("");

                                fullNameInput.setValueState(
                                    "None"
                                );

                                emailInput.setValueState(
                                    "None"
                                );

                                locationInput.setValueState(
                                    "None"
                                );

                                this._createEmployeeDialog.close();

                                MessageToast.show(
                                    fullName +
                                    " created successfully"
                                );
                            } catch (error) {
                                console.error(
                                    "Employee creation failed:",
                                    error
                                );

                                MessageToast.show(
                                    error.message ||
                                    "Unable to create employee"
                                );
                            } finally {
                                saveButton.setEnabled(
                                    true
                                );
                            }
                        }.bind(this)
                    );
                }

                this._createEmployeeDialog.open();
            },

            onAddVendor: async function () {
                const view =
                    this.getView();

                if (!this._createVendorDialog) {
                    this._createVendorDialog =
                        await Fragment.load({
                            id: view.getId(),

                            name:
                                "project1.ext.fragments." +
                                "CreateVendorDialog",

                            controller: this
                        });

                    view.addDependent(
                        this._createVendorDialog
                    );

                    const nameInput =
                        Fragment.byId(
                            view.getId(),
                            "createVendorNameInput"
                        );

                    const emailInput =
                        Fragment.byId(
                            view.getId(),
                            "createVendorEmailInput"
                        );

                    const saveButton =
                        Fragment.byId(
                            view.getId(),
                            "saveVendorButton"
                        );

                    const cancelButton =
                        Fragment.byId(
                            view.getId(),
                            "cancelCreateVendorButton"
                        );

                    cancelButton.attachPress(
                        function () {
                            nameInput.setValue("");
                            emailInput.setValue("");

                            nameInput.setValueState(
                                "None"
                            );

                            emailInput.setValueState(
                                "None"
                            );

                            this._createVendorDialog.close();
                        }.bind(this)
                    );

                    saveButton.attachPress(
                        async function () {
                            const vendorName =
                                nameInput
                                    .getValue()
                                    .trim();

                            const vendorEmail =
                                emailInput
                                    .getValue()
                                    .trim();

                            nameInput.setValueState(
                                vendorName
                                    ? "None"
                                    : "Error"
                            );

                            emailInput.setValueState(
                                vendorEmail
                                    ? "None"
                                    : "Error"
                            );

                            if (
                                !vendorName ||
                                !vendorEmail
                            ) {
                                MessageToast.show(
                                    "Complete all required fields"
                                );

                                return;
                            }

                            const emailPattern =
                                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                            if (
                                !emailPattern.test(
                                    vendorEmail
                                )
                            ) {
                                emailInput.setValueState(
                                    "Error"
                                );

                                MessageToast.show(
                                    "Enter a valid vendor email address"
                                );

                                return;
                            }

                            saveButton.setEnabled(
                                false
                            );

                            try {
                                const response =
                                    await fetch(
                                        "/odata/v4/" +
                                        "asset-management/" +
                                        "CreateVendor",
                                        {
                                            method: "POST",

                                            headers: {
                                                "Content-Type":
                                                    "application/json",

                                                "Accept":
                                                    "application/json"
                                            },

                                            credentials:
                                                "include",

                                            body:
                                                JSON.stringify({
                                                    name:
                                                        vendorName,

                                                    email:
                                                        vendorEmail
                                                })
                                        }
                                    );

                                if (!response.ok) {
                                    const errorText =
                                        await response.text();

                                    let errorMessage =
                                        "Unable to create vendor";

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
                                                errorResult
                                                    .error
                                                    .message;
                                        }
                                    } catch (
                                        parseError
                                    ) {
                                        if (errorText) {
                                            errorMessage =
                                                errorText;
                                        }
                                    }

                                    throw new Error(
                                        errorMessage
                                    );
                                }

                                await response.json();

                                nameInput.setValue("");
                                emailInput.setValue("");

                                nameInput.setValueState(
                                    "None"
                                );

                                emailInput.setValueState(
                                    "None"
                                );

                                this._createVendorDialog.close();

                                MessageToast.show(
                                    vendorName +
                                    " created successfully"
                                );
                            } catch (error) {
                                console.error(
                                    "Vendor creation failed:",
                                    error
                                );

                                MessageToast.show(
                                    error.message ||
                                    "Unable to create vendor"
                                );
                            } finally {
                                saveButton.setEnabled(
                                    true
                                );
                            }
                        }.bind(this)
                    );
                }

                this._createVendorDialog.open();
            },

            onAddDepartment: async function () {
    const view =
        this.getView();

    if (!this._createDepartmentDialog) {
        this._createDepartmentDialog =
            await Fragment.load({
                id: view.getId(),

                name:
                    "project1.ext.fragments." +
                    "CreateDepartmentDialog",

                controller: this
            });

        view.addDependent(
            this._createDepartmentDialog
        );

        const nameInput =
            Fragment.byId(
                view.getId(),
                "createDepartmentNameInput"
            );

        const costCenterInput =
            Fragment.byId(
                view.getId(),
                "createDepartmentCostCenterInput"
            );

        const saveButton =
            Fragment.byId(
                view.getId(),
                "saveDepartmentButton"
            );

        const cancelButton =
            Fragment.byId(
                view.getId(),
                "cancelCreateDepartmentButton"
            );

        cancelButton.attachPress(
            function () {
                nameInput.setValue("");
                costCenterInput.setValue("");

                nameInput.setValueState(
                    "None"
                );

                costCenterInput.setValueState(
                    "None"
                );

                this._createDepartmentDialog.close();
            }.bind(this)
        );

        saveButton.attachPress(
            async function () {
                const departmentName =
                    nameInput
                        .getValue()
                        .trim();

                const costCenter =
                    costCenterInput
                        .getValue()
                        .trim()
                        .toUpperCase();

                nameInput.setValueState(
                    departmentName
                        ? "None"
                        : "Error"
                );

                costCenterInput.setValueState(
                    costCenter
                        ? "None"
                        : "Error"
                );

                if (
                    !departmentName ||
                    !costCenter
                ) {
                    MessageToast.show(
                        "Complete all required fields"
                    );

                    return;
                }

                saveButton.setEnabled(false);

                try {
                    const response =
                        await fetch(
                            "/odata/v4/" +
                            "asset-management/" +
                            "CreateDepartment",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    "Accept":
                                        "application/json"
                                },

                                credentials:
                                    "include",

                                body:
                                    JSON.stringify({
                                        name:
                                            departmentName,

                                        costCenter:
                                            costCenter
                                    })
                            }
                        );

                    if (!response.ok) {
                        const errorText =
                            await response.text();

                        let errorMessage =
                            "Unable to create department";

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
                                    errorResult
                                        .error
                                        .message;
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

                    await response.json();

                    nameInput.setValue("");
                    costCenterInput.setValue("");

                    nameInput.setValueState(
                        "None"
                    );

                    costCenterInput.setValueState(
                        "None"
                    );

                    this._createDepartmentDialog.close();

                    MessageToast.show(
                        departmentName +
                        " created successfully"
                    );
                } catch (error) {
                    console.error(
                        "Department creation failed:",
                        error
                    );

                    MessageToast.show(
                        error.message ||
                        "Unable to create department"
                    );
                } finally {
                    saveButton.setEnabled(true);
                }
            }.bind(this)
        );
    }

    this._createDepartmentDialog.open();
},
            onTotalAssetsPress: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "AssetsList",
                        {
                            "?query": {
                                sourceRole: "admin"
                            }
                        }
                    );
            },

            onAvailableAssetsPress: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "AssetsList",
                        {
                            "?query": {
                                statusFilter:
                                    "AVAILABLE",

                                sourceRole:
                                    "admin"
                            }
                        }
                    );
            },

            onAssignedAssetsPress: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "AssetsList",
                        {
                            "?query": {
                                statusFilter:
                                    "ASSIGNED",

                                sourceRole:
                                    "admin"
                            }
                        }
                    );
            },

            onMaintenanceAssetsPress: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "AssetsList",
                        {
                            "?query": {
                                statusFilter:
                                    "MAINTENANCE",

                                sourceRole:
                                    "admin"
                            }
                        }
                    );
            },

            onRetiredAssetsPress: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "AssetsList",
                        {
                            "?query": {
                                statusFilter:
                                    "RETIRED",

                                sourceRole:
                                    "admin"
                            }
                        }
                    );
            },

            onArchivedAssetsPress: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "AssetsList",
                        {
                            "?query": {
                                statusFilter:
                                    "ARCHIVED",

                                sourceRole:
                                    "admin"
                            }
                        }
                    );
            },

            onExpiringWarrantiesPress:
                function () {

                    this.getOwnerComponent()
                        .getRouter()
                        .navTo(
                            "AssetsList",
                            {
                                "?query": {
                                    warrantyFilter:
                                        "expiring",

                                    sourceRole:
                                        "admin"
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