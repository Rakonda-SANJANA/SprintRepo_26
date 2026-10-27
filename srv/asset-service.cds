using { sprintproj as db } from '../db/schema';
@requires: [
    'Admin',
    'Manager',
    'Employee'
]
service AssetManagementService {

    entity Departments        as projection on db.Departments;
    entity Employees          as projection on db.Employees;
    entity Vendors            as projection on db.Vendors;
    entity AssetCategories    as projection on db.AssetCategories;

    entity Assets as projection on db.Assets
    {
    *,
    virtual null as warrantyStatus : String(20),
    virtual null as warrantyCriticality : Integer,
    virtual null as assetStatusCriticality : Integer,
    virtual null as hideAdminManagerActions : Boolean,
    virtual null as hideEmployeeActions : Boolean,
    virtual null as hideAdminActions : Boolean
}  actions {


        @requires: [
    'Admin',
    'Manager'
]
        action AssignAsset(
            employeeID : UUID,
            distributionDate : Date
        );


        @requires: [
    'Admin',
    'Manager'
]
        action TransferAsset(
            employeeID : UUID,
            transferDate : Date
        );


        @requires: [
    'Admin',
    'Manager'
]
        action ReturnAsset(
            returnDate : Date,
            remarks : String
        );


        @requires: [
    'Admin',
    'Manager',
    'Employee'
]
        action SendForMaintenance(
            maintenanceType : String,
            description       : String,
            serviceVendorID   : UUID,
            cost            : Decimal(10,2),
            coveredByWarranty  : Boolean,
            nextDueDate       : Date
        );


        @requires: [
    'Admin',
    'Manager'
]
        action CompleteMaintenance();

        @requires: 'Admin'
        action RetireAsset(
            reason : String
        );

        @requires: 'Admin'
        action ArchiveAsset(
            reason : String,
            disposalMethod : String,
            disposalCertNo : String
        );

    };

    entity AssetAssignments   as projection on db.AssetAssignments;
    entity OwnershipLedgers   as projection on db.OwnershipLedgers;
    entity MaintenanceRecords as projection on db.MaintenanceRecords;
    entity ArchiveRecords     as projection on db.ArchiveRecords;

    @requires: 'Admin'
function GetAdminDashboard() returns {
    totalAssets       : Integer;
    availableAssets   : Integer;
    assignedAssets    : Integer;
    maintenanceAssets : Integer;
    retiredAssets     : Integer;
    archivedAssets    : Integer;
    expiringWarranties : Integer;
};

@requires: [
    'Admin',
    'Manager'
]
function GetManagerDashboard() returns {
    totalAssignments    : Integer;
    activeAssignments   : Integer;
    returnedAssignments : Integer;
    totalTransfers      : Integer;
};

@requires: [
    'Admin',
    'Employee'
]
function GetEmployeeDashboard() returns {
    assignedAssets      : Integer;
    returnedAssets      : Integer;
    maintenanceRequests : Integer;
};
@requires: 'Admin'
function GetAssetStatusChart() returns array of {
    status : String;
    count  : Integer;
};
@requires: [
    'Admin',
    'Manager'
]
function GetAssignmentChart() returns array of {
    status : String;
    count  : Integer;
};
@requires: [
    'Admin',
    'Employee'
]
function GetMaintenanceStatusChart() returns array of {
    status : String;
    count  : Integer;
};
@requires: 'Admin'
function GetArchiveReasonChart() returns array of {
    reason : String;
    count  : Integer;
};
@requires: [
    'Admin',
    'Manager'
]
function GetAssetReport() returns array of {
    assetTag : String;
    serialNumber : String;
    model : String;
    status : String;
};
@requires: [
    'Admin',
    'Manager',
    'Employee'
]
function GetAssignmentReport() returns array of {
    employeeID : UUID;
    employeeName     : String;
    assignedByID     : UUID;
    assignedByName   : String;
    assignedDate : Timestamp;
    actualReturnDate : Date;
    assignmentStatus : String;
};

@requires: [
    'Admin',
    'Manager',
    'Employee'
]
function GetMaintenanceReport() returns array of {
    type : String;
    description       : String;
    reportedByID      : UUID;
    reportedByName    : String;
    serviceVendorID   : UUID;
    serviceVendorName : String;
    reportedDate : Date;
    completedDate : Date;
    nextDueDate       : Date;
    status : String;
    outcome : String;
    cost          : Decimal(10,2);
    coveredByWarranty : Boolean;
};
@requires: 'Admin'
function GetArchiveReport() returns array of {
    archivedAt : Timestamp;
    archivedByID     : UUID;
    archivedByName   : String;
    reason : String;
    disposalMethod : String;
    disposalCertNo   : String;
};


@requires: [
    'Admin',
    'Manager'
]
function GetTransferReport() returns array of {
    assetID         : UUID;
    assetTag        : String;
    fromEmployeeID  : UUID;
    fromEmployeeName: String;
    toEmployeeID    : UUID;
    toEmployeeName  : String;
    transitionDate  : Date;
    recordedByName  : String;
    notes           : String;
};


@requires: [
    'Admin',
    'Manager',
    'Employee'
]
function GetCurrentUser() returns {
    userID     : String;
    role       : String;
    employeeID : UUID;
    department : String;
};




@requires: 'Admin'
function ExportAssetReportPDF() returns LargeBinary;

@requires: 'Admin'
function ExportAssetReportExcel() returns LargeBinary;




}
