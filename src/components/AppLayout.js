import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Box,
  Drawer, List, ListItem, ListItemText, ListItemIcon, Divider,
  CssBaseline, Avatar, Menu, MenuItem, useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard, Logout, Store, Inventory, Group
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';

const drawerWidth = 220;

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['admin'] },
  { label: 'Inventory', icon: <Inventory />, path: '/inventory', roles: ['admin'] },
  { label: 'Users', icon: <Group />, path: '/users', roles: ['admin'] },
  { label: 'Billing', icon: <Store />, path: '/billing', roles: ['admin', 'staff'] },
];

function AppLayout({ user }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Retail Manager
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems
          .filter(item => item.roles.includes(user?.role))
          .map(item => (
            <ListItem
              button
              key={item.label}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Top App Bar */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center">
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap>
              Retail Management System
            </Typography>
          </Box>

          {/* Profile Menu */}
          <IconButton onClick={(e) => setMenuAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={() => setMenuAnchorEl(null)}
          >
            <MenuItem disabled>{user?.email}</MenuItem>
            <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Desktop Sidebar - Collapsed by default */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerOpen ? drawerWidth : 60,
          flexShrink: 0,
          display: { xs: 'none', sm: 'block' },
          [`& .MuiDrawer-paper`]: {
            width: drawerOpen ? drawerWidth : 60,
            boxSizing: 'border-box',
            transition: 'width 0.3s',
            overflowX: 'hidden'
          }
        }}
        open
        onMouseEnter={() => setDrawerOpen(true)}
        onMouseLeave={() => setDrawerOpen(false)}
      >
        {drawer}
      </Drawer>

      {/* Mobile Temporary Drawer (left side) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          [`& .MuiDrawer-paper`]: {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>


      {/* Main Content with Outlet */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8, // space for AppBar
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default AppLayout;
