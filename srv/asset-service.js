const cds = require('@sap/cds');
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

module.exports = cds.service.impl(async function () {

    const {
        Departments,
        Assets,
        Employees,
        Vendors,
        AssetCategories,
        AssetAssignments,
        OwnershipLedgers,
        MaintenanceRecords,
        ArchiveRecords
    } = this.entities;

  const { Assets: DbAssets,Employees: DbEmployees,Vendors: DbVendors,Departments: DbDepartments,AssetRequests: DbAssetRequests } = cds.entities("sprintproj");

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

this.on("CreateAsset", async req => {
    const {
        assetTag,
        serialNumber,
        categoryID,
        vendorID,
        model,
        purchaseDate,
        purchaseCost,
        warrantyExpiry
    } = req.data;

    const tx = cds.transaction(req);

    if (
        !assetTag ||
        !serialNumber ||
        !categoryID ||
        !vendorID ||
        !model ||
        !purchaseDate
    ) {
        return req.reject(
            400,
            "Asset Tag, Serial Number, Category, Vendor, Model, and Purchase Date are required"
        );
    }

    if (
        purchaseCost !== null &&
        purchaseCost !== undefined &&
        Number(purchaseCost) < 0
    ) {
        return req.reject(
            400,
            "Purchase cost cannot be negative"
        );
    }

    if (
        warrantyExpiry &&
        new Date(warrantyExpiry) <
            new Date(purchaseDate)
    ) {
        return req.reject(
            400,
            "Warranty expiry cannot be earlier than purchase date"
        );
    }

    const existingAssetTag = await tx.run(
    SELECT.one
        .from(DbAssets)
        .where({
            assetTag: assetTag.trim()
        })
);

if (existingAssetTag) {
    return req.reject(
        409,
        "Asset Tag already exists"
    );
}

const existingSerialNumber = await tx.run(
    SELECT.one
        .from(DbAssets)
        .where({
            serialNumber:
                serialNumber.trim()
        })
);

if (existingSerialNumber) {
    return req.reject(
        409,
        "Serial Number already exists"
    );
}

    const category = await tx.run(
        SELECT.one.from(AssetCategories).where({
            ID: categoryID
        })
    );

    if (!category) {
        return req.reject(
            404,
            "Asset category not found"
        );
    }

    const vendor = await tx.run(
        SELECT.one.from(Vendors).where({
            ID: vendorID
        })
    );

    if (!vendor) {
        return req.reject(
            404,
            "Vendor not found"
        );
    }

    const assetID = cds.utils.uuid();

    await tx.run(
        INSERT.into(DbAssets).entries({
            ID: assetID,
            assetTag: assetTag.trim(),
            serialNumber:
                serialNumber.trim(),
            category_ID: categoryID,
            vendor_ID: vendorID,
            model: model.trim(),
            purchaseDate: purchaseDate,
            purchaseCost:
                purchaseCost === null ||
                purchaseCost === undefined
                    ? null
                    : Number(purchaseCost),
            warrantyExpiry:
                warrantyExpiry || null,
            status: "AVAILABLE",
            currentHolder_ID: null,
            firstDistributionDate: null
        })
    );

    return {
        ID: assetID,
        assetTag: assetTag.trim(),
        status: "AVAILABLE"
    };
});



this.on("CreateEmployee", async req => {
    const {
        fullName,
        email,
        phone,
        departmentID,
        location
    } = req.data;

    const tx = cds.transaction(req);

    const normalizedFullName =
        fullName ? fullName.trim() : "";

    const normalizedEmail =
        email ? email.trim().toLowerCase() : "";

    const normalizedPhone =
        phone ? phone.trim() : "";

    const normalizedLocation =
        location ? location.trim() : "";

    if (
        !normalizedFullName ||
        !normalizedEmail ||
        !departmentID ||
        !normalizedLocation
    ) {
        return req.reject(
            400,
            "Full Name, Email, Department, and Location are required"
        );
    }

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
        return req.reject(
            400,
            "Enter a valid email address"
        );
    }

    if (
        normalizedPhone &&
        !/^[0-9+\-\s]{7,15}$/.test(
            normalizedPhone
        )
    ) {
        return req.reject(
            400,
            "Enter a valid phone number"
        );
    }

    const existingEmail = await tx.run(
        SELECT.one
            .from(DbEmployees)
            .where({
                email: normalizedEmail
            })
    );

    if (existingEmail) {
        return req.reject(
            409,
            "Employee email already exists"
        );
    }

    const department = await tx.run(
        SELECT.one
            .from(Departments)
            .where({
                ID: departmentID
            })
    );

    if (!department) {
        return req.reject(
            404,
            "Department not found"
        );
    }

    const employeeID = cds.utils.uuid();

    await tx.run(
        INSERT.into(DbEmployees).entries({
            ID: employeeID,
            fullName: normalizedFullName,
            email: normalizedEmail,
            phone: normalizedPhone || null,
            department_ID: departmentID,
            location: normalizedLocation,
            status: "ACTIVE"
        })
    );

    return {
        ID: employeeID,
        fullName: normalizedFullName,
        status: "ACTIVE"
    };
});




this.on("CreateVendor", async req => {
    const {
        name,
        email
    } = req.data;

    const tx =
        cds.transaction(req);

    const normalizedName =
        name ? name.trim() : "";

    const normalizedEmail =
        email
            ? email.trim().toLowerCase()
            : "";

    if (
        !normalizedName ||
        !normalizedEmail
    ) {
        return req.reject(
            400,
            "Vendor Name and Email are required"
        );
    }

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        !emailPattern.test(
            normalizedEmail
        )
    ) {
        return req.reject(
            400,
            "Enter a valid vendor email address"
        );
    }

    const existingVendorName =
        await tx.run(
            SELECT.one
                .from(DbVendors)
                .where({
                    name: normalizedName
                })
        );

    if (existingVendorName) {
        return req.reject(
            409,
            "Vendor name already exists"
        );
    }

    const existingVendorEmail =
        await tx.run(
            SELECT.one
                .from(DbVendors)
                .where({
                    email: normalizedEmail
                })
        );

    if (existingVendorEmail) {
        return req.reject(
            409,
            "Vendor email already exists"
        );
    }

    const vendorID =
        cds.utils.uuid();

    await tx.run(
        INSERT.into(DbVendors).entries({
            ID: vendorID,
            name: normalizedName,
            email: normalizedEmail
        })
    );

    return {
        ID: vendorID,
        name: normalizedName,
        email: normalizedEmail
    };
});


this.on("CreateDepartment", async req => {
    const {
        name,
        costCenter
    } = req.data;

    const tx =
        cds.transaction(req);

    const normalizedName =
        name ? name.trim() : "";

    const normalizedCostCenter =
        costCenter
            ? costCenter.trim().toUpperCase()
            : "";

    if (
        !normalizedName ||
        !normalizedCostCenter
    ) {
        return req.reject(
            400,
            "Department Name and Cost Center are required"
        );
    }

    const existingDepartmentName =
        await tx.run(
            SELECT.one
                .from(DbDepartments)
                .where({
                    name: normalizedName
                })
        );

    if (existingDepartmentName) {
        return req.reject(
            409,
            "Department name already exists"
        );
    }

    const existingCostCenter =
        await tx.run(
            SELECT.one
                .from(DbDepartments)
                .where({
                    costCenter:
                        normalizedCostCenter
                })
        );

    if (existingCostCenter) {
        return req.reject(
            409,
            "Cost Center already exists"
        );
    }

    const departmentID =
        cds.utils.uuid();

    await tx.run(
        INSERT.into(DbDepartments).entries({
            ID: departmentID,
            name: normalizedName,
            costCenter:
                normalizedCostCenter
        })
    );

    return {
        ID: departmentID,
        name: normalizedName,
        costCenter:
            normalizedCostCenter
    };
});




this.on(
    "CreateAssetRequest",
    async req => {
        const {
            categoryID,
            reason,
            priority
        } = req.data;

        const tx =
            cds.transaction(req);

        const employeeID =
            req.user.attr &&
            req.user.attr.employeeID;

        if (!employeeID) {
            return req.reject(
                403,
                "Employee ID is not configured for this user"
            );
        }

        const normalizedReason =
            reason ? reason.trim() : "";

        if (
            !categoryID ||
            !normalizedReason ||
            !priority
        ) {
            return req.reject(
                400,
                "Asset Category, Business Reason, and Priority are required"
            );
        }

        const validPriorities = [
            "LOW",
            "MEDIUM",
            "HIGH"
        ];

        if (
            !validPriorities.includes(
                priority
            )
        ) {
            return req.reject(
                400,
                "Priority must be LOW, MEDIUM, or HIGH"
            );
        }

        const employee =
            await tx.run(
                SELECT.one
                    .from(DbEmployees)
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

        if (
            employee.status !== "ACTIVE"
        ) {
            return req.reject(
                400,
                "Only active employees can request assets"
            );
        }

        const category =
            await tx.run(
                SELECT.one
                    .from(AssetCategories)
                    .where({
                        ID: categoryID
                    })
            );

        if (!category) {
            return req.reject(
                404,
                "Asset category was not found"
            );
        }

        const existingPendingRequest =
            await tx.run(
                SELECT.one
                    .from(DbAssetRequests)
                    .where({
                        requestedBy_ID:
                            employeeID,

                        category_ID:
                            categoryID,

                        status:
                            "PENDING"
                    })
            );

        if (existingPendingRequest) {
            return req.reject(
                409,
                "A pending request already exists for this asset category"
            );
        }

        const requestID =
            cds.utils.uuid();

        const requestedDate =
            new Date()
                .toISOString()
                .slice(0, 10);

        await tx.run(
            INSERT.into(
                DbAssetRequests
            ).entries({
                ID:
                    requestID,

                requestedBy_ID:
                    employeeID,

                category_ID:
                    categoryID,

                reason:
                    normalizedReason,

                priority:
                    priority,

                requestedDate:
                    requestedDate,

                status:
                    "PENDING",

                reviewedBy_ID:
                    null,

                reviewedAt:
                    null,

                managerRemarks:
                    null,

                fulfilledAsset_ID:
                    null
            })
        );

        return {
            ID:
                requestID,

            requestedDate:
                requestedDate,

            status:
                "PENDING"
        };
    }
);




this.on(
    "GetManagerAssetRequests",
    async req => {
        const tx =
            cds.transaction(req);

        const departmentName =
            req.user.attr &&
            req.user.attr.department;

        if (!departmentName) {
            return req.reject(
                403,
                "Department is not configured for this manager"
            );
        }

        const department =
            await tx.run(
                SELECT.one
                    .from(Departments)
                    .where({
                        name:
                            departmentName
                    })
            );

        if (!department) {
            return req.reject(
                404,
                "Manager department was not found"
            );
        }

        const departmentEmployees =
            await tx.run(
                SELECT.from(Employees)
                    .columns(
                        "ID",
                        "fullName"
                    )
                    .where({
                        department_ID:
                            department.ID
                    })
            );

        if (
            departmentEmployees.length === 0
        ) {
            return [];
        }

        const employeeIDs =
            departmentEmployees.map(
                employee => employee.ID
            );

        const employeeNameByID =
            new Map(
                departmentEmployees.map(
                    employee => [
                        employee.ID,
                        employee.fullName
                    ]
                )
            );

        const requests =
            await tx.run(
                SELECT.from(
                    DbAssetRequests
                ).where({
                    requestedBy_ID: {
                        in:
                            employeeIDs
                    }
                })
            );

        if (requests.length === 0) {
            return [];
        }

        const categoryIDs = [
            ...new Set(
                requests
                    .map(
                        request =>
                            request.category_ID
                    )
                    .filter(Boolean)
            )
        ];

        let categories = [];

        if (categoryIDs.length > 0) {
            categories =
                await tx.run(
                    SELECT.from(
                        AssetCategories
                    )
                        .columns(
                            "ID",
                            "name"
                        )
                        .where({
                            ID: {
                                in:
                                    categoryIDs
                            }
                        })
                );
        }

        const categoryNameByID =
            new Map(
                categories.map(
                    category => [
                        category.ID,
                        category.name
                    ]
                )
            );

        return requests.map(
            request => ({
                ID:
                    request.ID,

                employeeID:
                    request.requestedBy_ID,

                employeeName:
                    employeeNameByID.get(
                        request.requestedBy_ID
                    ) ||
                    "Unknown Employee",

                departmentName:
                    department.name,

                categoryID:
                    request.category_ID,

                categoryName:
                    categoryNameByID.get(
                        request.category_ID
                    ) ||
                    "Unknown Category",

                reason:
                    request.reason,

                priority:
                    request.priority,

                requestedDate:
                    request.requestedDate,

                status:
                    request.status,

                managerRemarks:
                    request.managerRemarks
            })
        );
    }
);


this.on(
    "ReviewAssetRequest",
    async req => {
        const {
            requestID,
            decision,
            managerRemarks
        } = req.data;

        const tx =
            cds.transaction(req);

        const managerEmployeeID =
            req.user.attr &&
            req.user.attr.employeeID;

        const managerDepartmentName =
            req.user.attr &&
            req.user.attr.department;

        if (!managerEmployeeID) {
            return req.reject(
                403,
                "Manager is not mapped to an employee"
            );
        }

        if (!managerDepartmentName) {
            return req.reject(
                403,
                "Department is not configured for this manager"
            );
        }

        if (
            !requestID ||
            !decision
        ) {
            return req.reject(
                400,
                "Request and decision are required"
            );
        }

        const normalizedDecision =
            decision
                .trim()
                .toUpperCase();

        if (
            ![
                "APPROVED",
                "REJECTED"
            ].includes(
                normalizedDecision
            )
        ) {
            return req.reject(
                400,
                "Decision must be APPROVED or REJECTED"
            );
        }

        const normalizedRemarks =
            managerRemarks
                ? managerRemarks.trim()
                : "";

        if (
            normalizedDecision ===
                "REJECTED" &&
            !normalizedRemarks
        ) {
            return req.reject(
                400,
                "Manager remarks are required when rejecting a request"
            );
        }

        const managerEmployee =
            await tx.run(
                SELECT.one
                    .from(DbEmployees)
                    .where({
                        ID:
                            managerEmployeeID
                    })
            );

        if (!managerEmployee) {
            return req.reject(
                404,
                "Manager employee record was not found"
            );
        }

        const managerDepartment =
            await tx.run(
                SELECT.one
                    .from(DbDepartments)
                    .where({
                        name:
                            managerDepartmentName
                    })
            );

        if (!managerDepartment) {
            return req.reject(
                404,
                "Manager department was not found"
            );
        }

        const assetRequest =
            await tx.run(
                SELECT.one
                    .from(DbAssetRequests)
                    .where({
                        ID:
                            requestID
                    })
            );

        if (!assetRequest) {
            return req.reject(
                404,
                "Asset request was not found"
            );
        }

        if (
            assetRequest.status !==
            "PENDING"
        ) {
            return req.reject(
                409,
                "Only pending asset requests can be reviewed"
            );
        }

        const requestingEmployee =
            await tx.run(
                SELECT.one
                    .from(DbEmployees)
                    .where({
                        ID:
                            assetRequest
                                .requestedBy_ID
                    })
            );

        if (!requestingEmployee) {
            return req.reject(
                404,
                "Requesting employee was not found"
            );
        }

        if (
            requestingEmployee
                .department_ID !==
            managerDepartment.ID
        ) {
            return req.reject(
                403,
                "This asset request does not belong to your department"
            );
        }

        const reviewedAt =
            new Date();

        await tx.run(
            UPDATE(
                DbAssetRequests
            )
                .set({
                    status:
                        normalizedDecision,

                    reviewedBy_ID:
                        managerEmployeeID,

                    reviewedAt:
                        reviewedAt,

                    managerRemarks:
                        normalizedRemarks ||
                        null
                })
                .where({
                    ID:
                        requestID,

                    status:
                        "PENDING"
                })
        );

        return {
            ID:
                requestID,

            status:
                normalizedDecision,

            message:
                normalizedDecision ===
                "APPROVED"
                    ? "Asset request approved successfully"
                    : "Asset request rejected successfully"
        };
    }
);



this.on(
    "GetMyAssignedAssets",
    async req => {
        const employeeID =
            req.user.attr &&
            req.user.attr.employeeID;

        if (!employeeID) {
            return req.reject(
                403,
                "Employee ID is not configured for this user"
            );
        }

        const tx =
            cds.transaction(req);

        const assignedAssets =
            await tx.run(
                SELECT.from(Assets)
                    .columns(
                        "ID",
                        "assetTag",
                        "model",
                        "status"
                    )
                    .where({
                        currentHolder_ID:
                            employeeID,
                        status:
                            "ASSIGNED"
                    })
            );

        return assignedAssets;
    }
);


this.on(
    "RaiseMaintenanceRequest",
    async req => {
        const {
            assetID,
            maintenanceType,
            description,
            serviceVendorID,
            coveredByWarranty,
            nextDueDate
        } = req.data;

        const tx =
            cds.transaction(req);

        const employeeID =
            req.user.attr &&
            req.user.attr.employeeID;

        if (!employeeID) {
            return req.reject(
                403,
                "Employee ID is not configured for this user"
            );
        }

        if (
            !assetID ||
            !maintenanceType ||
            !description ||
            !nextDueDate
        ) {
            return req.reject(
                400,
                "Asset, Maintenance Type, Description, and Next Due Date are required"
            );
        }

        const validMaintenanceTypes = [
            "PREVENTIVE",
            "CORRECTIVE",
            "REPAIR",
            "UPGRADE"
        ];

        if (
            !validMaintenanceTypes.includes(
                maintenanceType
            )
        ) {
            return req.reject(
                400,
                "Invalid maintenance type"
            );
        }

        const normalizedDescription =
            description.trim();

        if (!normalizedDescription) {
            return req.reject(
                400,
                "Maintenance description is required"
            );
        }

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const dueDate =
            new Date(
                `${nextDueDate}T00:00:00`
            );

        if (
            Number.isNaN(
                dueDate.getTime()
            ) ||
            dueDate < today
        ) {
            return req.reject(
                400,
                "Next due date cannot be in the past"
            );
        }

        const asset =
            await tx.run(
                SELECT.one
                    .from(Assets)
                    .where({
                        ID: assetID
                    })
            );

        if (!asset) {
            return req.reject(
                404,
                "Asset not found"
            );
        }

        if (
            asset.currentHolder_ID !==
            employeeID
        ) {
            return req.reject(
                403,
                "You can raise maintenance requests only for assets currently assigned to you"
            );
        }

        if (
            asset.status !== "ASSIGNED"
        ) {
            return req.reject(
                400,
                "Only an assigned asset can be sent for maintenance"
            );
        }

        if (serviceVendorID) {
            const serviceVendor =
                await tx.run(
                    SELECT.one
                        .from(Vendors)
                        .where({
                            ID:
                                serviceVendorID
                        })
                );

            if (!serviceVendor) {
                return req.reject(
                    404,
                    "Service vendor not found"
                );
            }
        }

        const existingOpenRequest =
            await tx.run(
                SELECT.one
                    .from(
                        MaintenanceRecords
                    )
                    .where({
                        asset_ID:
                            assetID,

                        status:
                            "OPEN"
                    })
            );

        if (existingOpenRequest) {
            return req.reject(
                409,
                "An open maintenance request already exists for this asset"
            );
        }

        const maintenanceRecordID =
            cds.utils.uuid();

        const reportedDate =
            today
                .toISOString()
                .slice(
                    0,
                    10
                );

        await tx.run(
            INSERT.into(
                MaintenanceRecords
            ).entries({
                ID:
                    maintenanceRecordID,

                asset_ID:
                    assetID,

                type:
                    maintenanceType,

                reportedBy_ID:
                    employeeID,

                serviceVendor_ID:
                    serviceVendorID ||
                    null,

                reportedDate:
                    reportedDate,

                status:
                    "OPEN",

                coveredByWarranty:
                    coveredByWarranty ===
                    true,

                nextDueDate:
                    nextDueDate,

                description:
                    normalizedDescription
            })
        );

        await tx.run(
            UPDATE(Assets)
                .set({
                    status:
                        "MAINTENANCE"
                })
                .where({
                    ID:
                        assetID
                })
        );

        return {
            maintenanceRecordID:
                maintenanceRecordID,

            assetID:
                assetID,

            status:
                "OPEN"
        };
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