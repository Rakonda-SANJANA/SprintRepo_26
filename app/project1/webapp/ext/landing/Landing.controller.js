sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (
    Controller,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "project1.ext.landing.Landing",
        {
            _selectRoleAndNavigate:
                async function (
                    selectedRole,
                    routeName
                ) {
                    document.cookie =
                        "assetManagementRole=" +
                        encodeURIComponent(
                            selectedRole
                        ) +
                        "; path=/; SameSite=Lax";

                    const component =
                        this.getOwnerComponent();

                    try {
                        if (
                            typeof component
                                ._loadCurrentUser ===
                            "function"
                        ) {
                            await component
                                ._loadCurrentUser();
                        }

                        component
                            .getRouter()
                            .navTo(routeName);
                    } catch (error) {
                        console.error(
                            "Role selection failed:",
                            error
                        );

                        MessageToast.show(
                            "Unable to switch role"
                        );
                    }
                },

            onOpenAdminDashboard:
                function () {
                    return this
                        ._selectRoleAndNavigate(
                            "admin",
                            "AdminDashboard"
                        );
                },

            onOpenManagerDashboard:
                function () {
                    return this
                        ._selectRoleAndNavigate(
                            "manager",
                            "ManagerDashboard"
                        );
                },

            onOpenEmployeeDashboard:
                function () {
                    return this
                        ._selectRoleAndNavigate(
                            "employee",
                            "EmployeeDashboard"
                        );
                }
        }
    );
});