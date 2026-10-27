const cds = require('@sap/cds');
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

module.exports = cds.service.impl(async function () {

    const {
        Departments,
        Assets,
        Employees,
        Vendors,
        AssetAssignments,
        OwnershipLedgers,
        MaintenanceRecords,
        ArchiveRecords
    } = this.entities;

  const { Assets: DbAssets } = cds.entities("sprintproj");

this.after("READ", Assets, async (records,req) => {
    const assets = Array.isArray(records)
        ? records
        : [records];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const asset of assets) {
        if (!asset) {
    continue;
}

asset.hideAdminManagerActions =
    !req.user.is("Admin") &&
    !req.user.is("Manager");

asset.hideEmployeeActions = false;

asset.hideAdminActions =
    !req.user.is("Admin");
    const assetStatusCriticalityMap = {
    AVAILABLE: 3,
    ASSIGNED: 5,
    MAINTENANCE: 2,
    RETIRED: 0,
    ARCHIVED: 1
};

asset.assetStatusCriticality =
    assetStatusCriticalityMap[asset.status] ?? 0;

let warrantyExpiry = asset.warrantyExpiry;

        /*
         * Fiori may request warrantyStatus or warrantyCriticality
         * without including warrantyExpiry in the same response.
         * Retrieve warrantyExpiry directly from the database when needed.
         */
        if (!warrantyExpiry && asset.ID) {
            const databaseAsset = await SELECT.one
                .from(DbAssets)
                .columns("warrantyExpiry")
                .where({
                    ID: asset.ID
                });

            warrantyExpiry =
                databaseAsset &&
                databaseAsset.warrantyExpiry;
        }

        if (!warrantyExpiry) {
            asset.warrantyStatus = "NOT AVAILABLE";
            asset.warrantyCriticality = 0;
            continue;
        }

        const expiryDate = new Date(
            `${warrantyExpiry}T00:00:00`
        );

        if (Number.isNaN(expiryDate.getTime())) {
            asset.warrantyStatus = "NOT AVAILABLE";
            asset.warrantyCriticality = 0;
            continue;
        }

        const millisecondsPerDay =
            1000 * 60 * 60 * 24;

        const remainingDays = Math.ceil(
            (expiryDate.getTime() - today.getTime()) /
            millisecondsPerDay
        );

        if (remainingDays < 0) {
            asset.warrantyStatus = "EXPIRED";
            asset.warrantyCriticality = 1;
        } else if (remainingDays <= 90) {
            asset.warrantyStatus = "EXPIRING SOON";
            asset.warrantyCriticality = 2;
        } else {
            asset.warrantyStatus = "ACTIVE";
            asset.warrantyCriticality = 3;
        }
    }
});
    this.before(
    ['UPDATE', 'DELETE'],
    OwnershipLedgers,
    req => {
        req.reject(
            403,
            'Ownership ledger records cannot be modified'
        );
    }
);

    this.on('AssignAsset', async (req) => {

        const { employeeID, distributionDate } = req.data;
        const assetID = req.params[0].ID;

        const tx = cds.transaction(req);
        const assignedByEmployeeID =
    req.user.attr &&
    req.user.attr.employeeID;

if (!assignedByEmployeeID) {
    return req.reject(
        403,
        "Authenticated user is not mapped to an employee"
    );
}

        const asset = await tx.run(
            SELECT.one.from(Assets).where({ ID: assetID })
        );

        if (!asset) {
            req.error(404, 'Asset not found');
        }

        if (asset.status !== 'AVAILABLE') {
            req.error(400, 'Only AVAILABLE assets can be assigned');
        }
        const employee = await tx.run(
    SELECT.one.from(Employees).where({ ID: employeeID })
);

if (!employee) {
    req.error(404, 'Employee not found');
}

if (employee.status !== 'ACTIVE') {
    req.error(
        400,
        'Asset can only be assigned to ACTIVE employees'
    );
}
if (
    distributionDate &&
    asset.purchaseDate &&
    new Date(distributionDate) < new Date(asset.purchaseDate)
) {
    req.error(
        400,
        'Distribution date cannot be earlier than purchase date'
    );
}

        await tx.run(
            UPDATE(Assets)
                .set({
                    currentHolder_ID: employeeID,
                    status: 'ASSIGNED',
                    firstDistributionDate: distributionDate
                })
                .where({ ID: assetID })
        );
        

        await tx.run(
            INSERT.into(AssetAssignments).entries({
                asset_ID: assetID,
                employee_ID: employeeID,
                assignedBy_ID: assignedByEmployeeID,
                assignedDate: distributionDate,
                assignmentStatus: 'ASSIGNED'
            })
        );

        await tx.run(
            INSERT.into(OwnershipLedgers).entries({
                asset_ID: assetID,
                toEmployee_ID: employeeID,
                action: 'ASSIGN',
                transitionDate: distributionDate,
                recordedBy_ID: assignedByEmployeeID
            })
        );

        return {
            message: 'Asset assigned successfully'
        };
    });


    this.on('TransferAsset', async (req) => {

        const { employeeID, transferDate } = req.data;
        const assetID = req.params[0].ID;

        const tx = cds.transaction(req);
        const recordedByEmployeeID =
    req.user.attr &&
    req.user.attr.employeeID;

if (!recordedByEmployeeID) {
    return req.reject(
        403,
        "Authenticated user is not mapped to an employee"
    );
}

        const asset = await tx.run(
            SELECT.one.from(Assets).where({ ID: assetID })
        );

        if (!asset) {
            req.error(404, 'Asset not found');
        }

        if (asset.status !== 'ASSIGNED') {
            req.error(400, 'Only assigned assets can be transferred');
        }
const employee = await tx.run(
    SELECT.one.from(Employees).where({ ID: employeeID })
);

if (!employee) {
    req.error(404, 'Employee not found');
}

if (employee.status !== 'ACTIVE') {
    req.error(
        400,
        'Asset can only be transferred to ACTIVE employees'
    );
}
        const previousHolder = asset.currentHolder_ID;
        if (previousHolder === employeeID) {
    req.error(
        400,
        'Asset is already assigned to this employee'
    );
}


        await tx.run(
            UPDATE(Assets)
                .set({
                    currentHolder_ID: employeeID
                })
                .where({ ID: assetID })
        );

        await tx.run(
            INSERT.into(OwnershipLedgers).entries({
                asset_ID: assetID,
                fromEmployee_ID: previousHolder,
                toEmployee_ID: employeeID,
                action: 'TRANSFER',
                transitionDate: transferDate,
                recordedBy_ID: recordedByEmployeeID
            })
        );
        await tx.run(
    UPDATE(AssetAssignments)
        .set({
            actualReturnDate: transferDate,
            assignmentStatus: 'RETURNED'
        })
        .where({
            asset_ID: assetID,
            assignmentStatus: 'ASSIGNED'
        })
);

        await tx.run(
            INSERT.into(AssetAssignments).entries({
                asset_ID: assetID,
                employee_ID: employeeID,
                assignedBy_ID: recordedByEmployeeID,
                assignedDate: transferDate,
                assignmentStatus: 'ASSIGNED'
            })
        );

        return {
            message: 'Asset transferred successfully'
        };
    });

    this.on('ReturnAsset', async (req) => {

    const { returnDate, remarks } = req.data;
    const assetID = req.params[0].ID;

    const tx = cds.transaction(req);
    const recordedByEmployeeID =
    req.user.attr &&
    req.user.attr.employeeID;

if (!recordedByEmployeeID) {
    return req.reject(
        403,
        "Authenticated user is not mapped to an employee"
    );
}

    const asset = await tx.run(
        SELECT.one.from(Assets).where({ ID: assetID })
    );

    if (!asset) {
        req.error(404, 'Asset not found');
    }

    if (asset.status !== 'ASSIGNED') {
        req.error(400, 'Only assigned assets can be returned');
    }

    const previousHolder = asset.currentHolder_ID;

    await tx.run(
        UPDATE(Assets)
            .set({
                currentHolder_ID: null,
                status: 'AVAILABLE'
            })
            .where({ ID: assetID })
    );

    await tx.run(
        UPDATE(AssetAssignments)
            .set({
                actualReturnDate: returnDate,
                assignmentStatus: 'RETURNED',
                remarks: remarks
            })
            .where({
                asset_ID: assetID,
                assignmentStatus: 'ASSIGNED'
            })
    );

    await tx.run(
        INSERT.into(OwnershipLedgers).entries({
            asset_ID: assetID,
            fromEmployee_ID: previousHolder,
            action: 'RETURN',
            transitionDate: returnDate,
            recordedBy_ID: recordedByEmployeeID,
            notes: remarks
        })
    );

    return {
        message: 'Asset returned successfully'
    };
});

this.on('SendForMaintenance', async (req) => {

    const { maintenanceType,description,serviceVendorID,cost,coveredByWarranty,nextDueDate } = req.data;
    const assetID = req.params[0].ID;

    const tx = cds.transaction(req);
    const reportedByEmployeeID =
    req.user.attr &&
    req.user.attr.employeeID;

if (!reportedByEmployeeID) {
    return req.reject(
        403,
        "Authenticated user is not mapped to an employee"
    );
}
    if (
    cost !== null &&
    cost !== undefined &&
    Number(cost) < 0
) {
    return req.reject(
        400,
        "Maintenance cost cannot be negative"
    );
}
if (
    nextDueDate &&
    new Date(nextDueDate) < new Date()
) {
    return req.reject(
        400,
        "Next due date cannot be in the past"
    );
}
if (serviceVendorID) {
    const serviceVendor = await tx.run(
        SELECT.one.from(Vendors).where({
            ID: serviceVendorID
        })
    );

    if (!serviceVendor) {
        return req.reject(
            404,
            "Service vendor not found"
        );
    }
}

    const asset = await tx.run(
        SELECT.one.from(Assets).where({ ID: assetID })
    );

    if (!asset) {
        req.error(404, 'Asset not found');
    }

    if (asset.status === 'ARCHIVED') {
        req.error(400, 'Archived assets cannot be maintained');
    }

    await tx.run(
        UPDATE(Assets)
            .set({
                status: 'MAINTENANCE'
            })
            .where({ ID: assetID })
    );

    await tx.run(
        INSERT.into(MaintenanceRecords).entries({
            asset_ID: assetID,
            type: maintenanceType,
            description: description,
            reportedBy_ID: reportedByEmployeeID,
            serviceVendor_ID: serviceVendorID || null,
            reportedDate: new Date(),
            status: 'OPEN',
            cost:cost,
            coveredByWarranty:
            coveredByWarranty === true,
            nextDueDate: nextDueDate || null
        })
    );

    return {
        message: 'Asset sent for maintenance successfully'
    };
});

this.on('CompleteMaintenance', async (req) => {

    const assetID = req.params[0].ID;

    const tx = cds.transaction(req);

    const asset = await tx.run(
        SELECT.one.from(Assets).where({ ID: assetID })
    );

    if (!asset) {
        req.error(404, 'Asset not found');
    }

    if (asset.status !== 'MAINTENANCE') {
        req.error(400, 'Asset is not under maintenance');
    }

    await tx.run(
        UPDATE(Assets)
            .set({
                status: 'AVAILABLE'
            })
            .where({ ID: assetID })
    );

    await tx.run(
        UPDATE(MaintenanceRecords)
            .set({
                status: 'COMPLETED',
                completedDate: new Date(),
                outcome: 'RESOLVED'
            })
            .where({
                asset_ID: assetID,
                status: 'OPEN'
            })
    );

    return {
        message: 'Maintenance completed successfully'
    };
});

this.on('RetireAsset', async (req) => {

    const { reason } = req.data;
    const assetID = req.params[0].ID;

    const tx = cds.transaction(req);

    const asset = await tx.run(
        SELECT.one.from(Assets).where({ ID: assetID })
    );

    if (!asset) {
        req.error(404, 'Asset not found');
    }
    if (asset.status === 'ASSIGNED') {
    req.error(
        400,
        'Assigned assets cannot be retired'
    );
}

    await tx.run(
        UPDATE(Assets)
            .set({
                status: 'RETIRED'
            })
            .where({ ID: assetID })
    );

    return {
        message: `Asset retired successfully. Reason: ${reason}`
    };
});


this.on('ArchiveAsset', async (req) => {

    const { reason,disposalMethod,disposalCertNo } = req.data;
    const assetID = req.params[0].ID;

    const tx = cds.transaction(req);
    const archivedByEmployeeID =
    req.user.attr &&
    req.user.attr.employeeID;

if (!archivedByEmployeeID) {
    return req.reject(
        403,
        "Authenticated user is not mapped to an employee"
    );
}
    const validDisposalMethods = [
    "RECYCLE",
    "DESTROY",
    "SELL",
    "DONATE"
];

if (
    !disposalMethod ||
    !validDisposalMethods.includes(disposalMethod)
) {
    return req.reject(
        400,
        "Disposal method must be RECYCLE, DESTROY, SELL, or DONATE"
    );
}
if (
    !disposalCertNo ||
    !disposalCertNo.trim()
) {
    return req.reject(
        400,
        "Disposal certificate number is required"
    );
}

if (disposalCertNo.trim().length > 40) {
    return req.reject(
        400,
        "Disposal certificate number cannot exceed 40 characters"
    );
}
    const asset = await tx.run(
        SELECT.one.from(Assets).where({ ID: assetID })
    );

    if (!asset) {
        req.error(404, 'Asset not found');
    }
if (asset.status === 'ASSIGNED') {
    req.error(
        400,
        'Assigned assets cannot be archived'
    );
}
    if (asset.status !== 'RETIRED') {
        req.error(400, 'Only retired assets can be archived');
    }

    await tx.run(
        UPDATE(Assets)
            .set({
                status: 'ARCHIVED'
            })
            .where({ ID: assetID })
    );

    await tx.run(
        INSERT.into(ArchiveRecords).entries({
            asset_ID: assetID,
            archivedAt: new Date(),
            archivedBy_ID: archivedByEmployeeID,
            reason: reason,
            disposalMethod: disposalMethod,
            disposalCertNo: disposalCertNo.trim()
        })
    );

    return {
        message: 'Asset archived successfully'
    };
});


this.on("GetCurrentUser", req => {
    let role = null;

    if (req.user.is("Admin")) {
        role = "Admin";
    } else if (req.user.is("Manager")) {
        role = "Manager";
    } else if (req.user.is("Employee")) {
        role = "Employee";
    }

    return {
        userID: req.user.id,
        role: role,

        employeeID:
            req.user.attr &&
            req.user.attr.employeeID
                ? req.user.attr.employeeID
                : null,

        department:
            req.user.attr &&
            req.user.attr.department
                ? req.user.attr.department
                : null
    };
});

this.on('GetAdminDashboard', async (req) => {

    const tx = cds.transaction(req);

    const totalAssets = await tx.run(
        SELECT.from(Assets)
    );
    const today = new Date();
today.setHours(0, 0, 0, 0);

const warrantyLimitDate = new Date(today);
warrantyLimitDate.setDate(
    warrantyLimitDate.getDate() + 90
);

const expiringWarranties =
    totalAssets.filter(asset => {
        if (!asset.warrantyExpiry) {
            return false;
        }

        const expiryDate = new Date(
            `${asset.warrantyExpiry}T00:00:00`
        );

        if (Number.isNaN(expiryDate.getTime())) {
            return false;
        }

        return (
            expiryDate >= today &&
            expiryDate <= warrantyLimitDate
        );
    }).length;

    const availableAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'AVAILABLE' })
    );

    const assignedAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'ASSIGNED' })
    );

    const maintenanceAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'MAINTENANCE' })
    );

    const retiredAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'RETIRED' })
    );

    const archivedAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'ARCHIVED' })
    );

    return {
        totalAssets: totalAssets.length,
        availableAssets: availableAssets.length,
        assignedAssets: assignedAssets.length,
        maintenanceAssets: maintenanceAssets.length,
        retiredAssets: retiredAssets.length,
        archivedAssets: archivedAssets.length,
        expiringWarranties: expiringWarranties
    };
});


this.on("GetManagerDashboard", async req => {
    const tx = cds.transaction(req);

    const departmentName =
        req.user.attr &&
        req.user.attr.department;

    /*
     * Admin can access the Manager Dashboard for
     * organization-wide oversight.
     */
    if (req.user.is("Admin") && !departmentName) {
        const totalAssignments = await tx.run(
            SELECT.from(AssetAssignments)
        );

        const activeAssignments = await tx.run(
            SELECT.from(AssetAssignments)
                .where({
                    assignmentStatus: "ASSIGNED"
                })
        );

        const returnedAssignments = await tx.run(
            SELECT.from(AssetAssignments)
                .where({
                    assignmentStatus: "RETURNED"
                })
        );

        const transfers = await tx.run(
            SELECT.from(OwnershipLedgers)
                .where({
                    action: "TRANSFER"
                })
        );

        return {
            totalAssignments: totalAssignments.length,
            activeAssignments: activeAssignments.length,
            returnedAssignments: returnedAssignments.length,
            totalTransfers: transfers.length
        };
    }

    if (!departmentName) {
        return req.reject(
            403,
            "Department is not configured for this manager"
        );
    }

    const department = await tx.run(
        SELECT.one.from(Departments)
            .where({
                name: departmentName
            })
    );

    if (!department) {
        return req.reject(
            404,
            `Department '${departmentName}' was not found`
        );
    }

    const departmentEmployees = await tx.run(
        SELECT.from(Employees)
            .columns("ID")
            .where({
                department_ID: department.ID
            })
    );

    const employeeIDs =
        departmentEmployees.map(employee => employee.ID);

    if (employeeIDs.length === 0) {
        return {
            totalAssignments: 0,
            activeAssignments: 0,
            returnedAssignments: 0,
            totalTransfers: 0
        };
    }

    const assignments = await tx.run(
        SELECT.from(AssetAssignments)
            .where({
                employee_ID: {
                    in: employeeIDs
                }
            })
    );

    const totalAssignments = assignments.length;

    const activeAssignments = assignments.filter(
        assignment =>
            assignment.assignmentStatus === "ASSIGNED"
    ).length;

    const returnedAssignments = assignments.filter(
        assignment =>
            assignment.assignmentStatus === "RETURNED"
    ).length;

    const transferRecords = await tx.run(
        SELECT.from(OwnershipLedgers)
            .where({
                action: "TRANSFER"
            })
    );

    /*
     * Count a transfer when either the previous employee
     * or the new employee belongs to the manager's department.
     */
    const employeeIDSet = new Set(employeeIDs);

    const totalTransfers = transferRecords.filter(record =>
        employeeIDSet.has(record.fromEmployee_ID) ||
        employeeIDSet.has(record.toEmployee_ID)
    ).length;

    return {
        totalAssignments,
        activeAssignments,
        returnedAssignments,
        totalTransfers
    };
});
this.on("GetEmployeeDashboard", async req => {
    const tx = cds.transaction(req);

    const employeeID =
        req.user.attr &&
        req.user.attr.employeeID;

    /*
     * Admin can access the Employee Dashboard for oversight.
     * If Admin has no employeeID attribute, return global values.
     */
    if (req.user.is("Admin") && !employeeID) {
        const assignedAssets = await tx.run(
            SELECT.from(AssetAssignments)
                .where({
                    assignmentStatus: "ASSIGNED"
                })
        );

        const returnedAssets = await tx.run(
            SELECT.from(AssetAssignments)
                .where({
                    assignmentStatus: "RETURNED"
                })
        );

        const maintenanceRequests = await tx.run(
            SELECT.from(MaintenanceRecords)
                .where({
                    status: "OPEN"
                })
        );

        return {
            assignedAssets: assignedAssets.length,
            returnedAssets: returnedAssets.length,
            maintenanceRequests:
                maintenanceRequests.length
        };
    }

    if (!employeeID) {
        return req.reject(
            403,
            "Employee ID is not configured for this user"
        );
    }

    const assignedAssets = await tx.run(
        SELECT.from(AssetAssignments)
            .where({
                employee_ID: employeeID,
                assignmentStatus: "ASSIGNED"
            })
    );

    const returnedAssets = await tx.run(
        SELECT.from(AssetAssignments)
            .where({
                employee_ID: employeeID,
                assignmentStatus: "RETURNED"
            })
    );

    /*
     * Count open maintenance records only for assets
     * currently assigned to the logged-in employee.
     */
    const employeeAssets = await tx.run(
        SELECT.from(Assets)
            .columns("ID")
            .where({
                currentHolder_ID: employeeID
            })
    );

    const employeeAssetIDs =
        employeeAssets.map(asset => asset.ID);

    let maintenanceRequests = [];

    if (employeeAssetIDs.length > 0) {
        maintenanceRequests = await tx.run(
            SELECT.from(MaintenanceRecords)
                .where({
                    asset_ID: {
                        in: employeeAssetIDs
                    },
                    status: "OPEN"
                })
        );
    }

    return {
        assignedAssets: assignedAssets.length,
        returnedAssets: returnedAssets.length,
        maintenanceRequests:
            maintenanceRequests.length
    };
});
this.on('GetAssetStatusChart', async (req) => {

    const tx = cds.transaction(req);

    const availableAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'AVAILABLE' })
    );

    const assignedAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'ASSIGNED' })
    );

    const maintenanceAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'MAINTENANCE' })
    );

    const retiredAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'RETIRED' })
    );

    const archivedAssets = await tx.run(
        SELECT.from(Assets)
        .where({ status: 'ARCHIVED' })
    );

    return [
        {
            status: 'AVAILABLE',
            count: availableAssets.length
        },
        {
            status: 'ASSIGNED',
            count: assignedAssets.length
        },
        {
            status: 'MAINTENANCE',
            count: maintenanceAssets.length
        },
        {
            status: 'RETIRED',
            count: retiredAssets.length
        },
        {
            status: 'ARCHIVED',
            count: archivedAssets.length
        }
    ];
});


this.on("GetAssignmentChart", async req => {
    const tx = cds.transaction(req);

    const departmentName =
        req.user.attr &&
        req.user.attr.department;

    /*
     * Admin receives organization-wide chart data.
     */
    if (req.user.is("Admin") && !departmentName) {
        const assignments = await tx.run(
            SELECT.from(AssetAssignments)
        );

        return [
            {
                status: "ASSIGNED",
                count: assignments.filter(
                    record =>
                        record.assignmentStatus === "ASSIGNED"
                ).length
            },
            {
                status: "RETURNED",
                count: assignments.filter(
                    record =>
                        record.assignmentStatus === "RETURNED"
                ).length
            },
            {
                status: "OVERDUE",
                count: assignments.filter(
                    record =>
                        record.assignmentStatus === "OVERDUE"
                ).length
            }
        ];
    }

    if (!departmentName) {
        return req.reject(
            403,
            "Department is not configured for this manager"
        );
    }

    const department = await tx.run(
        SELECT.one.from(Departments)
            .where({
                name: departmentName
            })
    );

    if (!department) {
        return req.reject(
            404,
            `Department '${departmentName}' was not found`
        );
    }

    const departmentEmployees = await tx.run(
        SELECT.from(Employees)
            .columns("ID")
            .where({
                department_ID: department.ID
            })
    );

    const employeeIDs = departmentEmployees.map(
        employee => employee.ID
    );

    if (employeeIDs.length === 0) {
        return [
            {
                status: "ASSIGNED",
                count: 0
            },
            {
                status: "RETURNED",
                count: 0
            },
            {
                status: "OVERDUE",
                count: 0
            }
        ];
    }

    const assignments = await tx.run(
        SELECT.from(AssetAssignments)
            .where({
                employee_ID: {
                    in: employeeIDs
                }
            })
    );

    return [
        {
            status: "ASSIGNED",
            count: assignments.filter(
                record =>
                    record.assignmentStatus === "ASSIGNED"
            ).length
        },
        {
            status: "RETURNED",
            count: assignments.filter(
                record =>
                    record.assignmentStatus === "RETURNED"
            ).length
        },
        {
            status: "OVERDUE",
            count: assignments.filter(
                record =>
                    record.assignmentStatus === "OVERDUE"
            ).length
        }
    ];
});
this.on("GetMaintenanceStatusChart", async req => {
    const tx = cds.transaction(req);

    const employeeID =
        req.user.attr &&
        req.user.attr.employeeID;

    /*
     * Admin receives organization-wide maintenance data.
     */
    if (req.user.is("Admin") && !employeeID) {
        const records = await tx.run(
            SELECT.from(MaintenanceRecords)
        );

        return [
            {
                status: "OPEN",
                count: records.filter(
                    record => record.status === "OPEN"
                ).length
            },
            {
                status: "IN_PROGRESS",
                count: records.filter(
                    record => record.status === "IN_PROGRESS"
                ).length
            },
            {
                status: "COMPLETED",
                count: records.filter(
                    record => record.status === "COMPLETED"
                ).length
            }
        ];
    }

    if (!employeeID) {
        return req.reject(
            403,
            "Employee ID is not configured for this user"
        );
    }

    /*
     * Find all assets that have assignment history
     * for the authenticated employee.
     */
    const employeeAssignments = await tx.run(
        SELECT.from(AssetAssignments)
            .columns("asset_ID")
            .where({
                employee_ID: employeeID
            })
    );

    const employeeAssetIDs = [
        ...new Set(
            employeeAssignments.map(
                assignment => assignment.asset_ID
            )
        )
    ];

    if (employeeAssetIDs.length === 0) {
        return [
            {
                status: "OPEN",
                count: 0
            },
            {
                status: "IN_PROGRESS",
                count: 0
            },
            {
                status: "COMPLETED",
                count: 0
            }
        ];
    }

    const records = await tx.run(
        SELECT.from(MaintenanceRecords)
            .where({
                asset_ID: {
                    in: employeeAssetIDs
                }
            })
    );

    return [
        {
            status: "OPEN",
            count: records.filter(
                record => record.status === "OPEN"
            ).length
        },
        {
            status: "IN_PROGRESS",
            count: records.filter(
                record => record.status === "IN_PROGRESS"
            ).length
        },
        {
            status: "COMPLETED",
            count: records.filter(
                record => record.status === "COMPLETED"
            ).length
        }
    ];
});
this.on('GetArchiveReasonChart', async (req) => {

    const tx = cds.transaction(req);

    const endOfLife = await tx.run(
        SELECT.from(ArchiveRecords)
            .where({ reason: 'END_OF_LIFE' })
    );

    const damaged = await tx.run(
        SELECT.from(ArchiveRecords)
            .where({ reason: 'DAMAGED' })
    );

    const lost = await tx.run(
        SELECT.from(ArchiveRecords)
            .where({ reason: 'LOST' })
    );

    const obsolete = await tx.run(
        SELECT.from(ArchiveRecords)
            .where({ reason: 'OBSOLETE' })
    );

    return [
        {
            reason: 'END_OF_LIFE',
            count: endOfLife.length
        },
        {
            reason: 'DAMAGED',
            count: damaged.length
        },
        {
            reason: 'LOST',
            count: lost.length
        },
        {
            reason: 'OBSOLETE',
            count: obsolete.length
        }
    ];
});
this.on('GetAssetReport', async (req) => {

    const tx = cds.transaction(req);

    const assets = await tx.run(
        SELECT.from(Assets)
    );

    return assets.map(asset => ({
        assetTag: asset.assetTag,
        serialNumber: asset.serialNumber,
        model: asset.model,
        status: asset.status
    }));
});
this.on("GetAssignmentReport", async req => {
    const tx = cds.transaction(req);

    const employees = await tx.run(
        SELECT.from(Employees)
            .columns(
                "ID",
                "fullName",
                "department_ID"
            )
    );

    const employeeNameByID = new Map(
        employees.map(employee => [
            employee.ID,
            employee.fullName
        ])
    );

    const mapAssignmentRecord = record => ({
        employeeID:
            record.employee_ID,

        employeeName:
            employeeNameByID.get(
                record.employee_ID
            ) || "Unknown Employee",

        assignedByID:
            record.assignedBy_ID,

        assignedByName:
            employeeNameByID.get(
                record.assignedBy_ID
            ) || null,

        assignedDate:
            record.assignedDate,

        actualReturnDate:
            record.actualReturnDate,

        assignmentStatus:
            record.assignmentStatus
    });

    /*
     * Admin receives organization-wide
     * assignment records.
     */
    if (req.user.is("Admin")) {
        const assignments = await tx.run(
            SELECT.from(AssetAssignments)
        );

        return assignments.map(
            mapAssignmentRecord
        );
    }

    /*
     * Manager receives assignment records only for
     * employees in the Manager's department.
     */
    if (req.user.is("Manager")) {
        const departmentName =
            req.user.attr &&
            req.user.attr.department;

        if (!departmentName) {
            return req.reject(
                403,
                "Department is not configured for this manager"
            );
        }

        const department = await tx.run(
            SELECT.one.from(Departments)
                .where({
                    name: departmentName
                })
        );

        if (!department) {
            return req.reject(
                404,
                `Department '${departmentName}' was not found`
            );
        }

        const departmentEmployeeIDs =
            employees
                .filter(
                    employee =>
                        employee.department_ID ===
                        department.ID
                )
                .map(
                    employee => employee.ID
                );

        if (
            departmentEmployeeIDs.length === 0
        ) {
            return [];
        }

        const assignments = await tx.run(
            SELECT.from(AssetAssignments)
                .where({
                    employee_ID: {
                        in: departmentEmployeeIDs
                    }
                })
        );

        return assignments.map(
            mapAssignmentRecord
        );
    }

    /*
     * Employee receives only personal
     * assignment records.
     */
    if (req.user.is("Employee")) {
        const employeeID =
            req.user.attr &&
            req.user.attr.employeeID;

        if (!employeeID) {
            return req.reject(
                403,
                "Employee ID is not configured for this user"
            );
        }

        const employee = await tx.run(
            SELECT.one.from(Employees)
                .where({
                    ID: employeeID
                })
        );

        if (!employee) {
            return req.reject(
                404,
                "Employee record was not found"
            );
        }

        const assignments = await tx.run(
            SELECT.from(AssetAssignments)
                .where({
                    employee_ID: employeeID
                })
        );

        return assignments.map(
            mapAssignmentRecord
        );
    }

    return req.reject(
        403,
        "Assignment Report access is not allowed"
    );
});
    
this.on("GetTransferReport", async req => {
    const tx = cds.transaction(req);

    const employees = await tx.run(
        SELECT.from(Employees)
            .columns(
                "ID",
                "fullName",
                "department_ID"
            )
    );

    const assets = await tx.run(
        SELECT.from(Assets)
            .columns(
                "ID",
                "assetTag"
            )
    );

    const employeeNameByID = new Map(
        employees.map(employee => [
            employee.ID,
            employee.fullName
        ])
    );

    const assetTagByID = new Map(
        assets.map(asset => [
            asset.ID,
            asset.assetTag
        ])
    );

    const mapTransferRecord = record => ({
        assetID:
            record.asset_ID,

        assetTag:
            assetTagByID.get(
                record.asset_ID
            ) || null,

        fromEmployeeID:
            record.fromEmployee_ID,

        fromEmployeeName:
            employeeNameByID.get(
                record.fromEmployee_ID
            ) || null,

        toEmployeeID:
            record.toEmployee_ID,

        toEmployeeName:
            employeeNameByID.get(
                record.toEmployee_ID
            ) || null,

        transitionDate:
            record.transitionDate,

        recordedByName:
            employeeNameByID.get(
                record.recordedBy_ID
            ) || null,

        notes:
            record.notes
    });

    /*
     * Admin sees all transfer records.
     */
    if (req.user.is("Admin")) {
        const transfers = await tx.run(
            SELECT.from(OwnershipLedgers)
                .where({
                    action: "TRANSFER"
                })
        );

        return transfers.map(
            mapTransferRecord
        );
    }

    /*
     * Manager sees transfers involving employees
     * in the Manager's department.
     */
    if (req.user.is("Manager")) {
        const departmentName =
            req.user.attr &&
            req.user.attr.department;

        if (!departmentName) {
            return req.reject(
                403,
                "Department is not configured for this manager"
            );
        }

        const department = await tx.run(
            SELECT.one.from(Departments)
                .where({
                    name: departmentName
                })
        );

        if (!department) {
            return req.reject(
                404,
                `Department '${departmentName}' was not found`
            );
        }

        const departmentEmployeeIDs =
            employees
                .filter(
                    employee =>
                        employee.department_ID ===
                        department.ID
                )
                .map(
                    employee => employee.ID
                );

        if (
            departmentEmployeeIDs.length === 0
        ) {
            return [];
        }

        const departmentEmployeeIDSet =
            new Set(departmentEmployeeIDs);

        const transfers = await tx.run(
            SELECT.from(OwnershipLedgers)
                .where({
                    action: "TRANSFER"
                })
        );

        const departmentTransfers =
            transfers.filter(record =>
                departmentEmployeeIDSet.has(
                    record.fromEmployee_ID
                ) ||
                departmentEmployeeIDSet.has(
                    record.toEmployee_ID
                )
            );

        return departmentTransfers.map(
            mapTransferRecord
        );
    }

    return req.reject(
        403,
        "Transfer Report access is not allowed"
    );
});

this.on("GetMaintenanceReport", async req => {
    const tx = cds.transaction(req);
    const vendors = await tx.run(
    SELECT.from(Vendors)
        .columns("ID", "name")
);

const vendorNameById = new Map(
    vendors.map(vendor => [
        vendor.ID,
        vendor.name
    ])
);
const employees = await tx.run(
    SELECT.from(Employees)
        .columns("ID", "fullName")
);

const employeeNameByID = new Map(
    employees.map(employee => [
        employee.ID,
        employee.fullName
    ])
);
    const mapMaintenanceRecord = record => ({
    type: record.type,
    description: record.description,

    reportedByID:
        record.reportedBy_ID,

    reportedByName:
        employeeNameByID.get(
            record.reportedBy_ID
        ) || null,

    serviceVendorID:
        record.serviceVendor_ID,

    serviceVendorName:
        vendorNameById.get(
            record.serviceVendor_ID
        ) || null,

    reportedDate:
        record.reportedDate,

    completedDate:
        record.completedDate,

    nextDueDate:
        record.nextDueDate,

    status:
        record.status,

    outcome:
        record.outcome,

    cost:
        record.cost,

    coveredByWarranty:
        record.coveredByWarranty
});
    /*
     * Admin receives organization-wide maintenance records.
     */
    if (req.user.is("Admin")) {
        const records = await tx.run(
            SELECT.from(MaintenanceRecords)
        );

        return records.map(mapMaintenanceRecord);
    }

    /*
     * Manager receives maintenance records for assets
     * associated with employees in the Manager's department.
     */
    if (req.user.is("Manager")) {
        const departmentName =
            req.user.attr &&
            req.user.attr.department;

        if (!departmentName) {
            return req.reject(
                403,
                "Department is not configured for this manager"
            );
        }

        const department = await tx.run(
            SELECT.one.from(Departments)
                .where({
                    name: departmentName
                })
        );

        if (!department) {
            return req.reject(
                404,
                `Department '${departmentName}' was not found`
            );
        }

        const departmentEmployees = await tx.run(
            SELECT.from(Employees)
                .columns("ID")
                .where({
                    department_ID: department.ID
                })
        );

        const employeeIDs =
            departmentEmployees.map(
                employee => employee.ID
            );

        if (employeeIDs.length === 0) {
            return [];
        }

        const departmentAssignments = await tx.run(
            SELECT.from(AssetAssignments)
                .columns("asset_ID")
                .where({
                    employee_ID: {
                        in: employeeIDs
                    }
                })
        );

        const departmentAssetIDs = [
            ...new Set(
                departmentAssignments.map(
                    assignment => assignment.asset_ID
                )
            )
        ];

        if (departmentAssetIDs.length === 0) {
            return [];
        }

        const records = await tx.run(
            SELECT.from(MaintenanceRecords)
                .where({
                    asset_ID: {
                        in: departmentAssetIDs
                    }
                })
        );

        return records.map(mapMaintenanceRecord);
    }

    /*
     * Employee receives maintenance records only for
     * assets associated with their assignment history.
     */
    const employeeID =
        req.user.attr &&
        req.user.attr.employeeID;

    if (!employeeID) {
        return req.reject(
            403,
            "Employee ID is not configured for this user"
        );
    }

    const employeeAssignments = await tx.run(
        SELECT.from(AssetAssignments)
            .columns("asset_ID")
            .where({
                employee_ID: employeeID
            })
    );

    const employeeAssetIDs = [
        ...new Set(
            employeeAssignments.map(
                assignment => assignment.asset_ID
            )
        )
    ];

    if (employeeAssetIDs.length === 0) {
        return [];
    }

    const records = await tx.run(
        SELECT.from(MaintenanceRecords)
            .where({
                asset_ID: {
                    in: employeeAssetIDs
                }
            })
    );

    return records.map(mapMaintenanceRecord);
});


this.on("GetArchiveReport", async req => {
    const tx = cds.transaction(req);

    const records = await tx.run(
        SELECT.from(ArchiveRecords)
    );

    const employees = await tx.run(
        SELECT.from(Employees)
            .columns("ID", "fullName")
    );

    const employeeNameByID = new Map(
        employees.map(employee => [
            employee.ID,
            employee.fullName
        ])
    );

    return records.map(record => ({
        archivedAt: record.archivedAt,

        archivedByID:
            record.archivedBy_ID,

        archivedByName:
            employeeNameByID.get(
                record.archivedBy_ID
            ) || null,

        reason: record.reason,
        disposalMethod: record.disposalMethod,
        disposalCertNo: record.disposalCertNo
    }));
});
this.on('ExportAssetReportPDF', async (req) => {

    const tx = cds.transaction(req);

    const assets = await tx.run(
        SELECT.from(Assets)
    );

    const doc = new PDFDocument();

    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));

    const pdfPromise = new Promise(resolve => {
        doc.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });

    doc.fontSize(18).text('Asset Report');

    doc.moveDown();

    assets.forEach(asset => {

        doc.fontSize(12).text(
            `Asset Tag: ${asset.assetTag}`
        );

        doc.text(
            `Serial Number: ${asset.serialNumber}`
        );

        doc.text(
            `Model: ${asset.model}`
        );

        doc.text(
            `Status: ${asset.status}`
        );

        doc.moveDown();
    });

    doc.end();

    return await pdfPromise;
});

this.on('ExportAssetReportExcel', async (req) => {

    const tx = cds.transaction(req);

    const assets = await tx.run(
        SELECT.from(Assets)
    );

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(
        'Asset Report'
    );

    worksheet.columns = [
        {
            header: 'Asset Tag',
            key: 'assetTag',
            width: 20
        },
        {
            header: 'Serial Number',
            key: 'serialNumber',
            width: 25
        },
        {
            header: 'Model',
            key: 'model',
            width: 25
        },
        {
            header: 'Status',
            key: 'status',
            width: 20
        }
    ];

    assets.forEach(asset => {

        worksheet.addRow({
            assetTag: asset.assetTag,
            serialNumber: asset.serialNumber,
            model: asset.model,
            status: asset.status
        });

    });

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
});
});