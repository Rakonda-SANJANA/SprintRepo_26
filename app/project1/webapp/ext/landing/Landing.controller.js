sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend(
        "project1.ext.landing.Landing",
        {
            onOpenAdminDashboard: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("AdminDashboard");
            },

            onOpenManagerDashboard: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("ManagerDashboard");
            },

            onOpenEmployeeDashboard: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("EmployeeDashboard");
            }
        }
    );
});