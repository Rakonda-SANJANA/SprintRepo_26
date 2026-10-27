sap.ui.define([], function () {
    "use strict";

    function getRouter(controller) {
        return controller
            .getEditFlow()
            .getView()
            .getController()
            .getOwnerComponent()
            .getRouter();
    }

    function getQueryParameters() {
        const hash = window.location.hash || "";
        const queryIndex = hash.indexOf("?");

        if (queryIndex === -1) {
            return {};
        }

        const queryString = hash.substring(queryIndex + 1);
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

    return {
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
});