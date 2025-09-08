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
  Typography,
} from '@mui/material';
import {
  Dashboard,
  People,
  Business,
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

// Icon mapping for database icons - extend this as needed
const iconMap: Record<string, React.ComponentType> = {
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
  FaBox: Inventory,
};

// Transform database menu structure to frontend structure
const transformDatabaseMenuItems = (dbItems: unknown[]): MenuItem[] => {
  if (!Array.isArray(dbItems)) return [];
  
  return dbItems.map((item: Record<string, any>) => ({
    _id: item._id || item.id,
    label: item.label,
    href: item.href,
    icon: item.icon,
    mOrder: item.m_order || item.mOrder || 0,
    parentId: item.parent_id || item.parentId,
    isSubmenu: item.is_submenu || item.isSubmenu || false,
    isActive: true,
    children: item.children ? transformDatabaseMenuItems(item.children) : undefined
  }));
};

export function Sidebar({ onItemClick }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch from API
      const response = await apiClient.get('/api/menu-items/user-menu') as { success: boolean; data: unknown[] };
      if (response?.success && response?.data) {
        // Transform database structure to frontend structure
        const transformedItems = transformDatabaseMenuItems(response.data);
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
      // Toggle submenu
      setOpenItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item._id)) {
          newSet.delete(item._id);
        } else {
          newSet.add(item._id);
        }
        return newSet;
      });
    }
  };

  const isActive = (href: string | null) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderIcon = (iconName: string, isChild = false) => {
    const IconComponent = iconMap[iconName] || Dashboard;
    
    // Always render the actual icon, but make it smaller for child items
    return (
      <Box sx={{ fontSize: isChild ? '1.1rem' : '1.5rem', display: 'flex', alignItems: 'center' }}>
        <IconComponent />
      </Box>
    );
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openItems.has(item._id);
    const itemIsActive = isActive(item.href);

    return (
      <React.Fragment key={item._id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            selected={itemIsActive}
            sx={{
              minHeight: 48,
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
              {renderIcon(item.icon, isChild)}
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
      <Box sx={{ p: 2 }}>
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
      {/* Sidebar Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Navigation
        </Typography>
      </Box>

      <List sx={{ pt: 0 }}>
        {menuItems
          .filter(item => item.isActive)
          .sort((a, b) => a.mOrder - b.mOrder)
          .map(item => renderMenuItem(item))}
      </List>
    </Box>
  );
}
