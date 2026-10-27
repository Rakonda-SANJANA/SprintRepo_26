sap.ui.define([
    "sap/fe/core/AppComponent",
    "sap/ui/model/json/JSONModel"
], function (AppComponent, JSONModel) {
    "use strict";

    return AppComponent.extend(
        "project1.Component",
        {
            metadata: {
                manifest: "json"
            },

            init: function () {
                AppComponent.prototype.init.apply(
                    this,
                    arguments
                );

                const userModel = new JSONModel({
                    loaded: false,
                    userID: null,
                    role: null,
                    employeeID: null,
                    department: null,
                    isAdmin: false,
                    isManager: false,
                    isEmployee: false
                });

                this.setModel(
                    userModel,
                    "user"
                );

                this._loadCurrentUser();
            },

            _loadCurrentUser: async function () {
                const userModel =
                    this.getModel("user");

                try {
                    const response = await fetch(
                        "/odata/v4/asset-management/" +
                        "GetCurrentUser()",
                        {
                            method: "GET",
                            headers: {
                                "Accept":
                                    "application/json"
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

                    const currentUser =
                        await response.json();

                    const role =
                        currentUser.role || null;

                    userModel.setData({
                        loaded: true,

                        userID:
                            currentUser.userID ||
                            null,

                        role: role,

                        employeeID:
                            currentUser.employeeID ||
                            null,

                        department:
                            currentUser.department ||
                            null,

                        isAdmin:
                            role === "Admin",

                        isManager:
                            role === "Manager",

                        isEmployee:
                            role === "Employee"
                    });
                } catch (error) {
                    console.error(
                        "Unable to load current user:",
                        error
                    );

                    userModel.setData({
                        loaded: true,
                        userID: null,
                        role: null,
                        employeeID: null,
                        department: null,
                        isAdmin: false,
                        isManager: false,
                        isEmployee: false
                    });
                }
            }
        }
    );
});