sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend(
        "project1.ext.reports.Reports",
        {
            onInit: async function () {
                this._hashChangeHandler =
                    this._onHashChange.bind(this);

                window.addEventListener(
                    "hashchange",
                    this._hashChangeHandler
                );

                try {
                    await Promise.all([
                        this._loadAssetReport(),
                        this._loadAssignmentReport(),
                        this._loadTransferReport(),
                        this._loadMaintenanceReport(),
                        this._loadArchiveReport()
                    ]);

                    this._selectReportTabFromURL();
                    this._applyAssignmentStatusFilter();
                    this._applyMaintenanceStatusFilter();
                } catch (error) {
                    console.error(
                        "Reports loading failed:",
                        error
                    );

                    MessageToast.show(
                        "Unable to load reports"
                    );
                }
            },

            onExit: function () {
                if (this._hashChangeHandler) {
                    window.removeEventListener(
                        "hashchange",
                        this._hashChangeHandler
                    );
                }
            },

            _onHashChange: function () {
                const hash = window.location.hash;

                if (!hash.startsWith("#/reports")) {
                    return;
                }

                setTimeout(
                    async function () {
                        try {
                            await Promise.all([
                                this._loadAssignmentReport(),
                                this._loadTransferReport(),
                                this._loadMaintenanceReport(),
    this._loadArchiveReport()
                            ]);

                            this._selectReportTabFromURL();
                            this._applyAssignmentStatusFilter();
                            this._applyMaintenanceStatusFilter();
                        } catch (error) {
                            console.error(
                                "Report reload failed:",
                                error
                            );

                            MessageToast.show(
                                "Unable to reload report"
                            );
                        }
                    }.bind(this),
                    100
                );
            },

            _getQueryParameter: function (
                parameterName
            ) {
                const hash = window.location.hash;

                const queryString =
                    hash.includes("?")
                        ? hash.split("?")[1]
                        : "";

                const queryParameters =
                    new URLSearchParams(queryString);

                return queryParameters.get(
                    parameterName
                );
            },

            _selectReportTabFromURL: function () {
                const reportTab =
                    this._getQueryParameter(
                        "reportTab"
                    );

                const validTabs = [
                    "assets",
                    "assignments",
                    "transfers",
                    "maintenance",
                    "archive"
                ];

                if (!validTabs.includes(reportTab)) {
                    return;
                }

                const iconTabBar =
                    this.byId("reportsIconTabBar");

                if (iconTabBar) {
                    iconTabBar.setSelectedKey(
                        reportTab
                    );
                }
            },

            _fetchReport: async function (
    endpoint,
    sourceRole
) {
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

    const result =
        await response.json();

    return result.value || [];
},
            _loadAssetReport: async function () {
                const sourceRole =
                    this._getQueryParameter(
                        "sourceRole"
                    );

                const records =
                    await this._fetchReport(
                        "/odata/v4/asset-management/" +
                        "GetAssetReport()",
                        sourceRole
                    );

                this.getView().setModel(
                    new JSONModel(records),
                    "assetReport"
                );
            },

            _loadAssignmentReport:
                async function () {

                    const sourceRole =
                        this._getQueryParameter(
                            "sourceRole"
                        );

                    const records =
                        await this._fetchReport(
                            "/odata/v4/asset-management/" +
                            "GetAssignmentReport()",
                            sourceRole
                        );

                    this._allAssignmentRecords =
                        records;

                    this._applyAssignmentStatusFilter();
                },

            _loadTransferReport:
                async function () {

                    const sourceRole =
                        this._getQueryParameter(
                            "sourceRole"
                        );

                    /*
                     * Transfer Report is only available
                     * to Admin and Manager.
                     */
                    if (sourceRole === "employee") {
                        this.getView().setModel(
                            new JSONModel([]),
                            "transferReport"
                        );

                        return;
                    }

                    const records =
                        await this._fetchReport(
                            "/odata/v4/asset-management/" +
                            "GetTransferReport()",
                            sourceRole
                        );

                    this.getView().setModel(
                        new JSONModel(records),
                        "transferReport"
                    );
                },

            _loadMaintenanceReport:
                async function () {

                    const sourceRole =
                        this._getQueryParameter(
                            "sourceRole"
                        );

                    const records =
                        await this._fetchReport(
                            "/odata/v4/asset-management/" +
                            "GetMaintenanceReport()",
                            sourceRole
                        );

                    this._allMaintenanceRecords =
                        records;

                    this._applyMaintenanceStatusFilter();
                },

            _loadArchiveReport: async function () {
                const sourceRole =
                    this._getQueryParameter(
                        "sourceRole"
                    );

                /*
                 * Archive Report is Admin-only.
                 */
                if (
                    sourceRole === "manager" ||
                    sourceRole === "employee"
                ) {
                    this.getView().setModel(
                        new JSONModel([]),
                        "archiveReport"
                    );

                    return;
                }

                const records =
                    await this._fetchReport(
                        "/odata/v4/asset-management/" +
                        "GetArchiveReport()",
                        sourceRole
                    );

                this.getView().setModel(
                    new JSONModel(records),
                    "archiveReport"
                );
            },

            _applyAssignmentStatusFilter:
                function () {

                    const records =
                        this._allAssignmentRecords || [];

                    const assignmentStatus =
                        this._getQueryParameter(
                            "assignmentStatus"
                        );

                    const filteredRecords =
                        assignmentStatus
                            ? records.filter(
                                function (record) {
                                    return (
                                        record
                                            .assignmentStatus ===
                                        assignmentStatus
                                    );
                                }
                            )
                            : records;

                    this.getView().setModel(
                        new JSONModel(
                            filteredRecords
                        ),
                        "assignmentReport"
                    );
                },

            _applyMaintenanceStatusFilter:
                function () {

                    const records =
                        this._allMaintenanceRecords || [];

                    const maintenanceStatus =
                        this._getQueryParameter(
                            "maintenanceStatus"
                        );

                    const filteredRecords =
                        maintenanceStatus
                            ? records.filter(
                                function (record) {
                                    return (
                                        record.status ===
                                        maintenanceStatus
                                    );
                                }
                            )
                            : records;

                    this.getView().setModel(
                        new JSONModel(
                            filteredRecords
                        ),
                        "maintenanceReport"
                    );
                },

            onRefreshReports: async function () {
                try {
                    await Promise.all([
                        this._loadAssetReport(),
                        this._loadAssignmentReport(),
                        this._loadTransferReport(),
                        this._loadMaintenanceReport(),
                        this._loadArchiveReport()
                    ]);

                    this._selectReportTabFromURL();
                    this._applyAssignmentStatusFilter();
                    this._applyMaintenanceStatusFilter();

                    MessageToast.show(
                        "Reports refreshed"
                    );
                } catch (error) {
                    console.error(
                        "Report refresh failed:",
                        error
                    );

                    MessageToast.show(
                        "Unable to refresh reports"
                    );
                }
            },

            formatEmptyValue: function (value) {
                return value || "-";
            },

            formatDate: function (value) {
                if (!value) {
                    return "-";
                }

                const date = new Date(value);

                if (Number.isNaN(date.getTime())) {
                    return value;
                }

                return new Intl.DateTimeFormat(
                    "en-IN",
                    {
                        dateStyle: "medium",
                        timeZone: "UTC"
                    }
                ).format(date);
            },

            formatDateTime: function (value) {
                if (!value) {
                    return "-";
                }

                const date = new Date(value);

                if (Number.isNaN(date.getTime())) {
                    return value;
                }

                return new Intl.DateTimeFormat(
                    "en-IN",
                    {
                        dateStyle: "medium",
                        timeStyle: "short"
                    }
                ).format(date);
            },

            formatAssignmentState:
                function (status) {

                    switch (status) {
                        case "ASSIGNED":
                            return "Information";

                        case "RETURNED":
                            return "Success";

                        case "OVERDUE":
                            return "Error";

                        default:
                            return "None";
                    }
                },

            formatMaintenanceState:
                function (status) {

                    switch (status) {
                        case "OPEN":
                            return "Warning";

                        case "IN_PROGRESS":
                            return "Information";

                        case "COMPLETED":
                            return "Success";

                        default:
                            return "None";
                    }
                },

            formatMaintenanceOutcomeState:
                function (outcome) {

                    switch (outcome) {
                        case "RESOLVED":
                            return "Success";

                        case "REPLACED":
                            return "Information";

                        case "FAILED":
                            return "Error";

                        default:
                            return "None";
                    }
                },

            formatAssetState: function (status) {
                switch (status) {
                    case "AVAILABLE":
                        return "Success";

                    case "ASSIGNED":
                        return "Information";

                    case "MAINTENANCE":
                        return "Warning";

                    case "RETIRED":
                        return "None";

                    case "ARCHIVED":
                        return "Error";

                    default:
                        return "None";
                }
            },

            formatArchiveReason: function (reason) {
                if (!reason) {
                    return "-";
                }

                const labels = {
                    END_OF_LIFE: "End of Life",
                    DAMAGED: "Damaged",
                    LOST: "Lost",
                    OBSOLETE: "Obsolete"
                };

                return labels[reason] || reason;
            },

            formatMaintenanceCost: function (cost) {
                if (
                    cost === null ||
                    cost === undefined ||
                    cost === ""
                ) {
                    return "-";
                }

                const numericCost = Number(cost);

                if (Number.isNaN(numericCost)) {
                    return cost;
                }

                return numericCost.toFixed(2);
            },

            formatMaintenanceCostDisplay:
                function (cost) {

                    if (
                        cost === null ||
                        cost === undefined ||
                        cost === ""
                    ) {
                        return "-";
                    }

                    const numericCost = Number(cost);

                    if (Number.isNaN(numericCost)) {
                        return cost;
                    }

                    return (
                        `${numericCost.toFixed(2)} INR`
                    );
                },

            formatWarrantyCoverage:
                function (coveredByWarranty) {

                    return coveredByWarranty
                        ? "Yes"
                        : "No";
                },

            formatWarrantyCoverageState:
                function (coveredByWarranty) {

                    return coveredByWarranty
                        ? "Success"
                        : "None";
                },

            formatDisposalMethod:
                function (method) {

                    if (!method) {
                        return "-";
                    }

                    const labels = {
                        RECYCLE: "Recycle",
                        DESTROY: "Destroy",
                        SELL: "Sell",
                        DONATE: "Donate"
                    };

                    return labels[method] || method;
                },

            onNavBack: function () {
                const sourceRole =
                    this._getQueryParameter(
                        "sourceRole"
                    );

                const router =
                    this.getOwnerComponent()
                        .getRouter();

                if (sourceRole === "admin") {
                    router.navTo(
                        "AdminDashboard"
                    );
                    return;
                }

                if (sourceRole === "manager") {
                    router.navTo(
                        "ManagerDashboard"
                    );
                    return;
                }

                if (sourceRole === "employee") {
                    router.navTo(
                        "EmployeeDashboard"
                    );
                    return;
                }

                router.navTo("AssetsList");
            }
        }
    );
});