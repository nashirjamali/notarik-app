/** The menu, in the same order as the mobile app: Home, Transactions, Add, Chat, Settings. */
export type NavItem = {
  href: string;
  label: string;
  /** Mobile artwork in public/app-assets/svg: drawn white-on-circle when active, grey otherwise. */
  active: string;
  inactive: string;
  /** The raised "+" in the middle. */
  add?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/app", label: "Home", active: "nav-home-active_26a5", inactive: "nav-home-inactive_d13a" },
  { href: "/app/transactions", label: "Transactions", active: "nav-transactions-active_6b2f", inactive: "nav-transactions-inactive_9f4d" },
  { href: "/app/transactions/new", label: "Add", active: "nav-plus-button_a419", inactive: "nav-plus-button_a419", add: true },
  { href: "/app/chat", label: "Chat", active: "nav-chat-active_46a5", inactive: "nav-chat-inactive_5c78" },
  { href: "/app/settings", label: "Settings", active: "nav-settings-active_8816", inactive: "nav-settings-inactive_4cb0" },
];

export const svg = (name: string) => `/app-assets/svg/${name}.svg`;

export function isActive(pathname: string, item: NavItem) {
  if (item.href === "/app") return pathname === "/app";
  if (item.add) return pathname === item.href;
  // "Add" has its own tab, so a new expense does not light up Transactions.
  if (item.href === "/app/transactions" && pathname === "/app/transactions/new") return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The wide layout's sidebar (Figma "Web app / Home / Desktop 1440"): the menu there is not the phone's pill. */
export type SidebarItem = { href: string; label: string; icon: string };

export const sidebarItems: SidebarItem[] = [
  { href: "/app", label: "Home", icon: "icon-home" },
  { href: "/app/transactions", label: "Transactions", icon: "icon-receipt" },
  { href: "/app/recap", label: "Recap & Budget", icon: "icon-pie" },
  { href: "/app/chat", label: "Ask Notarik", icon: "icon-chat" },
  { href: "/app/settings", label: "Settings", icon: "icon-settings" },
];

export const addExpenseHref = "/app/transactions/new";

export function isSidebarActive(pathname: string, item: SidebarItem) {
  if (item.href === "/app") return pathname === "/app";
  // The recap's budget editor is part of "Recap & Budget".
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
