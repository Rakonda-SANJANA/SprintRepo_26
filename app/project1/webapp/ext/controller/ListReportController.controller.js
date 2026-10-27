sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
    "use strict";

    function formatDate(date) {
        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    return ControllerExtension.extend(
        "project1.ext.controller.ListReportController",
        {
            override: {
                onInit: function () {
                    this._hashChangeHandler =
                        this._onHashChange.bind(this);

                    window.addEventListener(
                        "hashchange",
                        this._hashChangeHandler
                    );
                },

                onAfterRendering: function () {
                    this._applyURLFilter();
                },

                onExit: function () {
                    if (this._hashChangeHandler) {
                        window.removeEventListener(
                            "hashchange",
                            this._hashChangeHandler
                        );
                    }
                }
            },

            _onHashChange: function () {
                /*
                 * Give the cached List Report time to process
                 * the new hash before changing its filters.
                 */
                setTimeout(
                    function () {
                        this._applyURLFilter();
                    }.bind(this),
                    100
                );
            },

            _applyURLFilter: function () {
                const hash = window.location.hash;

                /*
                 * Do not save or filter the Landing Page,
                 * dashboards, Reports, or an Asset Object Page.
                 */
                if (
                    hash === "" ||
                    hash === "#/" ||
                    hash.includes("admin-dashboard") ||
                    hash.includes("manager-dashboard") ||
                    hash.includes("employee-dashboard") ||
                    hash.includes("reports") ||
                    hash.includes("Assets(")
                ) {
                    return;
                }

                /*
                 * Remember the latest Assets List URL.
                 * This preserves statusFilter, warrantyFilter,
                 * and sourceRole when returning from Object Page.
                 */
                sessionStorage.setItem(
                    "lastAssetsListHash",
                    hash
                );

                const queryString =
                    hash.includes("?")
                        ? hash.split("?")[1]
                        : "";

                const queryParameters =
                    new URLSearchParams(queryString);

                const warrantyFilter =
                    queryParameters.get(
                        "warrantyFilter"
                    );

                const statusFilter =
                    queryParameters.get(
                        "statusFilter"
                    );

                const filterSignature =
                    `${warrantyFilter || ""}|${statusFilter || ""}`;

                if (
                    this._lastFilterSignature ===
                    filterSignature
                ) {
                    return;
                }

                this._lastFilterSignature =
                    filterSignature;

                const extensionAPI =
                    this.base.getExtensionAPI();

                /*
                 * Expiring Warranties drill-down.
                 */
                if (warrantyFilter === "expiring") {
                    extensionAPI.setFilterValues(
                        "status"
                    );

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const warrantyLimitDate =
                        new Date(today);

                    warrantyLimitDate.setDate(
                        warrantyLimitDate.getDate() + 90
                    );

                    extensionAPI.setFilterValues(
                        "warrantyExpiry",
                        "BT",
                        [
                            formatDate(today),
                            formatDate(
                                warrantyLimitDate
                            )
                        ]
                    );

                    extensionAPI.refresh();
                    return;
                }

                /*
                 * Asset-status drill-down.
                 */
                if (statusFilter) {
                    extensionAPI.setFilterValues(
                        "warrantyExpiry"
                    );

                    extensionAPI.setFilterValues(
                        "status",
                        "EQ",
                        statusFilter
                    );

                    extensionAPI.refresh();
                    return;
                }

                /*
                 * Normal unfiltered Assets List.
                 */
                extensionAPI.setFilterValues(
                    "warrantyExpiry"
                );

                extensionAPI.setFilterValues(
                    "status"
                );

                extensionAPI.refresh();
            }
        }
    );
});