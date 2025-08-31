import type { User, UserRole } from '@/types';

export interface PermissionConfig {
  canManageUsers: boolean;
  canToggleRegistration: boolean;
  canAccessBackups: boolean;
  canViewAllData: boolean;
  canDeleteUsers: boolean;
  canChangeRoles: boolean;
}

export function getUserPermissions(role: UserRole): PermissionConfig {
  switch (role) {
    case 'administrator':
      return {
        canManageUsers: true,
        canToggleRegistration: true,
        canAccessBackups: true,
        canViewAllData: true,
        canDeleteUsers: true,
        canChangeRoles: true,
      };
    case 'user':
      return {
        canManageUsers: false,
        canToggleRegistration: false,
        canAccessBackups: false,
        canViewAllData: true,
        canDeleteUsers: false,
        canChangeRoles: false,
      };
    case 'guest':
      return {
        canManageUsers: false,
        canToggleRegistration: false,
        canAccessBackups: false,
        canViewAllData: false,
        canDeleteUsers: false,
        canChangeRoles: false,
      };
    default:
      return {
        canManageUsers: false,
        canToggleRegistration: false,
        canAccessBackups: false,
        canViewAllData: false,
        canDeleteUsers: false,
        canChangeRoles: false,
      };
  }
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'administrator';
}

export function canManageUsers(user: User | null): boolean {
  if (!user) return false;
  return getUserPermissions(user.role).canManageUsers;
}

export function canToggleRegistration(user: User | null): boolean {
  if (!user) return false;
  return getUserPermissions(user.role).canToggleRegistration;
}

export function canAccessBackups(user: User | null): boolean {
  if (!user) return false;
  return getUserPermissions(user.role).canAccessBackups;
}

export function canChangeRoles(user: User | null): boolean {
  if (!user) return false;
  return getUserPermissions(user.role).canChangeRoles;
}

export function canDeleteUser(currentUser: User | null, targetUser: User): boolean {
  if (!currentUser || !canManageUsers(currentUser)) return false;
  
  // Users cannot delete themselves
  if (currentUser.id === targetUser.id) return false;
  
  // Only admins can delete users
  return currentUser.role === 'administrator';
}

export function canChangeUserRole(currentUser: User | null, targetUser: User): boolean {
  if (!currentUser || !canChangeRoles(currentUser)) return false;
  
  // Users cannot change their own role
  if (currentUser.id === targetUser.id) return false;
  
  // Only admins can change roles
  return currentUser.role === 'administrator';
}

export class PermissionError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'PermissionError';
  }
}

export function requireAdmin(user: User | null): void {
  if (!user || !isAdmin(user)) {
    throw new PermissionError('Administrator access required');
  }
}

export function requirePermission(user: User | null, permission: keyof PermissionConfig): void {
  if (!user) {
    throw new PermissionError('Authentication required');
  }
  
  const permissions = getUserPermissions(user.role);
  if (!permissions[permission]) {
    throw new PermissionError(`Permission denied: ${permission}`);
  }
}