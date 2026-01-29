
import React, { createContext, useContext } from 'react';
import { AppSection, PermissionLevel, SectionPermissions, DEFAULT_ROLE_PERMISSIONS, UserRole } from '../types.ts';

// Permission Context for app-wide access
interface PermissionContextValue {
    permissions: SectionPermissions;
    canView: (section: AppSection) => boolean;
    canEdit: (section: AppSection) => boolean;
}

const defaultPermissions = DEFAULT_ROLE_PERMISSIONS.VIEWER;

const PermissionContext = createContext<PermissionContextValue>({
    permissions: defaultPermissions,
    canView: () => false,
    canEdit: () => false,
});

export const usePermissions = () => useContext(PermissionContext);

interface PermissionProviderProps {
    role: UserRole;
    customPermissions?: SectionPermissions;
    children: React.ReactNode;
}

// Provider to wrap the app and provide permission context
export const PermissionProvider: React.FC<PermissionProviderProps> = ({
    role,
    customPermissions,
    children
}) => {
    // Use custom permissions if provided, otherwise fall back to built-in role defaults
    const permissions = customPermissions || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.VIEWER;

    const canView = (section: AppSection): boolean => {
        const level = permissions[section];
        return level === 'view' || level === 'edit';
    };

    const canEdit = (section: AppSection): boolean => {
        return permissions[section] === 'edit';
    };

    return (
        <PermissionContext.Provider value={{ permissions, canView, canEdit }}>
            {children}
        </PermissionContext.Provider>
    );
};

// Guard component for conditional rendering based on permissions
interface PermissionGuardProps {
    section: AppSection;
    requiredLevel?: 'view' | 'edit';
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    section,
    requiredLevel = 'view',
    children,
    fallback = null
}) => {
    const { permissions } = usePermissions();
    const userLevel = permissions[section];

    // No access at all
    if (userLevel === 'none') {
        return <>{fallback}</>;
    }

    // Need edit but only have view
    if (requiredLevel === 'edit' && userLevel === 'view') {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

// Hook to check a specific section's permission level
export const useSectionPermission = (section: AppSection): PermissionLevel => {
    const { permissions } = usePermissions();
    return permissions[section];
};

// Hook to check if user can perform edit action on a section
export const useCanEdit = (section: AppSection): boolean => {
    const { canEdit } = usePermissions();
    return canEdit(section);
};

// Hook to check if user can view a section
export const useCanView = (section: AppSection): boolean => {
    const { canView } = usePermissions();
    return canView(section);
};

export default PermissionGuard;
