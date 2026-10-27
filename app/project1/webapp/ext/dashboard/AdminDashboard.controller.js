sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
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

                const data = await response.json();

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

                const data = await response.json();

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

                    const data = await response.json();

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
                const response = await fetch(endpoint);

                if (!response.ok) {
                    throw new Error(
                        `Export request failed: ${endpoint}`
                    );
                }

                const result = await response.json();
                const binaryValue = result.value;

                let byteArray;

                if (
                    binaryValue &&
                    binaryValue.type === "Buffer" &&
                    Array.isArray(binaryValue.data)
                ) {
                    byteArray = new Uint8Array(
                        binaryValue.data
                    );
                } else if (
                    typeof binaryValue === "string"
                ) {
                    const binaryString =
                        atob(binaryValue);

                    byteArray = new Uint8Array(
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

                downloadLink.href = downloadUrl;
                downloadLink.download = fileName;

                document.body.appendChild(
                    downloadLink
                );

                downloadLink.click();

                document.body.removeChild(
                    downloadLink
                );

                URL.revokeObjectURL(downloadUrl);
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