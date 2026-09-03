import { Role } from "@/lib/constants";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // lucide icon name
  roles?: Role[];
  section?: string;
  badge?: "notifications";
};

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"] },
  { href: "/passes", label: "Gate Passes", icon: "KeyRound", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"] },
  { href: "/visitors", label: "Visitors", icon: "Users", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"] },
  { href: "/visitors/register", label: "Register Visitor", icon: "UserPlus", roles: ["SUPER_ADMIN", "SECURITY_OFFICER", "ESTATE_MANAGEMENT"] },
  { href: "/dispatch", label: "Dispatch Riders", icon: "Bike", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"] },
  { href: "/dispatch/register", label: "New Dispatch", icon: "Truck", roles: ["SUPER_ADMIN", "SECURITY_OFFICER", "ESTATE_MANAGEMENT"] },
  { href: "/residents", label: "Residents", icon: "Home", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"] },
  { href: "/vehicles", label: "Vehicles", icon: "Car", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"] },
  { href: "/access-logs", label: "Access Logs", icon: "ClipboardList", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER"] },
  { href: "/reports", label: "Reports", icon: "FileBarChart", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"] },
  { href: "/security-officers", label: "Security Officers", icon: "BadgeCheck", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT"] },
  { href: "/admin/users", label: "Users & Permissions", icon: "UserCog", roles: ["SUPER_ADMIN"] },
  { href: "/notifications", label: "Notifications", icon: "Bell", roles: ["SUPER_ADMIN", "ESTATE_MANAGEMENT", "SECURITY_OFFICER", "RESIDENT"], badge: "notifications" },
  { href: "/settings", label: "Estate Settings", icon: "Settings", roles: ["SUPER_ADMIN"] },
];

export const RESIDENT_NAV: NavItem[] = [
  { href: "/resident/dashboard", label: "My Home", icon: "LayoutDashboard" },
  { href: "/resident/visitors", label: "My Visitors", icon: "Users" },
  { href: "/resident/register-visitor", label: "Pre-register Visitor", icon: "UserPlus" },
  { href: "/resident/dispatch", label: "Dispatch Riders", icon: "Bike" },
  { href: "/resident/history", label: "History", icon: "History" },
  { href: "/resident/profile", label: "My Profile", icon: "User" },
  { href: "/notifications", label: "Notifications", icon: "Bell", badge: "notifications" },
];

export function navForRole(role: Role): NavItem[] {
  if (role === "RESIDENT") return RESIDENT_NAV;
  return NAV.filter((n) => !n.roles || n.roles.includes(role));
}
