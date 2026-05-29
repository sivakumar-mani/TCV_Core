export interface NavItem {
  label: string;
  icon?: string;
  route?: string;
  children?: NavItem[];
}

export interface NavSection {
  sectionLabel: string;
  items: NavItem[];
}

export interface StatCard {
  value: string;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
}

export interface UserRow {
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
}
