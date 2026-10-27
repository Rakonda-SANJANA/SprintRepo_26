sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend(
        "project1.ext.dashboard.ManagerDashboard",
        {
            onInit: async function () {
                try {
                    await Promise.all([
                        this._loadManagerDashboard(),
                        this._loadAssignmentStatusChart()
                    ]);
                } catch (error) {
                    console.error(
                        "Manager dashboard loading failed:",
                        error
                    );

                    MessageToast.show(
                        "Unable to load Manager Dashboard"
                    );
                }
            },

            _fetchAsManager: async function (endpoint) {
    const response = await fetch(
        endpoint,
        {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            credentials: "include"
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
            _loadManagerDashboard: async function () {
                const data =
                    await this._fetchAsManager(
                        "/odata/v4/asset-management/" +
                        "GetManagerDashboard()"
                    );

                this.getView().setModel(
                    new JSONModel(data),
                    "manager"
                );
            },

            _loadAssignmentStatusChart:
                async function () {

                    const data =
                        await this._fetchAsManager(
                            "/odata/v4/asset-management/" +
                            "GetAssignmentChart()"
                        );

                    const records =
                        Array.isArray(data.value)
                            ? data.value
                            : [];

                    this.getView().setModel(
                        new JSONModel(records),
                        "assignmentChart"
                    );
                },

                onTotalTransfersPress: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo(
            "Reports",
            {
                "?query": {
                    reportTab: "transfers",
                    sourceRole: "manager"
                }
            }
        );
},

            onReturnedAssignmentsPress: function () {
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
                                    "manager"
                            }
                        }
                    );
            },

            onActiveAssignmentsPress: function () {
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
                                    "manager"
                            }
                        }
                    );
            },

            onTotalAssignmentsPress: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "Reports",
                        {
                            "?query": {
                                reportTab:
                                    "assignments",
                                sourceRole:
                                    "manager"
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