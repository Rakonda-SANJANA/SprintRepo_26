sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
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

            
            _fetchAsEmployee: async function (endpoint) {
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

            _loadEmployeeDashboard: async function () {
                const data =
                    await this._fetchAsEmployee(
                        "/odata/v4/asset-management/" +
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
                            "/odata/v4/asset-management/" +
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

            onReturnedAssetsPress: function () {
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
onAssignedAssetsPress: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo(
            "Reports",
            {
                "?query": {
                    reportTab: "assignments",
                    assignmentStatus: "ASSIGNED",
                    sourceRole: "employee"
                }
            }
        );
},

onMaintenanceRequestsPress: function () {
    this.getOwnerComponent()
        .getRouter()
        .navTo(
            "Reports",
            {
                "?query": {
                    reportTab: "maintenance",
                    maintenanceStatus: "OPEN",
                    sourceRole: "employee"
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