import { map } from "nanostores";

// Tenant access tracking store
export interface TenantAccessInfo {
  lastUpdated: number; // Timestamp of last filesystem update
  lastAccessTime: number; // Timestamp of last access (regardless of filesystem update)
  adminAccess: boolean; // Whether admin has accessed recently
  updateInProgress: boolean; // Flag to prevent concurrent updates
}

export const tenantAccessStore = map<Record<string, TenantAccessInfo>>({});

// Time between tenant access time updates (15 minutes)
export const TENANT_ACCESS_UPDATE_INTERVAL = 15 * 60 * 1000;

/**
 * Checks if tenant access time should be updated
 * @param tenantId - The ID of the tenant
 * @param isAdmin - Whether access is from an admin user
 * @returns Boolean indicating whether the access time should be updated
 */
export function shouldUpdateTenantAccess(tenantId: string, isAdmin: boolean): boolean {
  if (tenantId === "default") {
    return false;
  }

  const store = tenantAccessStore.get();
  const tenantInfo = store[tenantId];
  const now = Date.now();

  if (!tenantInfo) {
    tenantAccessStore.setKey(tenantId, {
      lastUpdated: now,
      lastAccessTime: now,
      adminAccess: isAdmin,
      updateInProgress: true,
    });
    return true;
  }

  tenantAccessStore.setKey(tenantId, {
    ...tenantInfo,
    lastAccessTime: now,
    adminAccess: isAdmin || tenantInfo.adminAccess,
  });

  if (tenantInfo.updateInProgress) {
    return false;
  }

  const timeSinceUpdate = now - tenantInfo.lastUpdated;

  if (timeSinceUpdate < TENANT_ACCESS_UPDATE_INTERVAL && !(isAdmin && !tenantInfo.adminAccess)) {
    return false;
  }

  tenantAccessStore.setKey(tenantId, {
    ...tenantAccessStore.get()[tenantId],
    updateInProgress: true,
  });

  return true;
}

/**
 * Marks tenant access update as complete
 * @param tenantId - The ID of the tenant
 * @param success - Whether the update was successful
 */
export function markTenantAccessUpdateComplete(tenantId: string, success: boolean): void {
  const store = tenantAccessStore.get();
  const tenantInfo = store[tenantId];

  if (!tenantInfo) return;

  tenantAccessStore.setKey(tenantId, {
    ...tenantInfo,
    lastUpdated: success ? Date.now() : tenantInfo.lastUpdated,
    updateInProgress: false,
    adminAccess: false,
  });
}
