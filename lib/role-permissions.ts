// Define role-based permissions for navigation items
export const rolePermissions = {
  // Executive Director has access to all menus except Admin
  "executive director": [
    "overview",
    "projects",
    "staff",
    "donations",
    "finance",
    "beneficiaries",
    "programs",
    "resources",
    "partners",
    "grants",
    "files",
  ],
  
  // Finance Lead has access to all menus except Admin
  "finance lead": [
    "overview",
    "projects",
    "staff",
    "donations",
    "finance",
    "beneficiaries",
    "partners",
    "programs",
    "resources",
    "grants",
    "files",
  ],
  
  // Programs Lead has access to specific menus
  "programs lead": [
    "overview",
    "projects",
    "staff",
    "files",
    "donations",
    "finance",
    "beneficiaries",
    "partners",
    "programs",
    "resources",
  ],
  
  // Project Officer has access to all menus except Admin
  "project officer": [
    "overview",
    "projects",
    "staff",
    "files",
    "donations",
    "beneficiaries",
    "partners",
    "programs",
    "resources",
  ],
  
  // Office Assistant has access to all menus except Admin
  "office assistant": [
    "overview",
    "projects",
    "staff",
    "beneficiaries",
    "programs",
    "resources",
    "partners",
    "files",
  ],
  
  // System Admin has access to everything including admin features
  "system admin": [
    "overview",
    "projects",
    "staff",
    "donations",
    "finance",
    "beneficiaries",
    "programs",
    "resources",
    "partners",
    "grants",
    "reports",
    "files",
    "admin",
  ],
  
  // Board Member has access to all menus except Admin
  "board": [
    "overview",
    "projects",
    "staff",
    "donations",
    "finance",
    "beneficiaries",
    "programs",
    "resources",
    "partners",
    "grants",
    "reports",
    "files",
  ],
  
  // Default access for other roles
  "default": [
    "overview",
    "projects",
    "staff",
    "donations",
    "finance",
    "beneficiaries",
    "programs",
    "resources",
    "partners",
    "grants",
    "reports",
    "files",
  ]
};

// Define route to tab mapping
export const routeToTabMapping: Record<string, string> = {
  "/": "overview",
  "/executive-director": "overview",
  "/finance-lead": "overview",
  "/programs-lead": "overview",
  "/project-officer": "overview",
  "/office-assistant": "overview",
  "/board": "overview",
  "/projects": "projects",
  "/staff": "staff",
  "/donations": "donations",
  "/finance": "finance",
  "/beneficiaries": "beneficiaries",
  "/programs": "programs",
  "/resources": "resources",
  "/partners": "partners",
  "/grants": "grants",
  "/reports": "reports",
  "/files": "files",
  "/system-admin": "admin",
  "/admin": "admin",
};

// Special routes that don't map to navigation tabs but still need protection
const specialRoutes: Record<string, string[]> = {
  "/dashboard": ["overview"],
  "/unauthorized": ["overview"],
  "/login": ["overview"],
};

// Get allowed tabs for a specific role
export function getAllowedTabs(role: string): string[] {
  const normalizedRole = role.toLowerCase();
  return rolePermissions[normalizedRole as keyof typeof rolePermissions] || rolePermissions.default;
}

// Check if a role has access to a specific tab
export function hasAccessToTab(role: string, tab: string): boolean {
  const allowedTabs = getAllowedTabs(role);
  return allowedTabs.includes(tab);
}

// Check if a role has access to a specific route (simplified for Edge Runtime)
export function hasAccessToRoute(role: string, route: string): boolean {
  // Handle special routes
  if (specialRoutes[route]) {
    return specialRoutes[route].some(tab => hasAccessToTab(role, tab));
  }
  
  // Check direct route to tab mapping
  const tab = routeToTabMapping[route];
  if (tab) {
    return hasAccessToTab(role, tab);
  }
  
  // Handle dynamic routes by checking prefixes
  const routePrefix = route.split('/')[1];
  const prefixTab = routeToTabMapping[`/${routePrefix}`];
  if (prefixTab) {
    return hasAccessToTab(role, prefixTab);
  }
  
  // Default to overview access
  return hasAccessToTab(role, "overview");
}