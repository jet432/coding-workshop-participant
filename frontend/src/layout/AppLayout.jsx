import {
  AssessmentRounded,
  EmojiEventsRounded,
  GroupRounded,
  HubRounded,
  LogoutRounded,
  MenuRounded,
  PersonRounded,
} from '@mui/icons-material'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import PropTypes from 'prop-types'
import { NavLink, Outlet } from 'react-router-dom'
import { useMediaQuery } from 'react-responsive'

import { useAuth } from '../context/useAuth.jsx'

const DRAWER_WIDTH = 280
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: <AssessmentRounded /> },
  { label: 'Employees', to: '/employees', icon: <PersonRounded /> },
  { label: 'Teams', to: '/teams', icon: <GroupRounded /> },
  { label: 'Achievements', to: '/achievements', icon: <EmojiEventsRounded /> },
  { label: 'Metadata', to: '/metadata', icon: <HubRounded /> },
]

/**
 * Render the drawer navigation content.
 *
 * @param {{onNavigate?: Function}} props
 * @returns {JSX.Element}
 */
function NavigationContent({ onNavigate }) {
  const { user, logout } = useAuth()

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
        px: 2,
        py: 3,
      }}
    >
      <Stack spacing={1.5} sx={{ px: 1, pb: 3 }}>
        <Typography color="secondary.main" variant="overline">
          Workshop Control Room
        </Typography>
        <Typography variant="h5">Team Manager</Typography>
        <Typography color="text.secondary" variant="body2">
          Centralize employee rosters, team ownership, and monthly accomplishments.
        </Typography>
      </Stack>

      <List sx={{ display: 'grid', gap: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            onClick={onNavigate}
            sx={{
              borderRadius: 4,
              '&.active': {
                backgroundColor: 'rgba(29, 122, 112, 0.12)',
                color: 'primary.dark',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 42 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ mt: 'auto', pt: 3 }}>
        <Divider sx={{ mb: 2 }} />
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{
            borderRadius: 4,
            bgcolor: 'rgba(255, 255, 255, 0.72)',
            px: 2,
            py: 1.5,
          }}
        >
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {user?.displayName?.slice(0, 1) || 'U'}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography noWrap variant="subtitle2">
              {user?.displayName}
            </Typography>
            <Typography noWrap color="text.secondary" variant="body2">
              {user?.email}
            </Typography>
          </Box>
          <IconButton color="primary" onClick={logout}>
            <LogoutRounded />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  )
}

NavigationContent.propTypes = {
  onNavigate: PropTypes.func,
}

NavigationContent.defaultProps = {
  onNavigate: undefined,
}

/**
 * Render the authenticated workspace layout.
 *
 * @returns {JSX.Element}
 */
function AppLayout() {
  const isDesktop = useMediaQuery({ minWidth: 960 })
  const [mobileOpen, setMobileOpen] = useState(false)
  const { logout } = useAuth()

  const drawer = <NavigationContent onNavigate={() => setMobileOpen(false)} />

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        color="transparent"
        position="fixed"
        sx={{
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(21, 37, 59, 0.08)',
          boxShadow: 'none',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ display: 'flex', gap: 2 }}>
          {!isDesktop && (
            <IconButton color="primary" onClick={() => setMobileOpen(true)}>
              <MenuRounded />
            </IconButton>
          )}
          <Stack sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Workshop Team Manager</Typography>
            <Typography color="text.secondary" variant="body2">
              Authenticated operations workspace
            </Typography>
          </Stack>
          {isDesktop && (
            <Button color="primary" onClick={logout} startIcon={<LogoutRounded />}>
              Sign out
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: { md: 0 },
        }}
      >
        {isDesktop ? (
          <Drawer
            open
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                borderRight: '1px solid rgba(21, 37, 59, 0.08)',
                bgcolor: 'rgba(248, 247, 241, 0.92)',
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                bgcolor: 'rgba(248, 247, 241, 0.98)',
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          px: { xs: 2, sm: 3, md: 4 },
          pb: 4,
        }}
      >
        <Toolbar />
        <Box sx={{ pt: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default AppLayout
