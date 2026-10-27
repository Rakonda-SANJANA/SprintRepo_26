namespace sprintproj;

using { cuid, managed } from '@sap/cds/common';

/* =========================
   ENUMS
========================= */

type AssetStatus : String enum {
    AVAILABLE;
    ASSIGNED;
    MAINTENANCE;
    RETIRED;
    ARCHIVED;
};


type AssetRequestStatus : String enum {
    PENDING;
    APPROVED;
    REJECTED;
    FULFILLED;
};

type AssetRequestPriority : String enum {
    LOW;
    MEDIUM;
    HIGH;
};

type EmployeeStatus : String enum {
    ACTIVE;
    INACTIVE;
};

type AssignmentStatus : String enum {
    ASSIGNED;
    RETURNED;
    OVERDUE;
};

type MaintenanceType : String enum {
    PREVENTIVE;
    CORRECTIVE;
    REPAIR;
    UPGRADE;
};

type MaintenanceStatus : String enum {
    OPEN;
    IN_PROGRESS;
    COMPLETED;
};

type MaintenanceOutcome : String enum {
    RESOLVED;
    REPLACED;
    FAILED;
};

type LedgerAction : String enum {
    ASSIGN;
    TRANSFER;
    RETURN;
};

type ArchiveReason : String enum {
    END_OF_LIFE;
    DAMAGED;
    LOST;
    OBSOLETE;
};

type DisposalMethod : String enum {
    RECYCLE;
    DESTROY;
    SELL;
    DONATE;
};


/* =========================
   MASTER DATA
========================= */

entity Departments : cuid, managed {

    name        : String(80);

    costCenter  : String(20);

    employees   : Association to many Employees
                  on employees.department = $self;
}


entity Vendors : cuid, managed {

    name        : String(100);

    email       : String(100);
}


entity AssetCategories : cuid, managed {

    name            : String(50);

    lifespanMonths  : Integer;
}


entity Employees : cuid, managed {

    fullName    : String(100);

    email       : String(100);

    phone       : String(15);

    department  : Association to Departments;

    location    : String(100);

    status      : EmployeeStatus;
}


/* =========================
   ASSET MASTER
========================= */

entity Assets : cuid, managed {

    assetTag              : String(20) @assert.unique;

    serialNumber          : String(50) @assert.unique;

    category              : Association to AssetCategories;

    vendor                : Association to Vendors;

    model                 : String(100);

    purchaseDate          : Date;

    purchaseCost          : Decimal(10,2);

    warrantyExpiry        : Date;

    firstDistributionDate : Date;

    status                : AssetStatus;

    currentHolder         : Association to Employees;

    assignments           : Composition of many AssetAssignments
                            on assignments.asset = $self;

    maintenanceRecords    : Composition of many MaintenanceRecords
                            on maintenanceRecords.asset = $self;

    ownershipLedgers      : Composition of many OwnershipLedgers
                            on ownershipLedgers.asset = $self;

    archiveRecords        : Composition of many ArchiveRecords
                            on archiveRecords.asset = $self;
}




/* =========================
   ASSET REQUESTS
========================= */

entity AssetRequests : cuid, managed {

    requestedBy       : Association to Employees;

    category          : Association to AssetCategories;

    reason            : LargeString;

    priority          : AssetRequestPriority;

    requestedDate     : Date;

    status            : AssetRequestStatus;

    reviewedBy        : Association to Employees;

    reviewedAt        : Timestamp;

    managerRemarks    : LargeString;

    fulfilledAsset    : Association to Assets;
}

/* =========================
   ASSET ASSIGNMENT
========================= */

entity AssetAssignments : cuid, managed {

    asset              : Association to Assets;

    employee           : Association to Employees;

    assignedBy         : Association to Employees;

    assignedDate       : Timestamp;

    expectedReturnDate : Date;

    actualReturnDate   : Date;

    assignmentStatus   : AssignmentStatus;

    remarks            : LargeString;
}


/* =========================
   OWNERSHIP LEDGER
========================= */

entity OwnershipLedgers : cuid, managed {

    asset            : Association to Assets;

    fromEmployee     : Association to Employees;

    toEmployee       : Association to Employees;

    action           : LedgerAction;

    transitionDate   : Date;

    recordedBy       : Association to Employees;

    notes            : LargeString;
}


/* =========================
   MAINTENANCE
========================= */

entity MaintenanceRecords : cuid, managed {

    asset               : Association to Assets;

    type                : MaintenanceType;

    reportedBy          : Association to Employees;

    serviceVendor       : Association to Vendors;

    reportedDate        : Date;

    completedDate       : Date;

    status              : MaintenanceStatus;

    outcome             : MaintenanceOutcome;

    cost                : Decimal(10,2);

    coveredByWarranty   : Boolean default false;

    nextDueDate         : Date;

    description         : LargeString;
}


/* =========================
   ARCHIVE RECORD
========================= */

entity ArchiveRecords : cuid, managed {

    asset            : Association to Assets;

    archivedAt       : Timestamp;

    archivedBy       : Association to Employees;

    reason           : ArchiveReason;

    disposalMethod   : DisposalMethod;

    disposalCertNo   : String(40);
}