/*using AssetManagementService as service from '../../srv/asset-service';
annotate service.Assets with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'assetTag',
                Value : assetTag,
            },
            {
                $Type : 'UI.DataField',
                Label : 'serialNumber',
                Value : serialNumber,
            },
            {
                $Type : 'UI.DataField',
                Label : 'model',
                Value : model,
            },
            {
                $Type : 'UI.DataField',
                Label : 'purchaseDate',
                Value : purchaseDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'purchaseCost',
                Value : purchaseCost,
            },
            {
                $Type : 'UI.DataField',
                Label : 'warrantyExpiry',
                Value : warrantyExpiry,
            },
            {
                $Type : 'UI.DataField',
                Label : 'firstDistributionDate',
                Value : firstDistributionDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'status',
                Value : status,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'assetTag',
            Value : assetTag,
        },
        {
            $Type : 'UI.DataField',
            Label : 'serialNumber',
            Value : serialNumber,
        },
        {
            $Type : 'UI.DataField',
            Label : 'model',
            Value : model,
        },
        {
            $Type : 'UI.DataField',
            Label : 'purchaseDate',
            Value : purchaseDate,
        },
        {
            $Type : 'UI.DataField',
            Label : 'purchaseCost',
            Value : purchaseCost,
        },
    ],
);

annotate service.Assets with {
    category @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'AssetCategories',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : category_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'lifespanMonths',
            },
        ],
    }
};

annotate service.Assets with {
    vendor @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Vendors',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : vendor_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email',
            },
        ],
    }
};

annotate service.Assets with {
    currentHolder @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : currentHolder_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'fullName',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'phone',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'location',
            },
        ],
    }
};*/


using AssetManagementService from '../../srv/asset-service';


/* =====================================================
   ASSET LIST REPORT AND OBJECT PAGE
===================================================== */

annotate AssetManagementService.Assets with @(
    UI.HeaderInfo : {
        TypeName       : 'Asset',
        TypeNamePlural : 'Assets',
        Title          : {
            Value : assetTag
        }
    },

    UI.Identification : [
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'AssetManagementService.AssignAsset',
            Label  : 'Assign Asset',
            ![@UI.Hidden] : hideAdminManagerActions
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'AssetManagementService.TransferAsset',
            Label  : 'Transfer Asset',
            ![@UI.Hidden] : hideAdminManagerActions
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'AssetManagementService.ReturnAsset',
            Label  : 'Return Asset',
            ![@UI.Hidden] : hideAdminManagerActions
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'AssetManagementService.SendForMaintenance',
            Label  : 'Send to Maintenance',
            ![@UI.Hidden] : hideEmployeeActions
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'AssetManagementService.CompleteMaintenance',
            Label  : 'Complete Maintenance',
            ![@UI.Hidden] : hideAdminManagerActions
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'AssetManagementService.RetireAsset',
            Label  : 'Retire Asset',
            ![@UI.Hidden] : hideAdminActions
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'AssetManagementService.ArchiveAsset',
            Label  : 'Archive Asset',
            ![@UI.Hidden] : hideAdminActions
        }
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Asset Tag',
            Value : assetTag
        },
        {
            $Type : 'UI.DataField',
            Label : 'Serial Number',
            Value : serialNumber
        },
        {
            $Type : 'UI.DataField',
            Label : 'Model',
            Value : model
        },
        {
            $Type : 'UI.DataField',
            Label : 'Purchase Date',
            Value : purchaseDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Purchase Cost',
            Value : purchaseCost
        },
        {
            $Type : 'UI.DataField',
            Label : 'Status',
            Value : status
        }
    ],

    UI.FieldGroup #GeneralInfo : {
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Asset Tag',
                Value : assetTag
            },
            {
                $Type : 'UI.DataField',
                Label : 'Serial Number',
                Value : serialNumber
            },
            {
                $Type : 'UI.DataField',
                Label : 'Model',
                Value : model
            },
            {
                $Type : 'UI.DataField',
                Label : 'Category',
                Value : category.name
            },
            {
                $Type : 'UI.DataField',
                Label : 'Vendor',
                Value : vendor.name
            },
            {
                $Type : 'UI.DataField',
                Label : 'Current Holder',
                Value : currentHolder.fullName
            },
            {
                $Type : 'UI.DataField',
                Label : 'Purchase Date',
                Value : purchaseDate
            },
            {
                $Type : 'UI.DataField',
                Label : 'Purchase Cost',
                Value : purchaseCost
            },
            {
                $Type : 'UI.DataField',
                Label : 'Warranty Expiry',
                Value : warrantyExpiry
            },
            {
                $Type       : 'UI.DataField',
                Label       : 'Warranty Status',
                Value       : warrantyStatus,
                Criticality : warrantyCriticality
            },
            {
                $Type : 'UI.DataField',
                Label : 'Status',
                Value : status,
                Criticality : assetStatusCriticality
            }
        ]
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneralInformationFacet',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#GeneralInfo'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'AssignmentRecordsFacet',
            Label  : 'Assignment Records',
            Target : 'assignments/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'MaintenanceRecordsFacet',
            Label  : 'Maintenance Records',
            Target : 'maintenanceRecords/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'OwnershipLedgerFacet',
            Label  : 'Ownership Ledger',
            Target : 'ownershipLedgers/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ArchiveRecordsFacet',
            Label  : 'Archive Records',
            Target : 'archiveRecords/@UI.LineItem'
        }
    ]
);


/* =====================================================
   ASSIGNMENT RECORDS
===================================================== */

annotate AssetManagementService.AssetAssignments with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Employee',
            Value : employee.fullName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Assigned By',
            Value : assignedBy.fullName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Assigned Date',
            Value : assignedDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Expected Return Date',
            Value : expectedReturnDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Actual Return Date',
            Value : actualReturnDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Assignment Status',
            Value : assignmentStatus
        },
        {
            $Type : 'UI.DataField',
            Label : 'Remarks',
            Value : remarks
        }
    ]
);


/* =====================================================
   MAINTENANCE RECORDS
===================================================== */

annotate AssetManagementService.MaintenanceRecords with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Type',
            Value : type
        },
        {
            $Type : 'UI.DataField',
            Label : 'Description',
            Value : description
        },
        {
            $Type : 'UI.DataField',
            Label : 'Reported By',
            Value : reportedBy.fullName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Service Vendor',
            Value : serviceVendor.name
        },
        {
            $Type : 'UI.DataField',
            Label : 'Reported Date',
            Value : reportedDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Completed Date',
            Value : completedDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Next Due Date',
            Value : nextDueDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Status',
            Value : status
        },
        {
            $Type : 'UI.DataField',
            Label : 'Outcome',
            Value : outcome
        },
        {
            $Type : 'UI.DataField',
            Label : 'Cost',
            Value : cost
        },
        {
            $Type : 'UI.DataField',
            Label : 'Covered By Warranty',
            Value : coveredByWarranty
        }
    ]
);


/* =====================================================
   OWNERSHIP LEDGER
===================================================== */

annotate AssetManagementService.OwnershipLedgers with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Action',
            Value : action
        },
        {
            $Type : 'UI.DataField',
            Label : 'From Employee',
            Value : fromEmployee.fullName
        },
        {
            $Type : 'UI.DataField',
            Label : 'To Employee',
            Value : toEmployee.fullName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Transition Date',
            Value : transitionDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Recorded By',
            Value : recordedBy.fullName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Notes',
            Value : notes
        }
    ]
);


/* =====================================================
   ARCHIVE RECORDS
===================================================== */

annotate AssetManagementService.ArchiveRecords with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Archived At',
            Value : archivedAt
        },
        {
            $Type : 'UI.DataField',
            Label : 'Archived By',
            Value : archivedBy.fullName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Reason',
            Value : reason
        },
        {
            $Type : 'UI.DataField',
            Label : 'Disposal Method',
            Value : disposalMethod
        },
        {
            $Type : 'UI.DataField',
            Label : 'Certificate Number',
            Value : disposalCertNo
        }
    ]
);


/* =====================================================
   DELETE RESTRICTION
===================================================== */

annotate AssetManagementService.Assets with @(
    Capabilities.DeleteRestrictions : {
        Deletable : false
    }
);