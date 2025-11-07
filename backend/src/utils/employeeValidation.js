/**
 * Employee Validation Utilities
 *
 * Validates employee assignments based on their role requirements
 */

const mongoose = require("mongoose");

/**
 * Validate employee assignments based on role
 * @param {Object} employee - Employee document
 * @param {Object} role - Role document
 * @param {Object} Facility - Facility model
 * @returns {Object} { valid: boolean, error: string|null, warnings: string[] }
 */
async function validateEmployeeRoleAssignments(employee, role, Facility) {
  const warnings = [];

  if (!role) {
    return { valid: false, error: "Role not found", warnings };
  }

  const roleName = role.role;

  // Inventory Factory role validation
  if (roleName === "Inventory Factory") {
    // Must have facility_id pointing to a Factory
    if (!employee.facility_id) {
      return {
        valid: false,
        error: "Inventory Factory users must have a facility_id assigned",
        warnings,
      };
    }

    // Must have factory_store_id pointing to a Depot
    if (!employee.factory_store_id) {
      return {
        valid: false,
        error: "Inventory Factory users must have a factory_store_id (Depot) assigned",
        warnings,
      };
    }

    // Validate facility_id is a Factory
    const facility = await Facility.findById(employee.facility_id).lean();
    if (!facility) {
      return {
        valid: false,
        error: "facility_id references a non-existent facility",
        warnings,
      };
    }
    if (facility.type !== "Factory") {
      return {
        valid: false,
        error: `Inventory Factory users must have facility_id pointing to a Factory (current: ${facility.type})`,
        warnings,
      };
    }

    // Validate factory_store_id is a Depot
    const factoryStore = await Facility.findById(employee.factory_store_id).lean();
    if (!factoryStore) {
      return {
        valid: false,
        error: "factory_store_id references a non-existent facility",
        warnings,
      };
    }
    if (factoryStore.type !== "Depot") {
      return {
        valid: false,
        error: `Inventory Factory users must have factory_store_id pointing to a Depot (current: ${factoryStore.type})`,
        warnings,
      };
    }
  }

  // Production role validation
  if (roleName === "Production") {
    if (!employee.facility_id) {
      return {
        valid: false,
        error: "Production users must have a facility_id assigned",
        warnings,
      };
    }

    const facility = await Facility.findById(employee.facility_id).lean();
    if (!facility) {
      return {
        valid: false,
        error: "facility_id references a non-existent facility",
        warnings,
      };
    }

    if (facility.type !== "Factory") {
      return {
        valid: false,
        error: `Production users must have facility_id pointing to a Factory (current: ${facility.type})`,
        warnings,
      };
    }

    if (!employee.factory_store_id) {
      warnings.push(
        "Production users should have a factory_store_id (Depot) assigned for sending products to store"
      );
    }
  }

  // Inventory Depot role validation
  if (roleName === "Inventory Depot") {
    if (!employee.facility_id) {
      return {
        valid: false,
        error: "Inventory Depot users must have a facility_id assigned",
        warnings,
      };
    }

    const facility = await Facility.findById(employee.facility_id).lean();
    if (!facility) {
      return {
        valid: false,
        error: "facility_id references a non-existent facility",
        warnings,
      };
    }

    if (facility.type !== "Depot") {
      return {
        valid: false,
        error: `Inventory Depot users must have facility_id pointing to a Depot (current: ${facility.type})`,
        warnings,
      };
    }
  }

  return { valid: true, error: null, warnings };
}

/**
 * Get suggested facility assignments for a role
 * @param {string} roleName - Role name
 * @param {Object} Facility - Facility model
 * @returns {Object} { facilityType: string, needsFactoryStore: boolean, suggestions: string }
 */
async function getSuggestedAssignments(roleName, Facility) {
  const suggestions = {
    facilityType: null,
    needsFactoryStore: false,
    description: "",
  };

  switch (roleName) {
    case "Inventory Factory":
      suggestions.facilityType = "Factory";
      suggestions.needsFactoryStore = true;
      suggestions.description = "Requires: facility_id (Factory) + factory_store_id (Depot)";

      const factories = await Facility.find({ type: "Factory", active: true })
        .select("name")
        .lean();
      const depots = await Facility.find({ type: "Depot", active: true }).select("name").lean();

      if (factories.length > 0 && depots.length > 0) {
        suggestions.availableFactories = factories;
        suggestions.availableDepots = depots;
      }
      break;

    case "Production":
      suggestions.facilityType = "Factory";
      suggestions.needsFactoryStore = true;
      suggestions.description =
        "Requires: facility_id (Factory), recommended: factory_store_id (Depot)";
      break;

    case "Inventory Depot":
      suggestions.facilityType = "Depot";
      suggestions.needsFactoryStore = false;
      suggestions.description = "Requires: facility_id (Depot)";
      break;

    default:
      suggestions.description = "No specific facility requirements";
  }

  return suggestions;
}

module.exports = {
  validateEmployeeRoleAssignments,
  getSuggestedAssignments,
};
