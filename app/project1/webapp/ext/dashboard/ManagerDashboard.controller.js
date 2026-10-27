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

            _fetchAsManager:
                async function (endpoint) {
                    const response =
                        await fetch(
                            endpoint,
                            {
                                method: "GET",

                                headers: {
                                    "Accept":
                                        "application/json"
                                },

                                credentials:
                                    "include"
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

            _getErrorMessage:
                async function (
                    response,
                    defaultMessage
                ) {
                    const errorText =
                        await response.text();

                    if (!errorText) {
                        return defaultMessage;
                    }

                    try {
                        const errorResult =
                            JSON.parse(errorText);

                        if (
                            errorResult.error &&
                            errorResult.error.message
                        ) {
                            if (
                                typeof
                                    errorResult.error
                                        .message ===
                                "string"
                            ) {
                                return errorResult
                                    .error
                                    .message;
                            }

                            return (
                                errorResult.error
                                    .message.value ||
                                defaultMessage
                            );
                        }
                    } catch (parseError) {
                        return errorText;
                    }

                    return defaultMessage;
                },

            _loadManagerDashboard:
                async function () {
                    const data =
                        await this._fetchAsManager(
                            "/odata/v4/" +
                            "asset-management/" +
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
                            "/odata/v4/" +
                            "asset-management/" +
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

            _loadManagerAssetRequests:
                async function () {
                    const data =
                        await this._fetchAsManager(
                            "/odata/v4/" +
                            "asset-management/" +
                            "GetManagerAssetRequests()"
                        );

                    const requests =
                        Array.isArray(data.value)
                            ? data.value
                            : [];

                    this.getView().setModel(
                        new JSONModel(requests),
                        "managerAssetRequests"
                    );

                    return requests;
                },

            _resetAssetRequestSelection:
                function () {
                    const view =
                        this.getView();

                    const approveButton =
                        Fragment.byId(
                            view.getId(),
                            "approveAssetRequestButton"
                        );

                    const rejectButton =
                        Fragment.byId(
                            view.getId(),
                            "rejectAssetRequestButton"
                        );

                    const remarksInput =
                        Fragment.byId(
                            view.getId(),
                            "assetRequestRemarksInput"
                        );

                    if (approveButton) {
                        approveButton.setEnabled(
                            false
                        );
                    }

                    if (rejectButton) {
                        rejectButton.setEnabled(
                            false
                        );
                    }

                    if (remarksInput) {
                        remarksInput.setValue("");
                        remarksInput.setValueState(
                            "None"
                        );
                    }

                    this._selectedAssetRequest =
                        null;
                },

            _reviewSelectedAssetRequest:
                async function (decision) {
                    const selectedRequest =
                        this._selectedAssetRequest;

                    if (!selectedRequest) {
                        MessageToast.show(
                            "Select an asset request first"
                        );

                        return;
                    }

                    if (
                        selectedRequest.status !==
                        "PENDING"
                    ) {
                        MessageToast.show(
                            "Only pending requests can be reviewed"
                        );

                        return;
                    }

                    const view =
                        this.getView();

                    const remarksInput =
                        Fragment.byId(
                            view.getId(),
                            "assetRequestRemarksInput"
                        );

                    const approveButton =
                        Fragment.byId(
                            view.getId(),
                            "approveAssetRequestButton"
                        );

                    const rejectButton =
                        Fragment.byId(
                            view.getId(),
                            "rejectAssetRequestButton"
                        );

                    const managerRemarks =
                        remarksInput
                            .getValue()
                            .trim();

                    if (
                        decision === "REJECTED" &&
                        !managerRemarks
                    ) {
                        remarksInput.setValueState(
                            "Error"
                        );

                        MessageToast.show(
                            "Manager remarks are required when rejecting"
                        );

                        return;
                    }

                    remarksInput.setValueState(
                        "None"
                    );

                    approveButton.setEnabled(
                        false
                    );

                    rejectButton.setEnabled(
                        false
                    );

                    try {
                        const response =
                            await fetch(
                                "/odata/v4/" +
                                "asset-management/" +
                                "ReviewAssetRequest",
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
                                            requestID:
                                                selectedRequest.ID,

                                            decision:
                                                decision,

                                            managerRemarks:
                                                managerRemarks ||
                                                null
                                        })
                                }
                            );

                        if (!response.ok) {
                            const errorMessage =
                                await this
                                    ._getErrorMessage(
                                        response,
                                        "Unable to review asset request"
                                    );

                            throw new Error(
                                errorMessage
                            );
                        }

                        const result =
                            await response.json();

                        await this
                            ._loadManagerAssetRequests();

                        this
                            ._resetAssetRequestSelection();

                        MessageToast.show(
                            result.message ||
                            (
                                decision ===
                                "APPROVED"
                                    ? "Asset request approved successfully"
                                    : "Asset request rejected successfully"
                            )
                        );
                    } catch (error) {
                        console.error(
                            "Asset request review failed:",
                            error
                        );

                        MessageToast.show(
                            error.message ||
                            "Unable to review asset request"
                        );

                        approveButton.setEnabled(
                            true
                        );

                        rejectButton.setEnabled(
                            true
                        );
                    }
                },

            onReviewAssetRequests:
                async function () {
                    const view =
                        this.getView();

                    try {
                        await this
                            ._loadManagerAssetRequests();

                        if (
                            !this
                                ._reviewAssetRequestsDialog
                        ) {
                            this._reviewAssetRequestsDialog =
                                await Fragment.load({
                                    id:
                                        view.getId(),

                                    name:
                                        "project1.ext." +
                                        "fragments." +
                                        "ReviewAssetRequestsDialog",

                                    controller:
                                        this
                                });

                            view.addDependent(
                                this
                                    ._reviewAssetRequestsDialog
                            );

                            const closeButton =
                                Fragment.byId(
                                    view.getId(),
                                    "closeAssetRequestsButton"
                                );

                            const approveButton =
                                Fragment.byId(
                                    view.getId(),
                                    "approveAssetRequestButton"
                                );

                            const rejectButton =
                                Fragment.byId(
                                    view.getId(),
                                    "rejectAssetRequestButton"
                                );

                            closeButton.attachPress(
                                function () {
                                    this
                                        ._resetAssetRequestSelection();

                                    this
                                        ._reviewAssetRequestsDialog
                                        .close();
                                }.bind(this)
                            );

                            approveButton.attachPress(
                                function () {
                                    this
                                        ._reviewSelectedAssetRequest(
                                            "APPROVED"
                                        );
                                }.bind(this)
                            );

                            rejectButton.attachPress(
                                function () {
                                    this
                                        ._reviewSelectedAssetRequest(
                                            "REJECTED"
                                        );
                                }.bind(this)
                            );
                        }

                        this
                            ._resetAssetRequestSelection();

                        this
                            ._reviewAssetRequestsDialog
                            .open();
                    } catch (error) {
                        console.error(
                            "Unable to load asset requests:",
                            error
                        );

                        MessageToast.show(
                            "Unable to load asset requests"
                        );
                    }
                },

            onSelectAssetRequest:
                function (event) {
                    const selectedItem =
                        event.getSource();

                    const bindingContext =
                        selectedItem
                            .getBindingContext(
                                "managerAssetRequests"
                            );

                    if (!bindingContext) {
                        MessageToast.show(
                            "Unable to select asset request"
                        );

                        return;
                    }

                    const selectedRequest =
                        bindingContext.getObject();

                    this._selectedAssetRequest =
                        selectedRequest;

                    const view =
                        this.getView();

                    const approveButton =
                        Fragment.byId(
                            view.getId(),
                            "approveAssetRequestButton"
                        );

                    const rejectButton =
                        Fragment.byId(
                            view.getId(),
                            "rejectAssetRequestButton"
                        );

                    const remarksInput =
                        Fragment.byId(
                            view.getId(),
                            "assetRequestRemarksInput"
                        );

                    const isPending =
                        selectedRequest.status ===
                        "PENDING";

                    approveButton.setEnabled(
                        isPending
                    );

                    rejectButton.setEnabled(
                        isPending
                    );

                    remarksInput.setValue(
                        selectedRequest
                            .managerRemarks || ""
                    );

                    remarksInput.setValueState(
                        "None"
                    );

                    if (isPending) {
                        MessageToast.show(
                            "Selected request from " +
                            selectedRequest
                                .employeeName
                        );
                    } else {
                        MessageToast.show(
                            "This request has already been reviewed"
                        );
                    }
                },

            formatAssetRequestStatus:
                function (status) {
                    switch (status) {
                        case "PENDING":
                            return "Warning";

                        case "APPROVED":
                            return "Success";

                        case "REJECTED":
                            return "Error";

                        case "FULFILLED":
                            return "Information";

                        default:
                            return "None";
                    }
                },

            onTotalTransfersPress:
                function () {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo(
                            "Reports",
                            {
                                "?query": {
                                    reportTab:
                                        "transfers",

                                    sourceRole:
                                        "manager"
                                }
                            }
                        );
                },

            onReturnedAssignmentsPress:
                function () {
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

            onActiveAssignmentsPress:
                function () {
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

            onTotalAssignmentsPress:
                function () {
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