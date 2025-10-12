const mongoose = require("mongoose");
const { Role } = require("../models");
const { ApiPermission } = require("../models/Permission");
const { RoleApiPermission } = require("../models/JunctionTables");

const PERMISSION_MATRIX = [
  {
    code: "distributors:read",
    roles: ["SuperAdmin", "SalesAdmin", "Distributor"],
  },
  {
    code: "distributors:create",
    roles: ["SuperAdmin", "SalesAdmin"],
  },
  {
    code: "distributors:update",
    roles: ["SuperAdmin", "SalesAdmin"],
  },
  {
    code: "distributors:delete",
    roles: ["SuperAdmin"],
  },
];

let bootstrapPromise = null;

const ensureRoleMap = async () => {
  const roleNames = Array.from(
    new Set(PERMISSION_MATRIX.flatMap((entry) => entry.roles))
  );

  const roles = await Role.find({ role: { $in: roleNames } })
    .select({ role: 1 })
    .lean();

  return roles.reduce((map, roleDoc) => {
    map.set(roleDoc.role, roleDoc);
    return map;
  }, new Map());
};

const ensurePermissionDocument = async (code) => {
  return ApiPermission.findOneAndUpdate(
    { api_permissions: code },
    { $setOnInsert: { api_permissions: code } },
    { new: true, upsert: true }
  );
};

const ensureRolePermissionLink = async (roleId, permissionId) => {
  const existingLink = await RoleApiPermission.findOne({
    role_id: roleId,
    api_permission_id: permissionId,
  }).lean();

  if (existingLink) {
    return false;
  }

  await RoleApiPermission.create({
    role_id: roleId,
    api_permission_id: permissionId,
  });

  return true;
};

const runBootstrap = async () => {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      const roleMap = await ensureRoleMap();

      for (const { code, roles } of PERMISSION_MATRIX) {
        const permission = await ensurePermissionDocument(code);

        for (const roleName of roles) {
          const roleDoc = roleMap.get(roleName);
          if (!roleDoc) {
            continue;
          }

          await ensureRolePermissionLink(roleDoc._id, permission._id);
        }
      }
    } catch (error) {
      console.error("Distributor permission bootstrap failed:", error);
      throw error;
    }
  })();

  try {
    await bootstrapPromise;
  } catch (error) {
    bootstrapPromise = null;
    throw error;
  }

  return bootstrapPromise;
};

const scheduleDistributorPermissionBootstrap = () => {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  if (mongoose.connection.readyState === 1) {
    return runBootstrap();
  }

  mongoose.connection.once("connected", () => {
    runBootstrap().catch((error) => {
      console.error("Failed to initialize distributor permissions after connection:", error);
    });
  });

  return null;
};

module.exports = {
  scheduleDistributorPermissionBootstrap,
};
