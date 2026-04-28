'use client';

/**
 * AppShell — Sidebar + Top Nav per spec.
 *
 * Adapted to this repo's stack (Next.js 14 app router + MUI 7 + js-cookie auth)
 * from a spec originally written for a Material Tailwind / Heroicons app.
 * Behaviour, tokens, and structure mirror the spec 1:1; only the rendering
 * primitives are MUI equivalents (Drawer, AppBar, List, Collapse, Menu, …).
 *
 * Wire-up:
 *   import { AppShell } from '@/components/AppShell';
 *   // wrap protected pages in <AppShell>{children}</AppShell>
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    AppBar,
    Avatar,
    Box,
    Collapse,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    GridView as Squares2X2Icon,
    People as UsersIcon,
    Shield as ShieldCheckIcon,
    VpnKey as KeyIcon,
    Settings as Cog6ToothIcon,
    AccountBalance as BuildingLibraryIcon,
    Menu as Bars3Icon,
    Close as XMarkIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    ExpandMore as ChevronDownIcon,
    LightMode as SunIcon,
    DarkMode as MoonIcon,
    Logout as ArrowRightStartOnRectangleIcon,
} from '@mui/icons-material';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme as useAppTheme } from '@/theme/ThemeProvider';
import { apiClient } from '@/lib/api';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type IconCmp = React.ComponentType<{ fontSize?: 'inherit' | 'small' | 'medium' | 'large' }>;

interface NavItem {
    label: string;
    path: string;
    resource: string;
    Icon: IconCmp;
}

interface NavSection {
    label: string;
    items: NavItem[];
}

interface SavedMenuItem {
    id: string;
    resource: string;
    label: string;
    path: string;
}

interface SavedMenuSection {
    id: string;
    label: string;
    items: SavedMenuItem[];
}

interface MenuOrderResponse {
    success?: boolean;
    data?: SavedMenuSection[];
}

// ────────────────────────────────────────────────────────────────────────────
// Static config — Default nav + icon map
// ────────────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, IconCmp> = {
    dashboard: Squares2X2Icon,
    users: UsersIcon,
    roles: ShieldCheckIcon,
    permissions: KeyIcon,
    settings: Cog6ToothIcon,
    stores: BuildingLibraryIcon,
};

const DEFAULT_SECTIONS: NavSection[] = [
    {
        label: 'Main',
        items: [
            { label: 'Dashboard', path: '/dashboard', resource: 'dashboard', Icon: Squares2X2Icon },
        ],
    },
    {
        label: 'Administration',
        items: [
            { label: 'Users', path: '/users', resource: 'users', Icon: UsersIcon },
            { label: 'Roles', path: '/roles', resource: 'roles', Icon: ShieldCheckIcon },
            { label: 'Permissions', path: '/permissions', resource: 'permissions', Icon: KeyIcon },
            { label: 'Settings', path: '/settings', resource: 'settings', Icon: Cog6ToothIcon },
        ],
    },
    {
        label: 'Master',
        items: [
            { label: 'Stores', path: '/stores', resource: 'stores', Icon: BuildingLibraryIcon },
        ],
    },
];

const SIDEBAR_W = 256;
const SIDEBAR_W_COLLAPSED = 64;
const NAV_H = 56;
const COLLAPSED_KEY = 'sidebar_collapsed';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function hasMenuAccess(permissions: string[] | undefined, resource: string): boolean {
    // Spec uses `{ type:"MENU", resource, action:"view" }`; this repo stores
    // permissions as flat string tokens, so we look for `MENU:<resource>:view`.
    if (!permissions || permissions.length === 0) return false;
    return permissions.includes(`MENU:${resource}:view`);
}

function buildNavFromSavedOrder(saved: SavedMenuSection[]): NavSection[] {
    return saved
        .map((sec) => ({
            // Section label mapping (spec §6).
            label: sec.label === 'Overview' ? 'Main' : sec.label,
            items: (sec.items ?? [])
                .map<NavItem | null>((it) => {
                    const Icon = ICON_MAP[it.resource];
                    if (!Icon) return null; // unknown resource — drop silently
                    return { label: it.label, path: it.path, resource: it.resource, Icon };
                })
                .filter((x): x is NavItem => x !== null),
        }))
        .filter((sec) => sec.items.length > 0);
}

function isPathActive(pathname: string, target: string): boolean {
    if (!target) return false;
    return pathname === target || pathname.startsWith(target + '/');
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const theme = useTheme();
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const { user, logout } = useAuth();
    const permissions = user?.permissions as string[] | undefined;
    const { mode, toggleTheme } = useAppTheme();

    // Collapse state — persisted in localStorage (desktop only).
    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(COLLAPSED_KEY);
            if (raw != null) setCollapsed(raw === 'true');
        } catch {
            /* noop */
        }
    }, []);
    const toggleCollapsed = useCallback(() => {
        setCollapsed((c) => {
            const next = !c;
            try {
                window.localStorage.setItem(COLLAPSED_KEY, String(next));
            } catch {
                /* noop */
            }
            return next;
        });
    }, []);

    // Mobile drawer.
    const [mobileOpen, setMobileOpen] = useState(false);

    // Saved menu order (null = not loaded yet / no saved order → use defaults).
    const [savedSections, setSavedSections] = useState<NavSection[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Endpoint may not exist yet — fail-soft and fall back to defaults.
                const resp = await apiClient.get<MenuOrderResponse>('/auth/menu-order');
                if (cancelled) return;
                if (resp?.success && Array.isArray(resp.data) && resp.data.length > 0) {
                    setSavedSections(buildNavFromSavedOrder(resp.data));
                }
            } catch {
                // 404 / 401 / network — silently fall back to defaults.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Build the final sections.
    // - With saved order → trust it (server only returns checked items).
    // - Without saved order → filter defaults by `hasMenuAccess`.
    const allSections: NavSection[] = useMemo(() => {
        if (savedSections) return savedSections;
        return DEFAULT_SECTIONS.map((sec) => ({
            label: sec.label,
            items: sec.items.filter((it) => hasMenuAccess(permissions, it.resource)),
        })).filter((sec) => sec.items.length > 0);
    }, [savedSections, permissions]);

    // Pinned dashboard — always at top, excluded from accordion sections.
    const dashboardItem: NavItem | null = useMemo(() => {
        for (const sec of allSections) {
            const hit = sec.items.find((it) => it.resource === 'dashboard');
            if (hit) return hit;
        }
        return null;
    }, [allSections]);

    const filteredSections: NavSection[] = useMemo(
        () =>
            allSections
                .map((sec) => ({
                    label: sec.label,
                    items: sec.items.filter((it) => it.resource !== 'dashboard'),
                }))
                .filter((sec) => sec.items.length > 0),
        [allSections],
    );

    // Exclusive accordion.
    const [openSection, setOpenSection] = useState<string | null>(null);
    // Auto-open the section containing the active route (only while none is open).
    useEffect(() => {
        if (openSection !== null) return;
        for (const sec of filteredSections) {
            if (sec.items.some((it) => isPathActive(pathname, it.path))) {
                setOpenSection(sec.label);
                return;
            }
        }
    }, [pathname, filteredSections, openSection]);

    // User menu.
    const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
    const openUserMenu = (e: React.MouseEvent<HTMLElement>) => setUserAnchor(e.currentTarget);
    const closeUserMenu = () => setUserAnchor(null);
    const onLogout = async () => {
        closeUserMenu();
        await logout();
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Sub-renderers
    // ──────────────────────────────────────────────────────────────────────────

    const navItemSx = (active: boolean, isCollapsed: boolean) => ({
        minHeight: 40,
        borderRadius: 1,
        mx: 1,
        my: 0.25,
        px: isCollapsed ? 1 : 2,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active
            ? (theme.palette.mode === 'dark' ? 'rgba(25,118,210,0.12)' : 'primary.50')
            : 'transparent',
        '&:hover': {
            bgcolor: active
                ? (theme.palette.mode === 'dark' ? 'rgba(25,118,210,0.18)' : 'primary.100')
                : 'action.hover',
        },
    });

    const renderNavItem = (item: NavItem, isCollapsed: boolean) => {
        const active = isPathActive(pathname, item.path);
        const button = (
            <ListItemButton
                key={item.path}
                onClick={() => {
                    router.push(item.path);
                    if (isMobile) setMobileOpen(false);
                }}
                sx={navItemSx(active, isCollapsed)}
                title={isCollapsed ? item.label : undefined}
            >
                <ListItemIcon
                    sx={{
                        minWidth: 0,
                        mr: isCollapsed ? 0 : 1.5,
                        color: 'primary.main',
                        justifyContent: 'center',
                    }}
                >
                    <item.Icon fontSize="small" />
                </ListItemIcon>
                {!isCollapsed && (
                    <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 500 }}
                    />
                )}
            </ListItemButton>
        );
        return isCollapsed ? (
            <Tooltip key={item.path} title={item.label} placement="right" arrow>
                {button}
            </Tooltip>
        ) : (
            button
        );
    };

    const renderSidebarContent = (isCollapsed: boolean) => (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                borderRight: 1,
                borderColor: 'divider',
                transition: theme.transitions.create(['width'], { duration: 200 }),
            }}
        >
            {/* Logo / header — h-14 */}
            <Box
                sx={{
                    height: NAV_H,
                    minHeight: NAV_H,
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Typography
                    component="span"
                    sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 0.5 }}
                >
                    {isCollapsed ? 'T' : 'TKG ERP'}
                </Typography>
                {/* Mobile close button */}
                <IconButton
                    size="small"
                    onClick={() => setMobileOpen(false)}
                    sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                    aria-label="Close menu"
                >
                    <XMarkIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Pinned dashboard */}
            <Box sx={{ pt: 1 }}>
                {dashboardItem && <List disablePadding>{renderNavItem(dashboardItem, isCollapsed)}</List>}
            </Box>

            {/* Sections */}
            <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
                {filteredSections.map((sec) => {
                    const isOpen = isCollapsed || openSection === sec.label;
                    return (
                        <Box key={sec.label} sx={{ mt: 1 }}>
                            {isCollapsed ? (
                                // Collapsed: bypass accordion, just spacer.
                                <Box sx={{ pt: 1.5 }} />
                            ) : (
                                <ListItemButton
                                    onClick={() =>
                                        setOpenSection((cur) => (cur === sec.label ? null : sec.label))
                                    }
                                    sx={{
                                        px: 2,
                                        py: 0.5,
                                        mx: 1,
                                        borderRadius: 1,
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <ListItemText
                                        primary={sec.label}
                                        primaryTypographyProps={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: 1,
                                            textTransform: 'uppercase',
                                            color: 'primary.main',
                                        }}
                                    />
                                    <ChevronDownIcon
                                        fontSize="small"
                                        sx={{
                                            color: 'primary.main',
                                            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                            transition: 'transform 200ms',
                                        }}
                                    />
                                </ListItemButton>
                            )}

                            {isCollapsed ? (
                                <List disablePadding>
                                    {sec.items.map((it) => renderNavItem(it, true))}
                                </List>
                            ) : (
                                <Collapse in={isOpen} timeout={200} unmountOnExit>
                                    <List disablePadding>
                                        {sec.items.map((it) => renderNavItem(it, false))}
                                    </List>
                                </Collapse>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Layout
    // ──────────────────────────────────────────────────────────────────────────

    const desktopWidth = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Desktop sidebar — fixed */}
            <Box
                component="aside"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    position: 'fixed',
                    inset: 0,
                    right: 'auto',
                    width: desktopWidth,
                    zIndex: theme.zIndex.drawer,
                    transition: theme.transitions.create(['width'], { duration: 200 }),
                }}
            >
                {renderSidebarContent(collapsed)}
            </Box>

            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { width: SIDEBAR_W, boxSizing: 'border-box' },
                }}
            >
                {renderSidebarContent(false)}
            </Drawer>

            {/* Main column (offset by sidebar on desktop) */}
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    ml: { xs: 0, md: `${desktopWidth}px` },
                    transition: theme.transitions.create(['margin'], { duration: 200 }),
                }}
            >
                {/* Top nav — sticky */}
                <AppBar
                    position="sticky"
                    color="default"
                    elevation={0}
                    sx={{
                        top: 0,
                        zIndex: 10,
                        bgcolor: 'background.paper',
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Toolbar sx={{ height: NAV_H, minHeight: NAV_H }}>
                        {/* Mobile hamburger */}
                        <IconButton
                            edge="start"
                            onClick={() => setMobileOpen(true)}
                            sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1 }}
                            aria-label="Open menu"
                        >
                            <Bars3Icon />
                        </IconButton>

                        {/* Desktop collapse toggle */}
                        <IconButton
                            onClick={toggleCollapsed}
                            sx={{ display: { xs: 'none', md: 'inline-flex' }, mr: 1 }}
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </IconButton>

                        <Box sx={{ flex: 1 }} />

                        {/* Theme toggle */}
                        <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
                            <IconButton onClick={toggleTheme} aria-label="Toggle theme">
                                {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
                            </IconButton>
                        </Tooltip>

                        {/* Username (sm+) */}
                        <Typography
                            variant="body2"
                            sx={{
                                display: { xs: 'none', sm: 'block' },
                                ml: 1.5,
                                color: 'text.primary',
                                fontWeight: 500,
                            }}
                        >
                            {user?.username ?? ''}
                        </Typography>

                        {/* Avatar menu */}
                        <IconButton onClick={openUserMenu} sx={{ ml: 1 }} aria-label="Account">
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'primary.main',
                                    fontSize: 14,
                                }}
                            >
                                {(user?.username ?? 'U').charAt(0).toUpperCase()}
                            </Avatar>
                        </IconButton>
                        <Menu
                            anchorEl={userAnchor}
                            open={Boolean(userAnchor)}
                            onClose={closeUserMenu}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            PaperProps={{ sx: { mt: 1, minWidth: 200 } }}
                        >
                            <MenuItem disabled sx={{ opacity: '1 !important' }}>
                                <Typography variant="body2" noWrap>
                                    {user?.username ?? 'Guest'}
                                </Typography>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
                                <ListItemIcon sx={{ color: 'error.main', minWidth: 32 }}>
                                    <ArrowRightStartOnRectangleIcon fontSize="small" />
                                </ListItemIcon>
                                Logout
                            </MenuItem>
                        </Menu>
                    </Toolbar>
                </AppBar>

                {/* Page content */}
                <Box component="main" sx={{ p: { xs: 1.5, md: 2 } }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
}

export default AppShell;
