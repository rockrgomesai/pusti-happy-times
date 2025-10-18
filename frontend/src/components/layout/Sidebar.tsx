'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Skeleton,
} from '@mui/material';
import {
  Dashboard,
  People,
  Business,
  Factory as FactoryIcon,
  Settings,
  ExpandLess,
  ExpandMore,
  AdminPanelSettings,
  VpnKey,
  Storage,
  LocalOffer,
  Person,
  Lock,
  Inventory,
  BookmarkBorder,
  Layers,
  LocalShipping,
  Badge as BadgeIcon,
  Warehouse as WarehouseIcon,
  ReceiptLong,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface MenuItem {
  _id: string;
  label: string;
  href: string | null;
  icon: string;
  mOrder: number;
  parentId: string | null;
  isSubmenu: boolean;
  isActive: boolean;
  children?: MenuItem[];
}

interface SidebarProps {
  onItemClick?: () => void;
}

interface RawMenuItem {
  _id?: string;
  id?: string;
  label?: string;
  href?: string | null;
  icon?: string;
  m_order?: number;
  mOrder?: number;
  parent_id?: string | null;
  parentId?: string | null;
  is_submenu?: boolean;
  isSubmenu?: boolean;
  isActive?: boolean;
  children?: RawMenuItem[];
}

interface MenuApiResponse {
  success?: boolean;
  data?: RawMenuItem[] | null;
}

// Icon mapping for database icons - extend this as needed
const iconMap: Record<string, typeof Dashboard> = {
  // Frontend mock icons
  dashboard: Dashboard,
  people: People,
  business: Business,
  settings: Settings,
  // Database icons (FontAwesome names mapped to Material-UI)
  FaRectangleList: Dashboard,
  FaCrown: AdminPanelSettings,
  FaUsers: People,
  FaUser: Person,
  FaKey: VpnKey,
  FaLock: Lock,
  FaDatabase: Storage,
  FaTag: LocalOffer,
  FaTags: LocalOffer,
  FaOffers: LocalOffer,
  FaDemandOrders: Inventory,
  FaDO: ReceiptLong,
  FaBox: Inventory,
  FaUserTag: BookmarkBorder, // User tagging/roles icon
  FaLayerGroup: Layers,
  FaTruck: LocalShipping, // Transport/shipping icon
  FaFactory: FactoryIcon,
  FaPeople: People, // HR/People management icon
  FaUserTie: AdminPanelSettings, // Designations/Titles icon
  FaIdBadge: BadgeIcon,
  FaAddressCard: BadgeIcon,
  FaWarehouse: WarehouseIcon,
};

// Transform database menu structure to frontend structure
const transformDatabaseMenuItems = (dbItems: RawMenuItem[] | null | undefined): MenuItem[] => {
  if (!Array.isArray(dbItems)) {
    return [];
  }

  return dbItems.reduce<MenuItem[]>((acc, item) => {
    const id = item._id ?? item.id;
    const label = item.label;
    if (!id || !label) {
      return acc;
    }

    const children = transformDatabaseMenuItems(item.children);

    acc.push({
      _id: id,
      label,
      href: item.href ?? null,
      icon: item.icon ?? 'dashboard',
      mOrder: item.m_order ?? item.mOrder ?? 0,
      parentId: item.parent_id ?? item.parentId ?? null,
      isSubmenu: item.is_submenu ?? item.isSubmenu ?? false,
      isActive: item.isActive ?? true,
      children: children.length > 0 ? children : undefined,
    });

    return acc;
  }, []);
};

export function Sidebar({ onItemClick }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch from API
      const response = await apiClient.get<MenuApiResponse>('/menu-items/user-menu');
      if (response?.success && Array.isArray(response.data)) {
        // Transform database structure to frontend structure
        const rawItems = response.data as RawMenuItem[];
        const transformedItems = transformDatabaseMenuItems(rawItems);
        setMenuItems(transformedItems);
      } else {
        console.error('Failed to fetch menu items: Invalid response format');
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const handleItemClick = (item: MenuItem) => {
    if (item.href) {
      // Navigate to the route
      router.push(item.href);
      onItemClick?.();
    } else if (item.children) {
      // Toggle submenu - only one can be open at a time
      setOpenItem(prev => {
        // If clicking the same item, close it; otherwise open the new one
        return prev === item._id ? null : item._id;
      });
    }
  };

  const isActive = (href: string | null) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderIcon = (iconName: string, isChild = false, label?: string) => {
    const normalizedIconName = iconName?.toLowerCase?.() ?? '';
    const normalizedLabel = label?.toLowerCase?.() ?? '';

    let IconComponent = iconMap[iconName] || Dashboard;

    if (
      normalizedIconName.includes('depot') ||
      normalizedIconName.includes('warehouse') ||
      normalizedLabel.includes('depot')
    ) {
      IconComponent = WarehouseIcon;
    }
    
    // Always render the actual icon, but make it smaller for child items
    return (
      <Box sx={{ fontSize: isChild ? '1.1rem' : '1.5rem', display: 'flex', alignItems: 'center' }}>
        <IconComponent />
      </Box>
    );
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openItem === item._id;
    const itemIsActive = isActive(item.href);

    return (
      <React.Fragment key={item._id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            selected={itemIsActive}
            sx={{
              minHeight: 32,
              px: 2.5,
              pl: isChild ? 4 : 2.5,
              py: 1,
              mx: 1,
              my: 0.5,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
              '&:hover:not(.Mui-selected)': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 2,
                justifyContent: 'center',
              }}
            >
              {renderIcon(item.icon, isChild, item.label)}
            </ListItemIcon>
            
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: isChild ? '0.875rem' : '1rem',
                fontWeight: itemIsActive ? 600 : 400,
              }}
            />
            
            {hasChildren && (
              isOpen ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>

        {/* Render children */}
        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderMenuItem(child, true))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 1 }}> {/* Reduced padding from 2 to 1 */}
        {[...Array(5)].map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={48}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        height: '100%', 
        overflow: 'auto',
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <List sx={{ pt: 0, pb: 0 }}> {/* Removed bottom padding */}
        {menuItems
          .filter(item => item.isActive)
          .sort((a, b) => a.mOrder - b.mOrder)
          .map(item => renderMenuItem(item))}
      </List>
    </Box>
  );
}
