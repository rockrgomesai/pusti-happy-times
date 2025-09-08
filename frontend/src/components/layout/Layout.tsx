'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  ExitToApp,
  Lock,
} from '@mui/icons-material';
import { useTheme as useCustomTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 280;
const NAVBAR_HEIGHT = 64;
const FOOTER_HEIGHT = 32; // 50% of navbar height

export function Layout({ children }: LayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleTheme } = useCustomTheme();
  const { user, logout } = useAuth();
  
  // Initialize sidebar state - starts closed to prevent hydration mismatch
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Set initial sidebar state after component mounts
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  const handleChangePassword = () => {
    handleMenuClose();
    // TODO: Open change password modal
    console.log('Change password clicked');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          height: NAVBAR_HEIGHT,
        }}
      >
        <Toolbar sx={{ height: NAVBAR_HEIGHT }}>
          {/* Hamburger Menu */}
          <Tooltip title={sidebarOpen ? "Hide sidebar" : "Show sidebar"} arrow>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              edge="start"
              onClick={handleSidebarToggle}
              sx={{ 
                mr: 2,
                padding: 1.5,
                borderRadius: 1,
                color: mode === 'dark' ? 'white' : 'black',
                backgroundColor: mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.05)',
                border: mode === 'dark' 
                  ? '1px solid rgba(255, 255, 255, 0.2)' 
                  : '1px solid rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  backgroundColor: mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.1)',
                  border: mode === 'dark' 
                    ? '1px solid rgba(255, 255, 255, 0.3)' 
                    : '1px solid rgba(0, 0, 0, 0.2)',
                },
                '&:focus': {
                  backgroundColor: mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <MenuIcon sx={{ 
                fontSize: '1.5rem', 
                color: mode === 'dark' ? 'white' : 'black' 
              }} />
            </IconButton>
          </Tooltip>

          {/* Logo */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              color: 'inherit',
              mr: 2,
              flexGrow: { xs: 1, md: 0 },
            }}
          >
            Pusti Happy Times
          </Typography>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />

          {/* Dark Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={mode === 'dark'}
                onChange={toggleTheme}
                icon={<Brightness7 />}
                checkedIcon={<Brightness4 />}
              />
            }
            label=""
            sx={{ mr: 1 }}
          />

          {/* User Avatar */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="user-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                fontSize: '0.875rem',
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>

          {/* User Menu */}
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
              },
            }}
          >
            {/* User Info */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.username}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.role?.role}
              </Typography>
            </Box>
            
            <Divider />
            
            {/* Menu Items */}
            <MenuItem onClick={handleChangePassword}>
              <Lock sx={{ mr: 1, fontSize: 20 }} />
              Change Password
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1, fontSize: 20 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, mt: `${NAVBAR_HEIGHT}px` }}>
        {/* Sidebar */}
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          anchor="left"
          open={sidebarOpen}
          onClose={handleSidebarToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            width: sidebarOpen ? DRAWER_WIDTH : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              top: NAVBAR_HEIGHT,
              height: `calc(100vh - ${NAVBAR_HEIGHT}px - ${FOOTER_HEIGHT}px)`,
              overflowY: 'auto',
              position: isMobile ? 'fixed' : 'relative',
              zIndex: theme.zIndex.drawer,
              border: 'none',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          <Sidebar onItemClick={() => isMobile && setSidebarOpen(false)} />
        </Drawer>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px - ${FOOTER_HEIGHT}px)`,
            transition: theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
            backgroundColor: theme.palette.background.default,
            maxWidth: '100%',
            overflow: 'hidden',
            // On mobile, add margin when drawer is open (temporary overlay)
            marginLeft: isMobile && sidebarOpen ? `${DRAWER_WIDTH}px` : 0,
          }}
        >
          <Box
            sx={{
              maxWidth: '100%',
              overflow: 'auto',
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
}
