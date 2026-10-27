const cds = require("@sap/cds");

const users = {
    admin: {
        id: "admin",
        roles: {
            Admin: 1
        },
        attr: {
            employeeID:
                "33333333-3333-3333-3333-333333333333"
        }
    },

    manager: {
        id: "manager",
        roles: {
            Manager: 1
        },
        attr: {
            department: "IT",
            employeeID:
                "44444444-4444-4444-4444-444444444444"
        }
    },

    employee: {
        id: "employee",
        roles: {
            Employee: 1
        },
        attr: {
            employeeID:
                "11111111-1111-1111-1111-111111111111"
        }
    }
};

function readCookie(request, cookieName) {
    const cookieHeader =
        request.headers.cookie || "";

    const cookies =
        cookieHeader.split(";");

    for (const cookie of cookies) {
        const separatorIndex =
            cookie.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const name =
            cookie
                .slice(0, separatorIndex)
                .trim();

        const value =
            cookie
                .slice(separatorIndex + 1)
                .trim();

        if (name === cookieName) {
            return decodeURIComponent(value);
        }
    }

    return null;
}

module.exports = function (
    request,
    response,
    next
) {
    const selectedRole =
        readCookie(
            request,
            "assetManagementRole"
        ) || "admin";

    const userDefinition =
        users[selectedRole] ||
        users.admin;

    request.user =
    new cds.User(userDefinition);

    next();
};