sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("project1.ext.dashboard.Dashboard", {

        onInit: async function () {

            // Admin Dashboard
            const adminModel = new JSONModel();

            const adminResponse = await fetch(
                "/odata/v4/asset-management/GetAdminDashboard()"
            );

            const adminData = await adminResponse.json();

            adminModel.setData(adminData);

            this.getView().setModel(
                adminModel,
                "dashboard"
            );

            // Manager Dashboard
            const managerModel = new JSONModel();

            const managerResponse = await fetch(
                "/odata/v4/asset-management/GetManagerDashboard()"
            );

            const managerData = await managerResponse.json();

            managerModel.setData(managerData);

            this.getView().setModel(
                managerModel,
                "manager"
            );

            // Employee Dashboard
            const employeeModel = new JSONModel();

            const employeeResponse = await fetch(
                "/odata/v4/asset-management/GetEmployeeDashboard()"
            );

            const employeeData = await employeeResponse.json();

            employeeModel.setData(employeeData);

            this.getView().setModel(
                employeeModel,
                "employee"
            );
            const assetChartModel = new JSONModel();

const assetChartResponse = await fetch(
    "/odata/v4/asset-management/GetAssetStatusChart()"
);

const assetChartData = await assetChartResponse.json();

assetChartModel.setData(assetChartData.value);

this.getView().setModel(
    assetChartModel,
    "assetChart"
);
const assignmentChartModel = new JSONModel();

const assignmentChartResponse = await fetch(
    "/odata/v4/asset-management/GetAssignmentChart()"
);

const assignmentChartData =
    await assignmentChartResponse.json();

assignmentChartModel.setData(
    assignmentChartData.value
);

this.getView().setModel(
    assignmentChartModel,
    "assignmentChart"
);

const maintenanceChartModel = new JSONModel();

const maintenanceChartResponse = await fetch(
    "/odata/v4/asset-management/GetMaintenanceStatusChart()"
);

const maintenanceChartData =
    await maintenanceChartResponse.json();

maintenanceChartModel.setData(
    maintenanceChartData.value
);

this.getView().setModel(
    maintenanceChartModel,
    "maintenanceChart"
);
const archiveChartModel = new JSONModel();

const archiveChartResponse = await fetch(
    "/odata/v4/asset-management/GetArchiveReasonChart()"
);

const archiveChartData =
    await archiveChartResponse.json();

archiveChartModel.setData(
    archiveChartData.value
);

this.getView().setModel(
    archiveChartModel,
    "archiveChart"
);
        },
        onExportPdf: async function () {
    try {
        const response = await fetch(
            "/odata/v4/asset-management/ExportAssetReportPDF()"
        );

        if (!response.ok) {
            throw new Error("PDF export request failed");
        }

        const result = await response.json();
        const binaryValue = result.value;

        let byteArray;

        if (
            binaryValue &&
            binaryValue.type === "Buffer" &&
            Array.isArray(binaryValue.data)
        ) {
            byteArray = new Uint8Array(binaryValue.data);
        } else if (typeof binaryValue === "string") {
            const binaryString = atob(binaryValue);

            byteArray = new Uint8Array(binaryString.length);

            for (let index = 0; index < binaryString.length; index++) {
                byteArray[index] = binaryString.charCodeAt(index);
            }
        } else {
            throw new Error("Unsupported PDF response format");
        }

        const blob = new Blob(
            [byteArray],
            { type: "application/pdf" }
        );

        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");

        downloadLink.href = downloadUrl;
        downloadLink.download = "AssetReport.pdf";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        sap.m.MessageToast.show(
            "Unable to download the PDF report"
        );

        console.error("PDF export failed:", error);
    }
},
onExportExcel: async function () {
    try {
        const response = await fetch(
            "/odata/v4/asset-management/ExportAssetReportExcel()"
        );

        if (!response.ok) {
            throw new Error("Excel export request failed");
        }

        const result = await response.json();
        const binaryValue = result.value;

        let byteArray;

        if (
            binaryValue &&
            binaryValue.type === "Buffer" &&
            Array.isArray(binaryValue.data)
        ) {
            byteArray = new Uint8Array(binaryValue.data);
        } else if (typeof binaryValue === "string") {
            const binaryString = atob(binaryValue);

            byteArray = new Uint8Array(binaryString.length);

            for (
                let index = 0;
                index < binaryString.length;
                index++
            ) {
                byteArray[index] =
                    binaryString.charCodeAt(index);
            }
        } else {
            throw new Error(
                "Unsupported Excel response format"
            );
        }

        const blob = new Blob(
            [byteArray],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );

        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink =
            document.createElement("a");

        downloadLink.href = downloadUrl;
        downloadLink.download = "AssetReport.xlsx";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        sap.m.MessageToast.show(
            "Unable to download the Excel report"
        );

        console.error(
            "Excel export failed:",
            error
        );
    }
}

    });
    
});