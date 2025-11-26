import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Route, Routes } from "react-router-dom";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  styled,
} from "@mui/material";
import {
  DirectionsBus,
  People,
  Schedule,
  Notifications,
  Settings,
  Assessment,
  Logout,
  LocationOn,
  PersonAdd,
  Route as RouteIcon,
} from "@mui/icons-material";
import VideocamIcon from "@mui/icons-material/Videocam";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ssnLogo from "../assets/snf.png";

const FeatureCard = styled(Paper)(({ theme }) => ({
  width: "100%",
  padding: theme.spacing(3),
  textAlign: "center",
  color: theme.palette.text.secondary,
  cursor: "pointer",
  transition: "all 0.3s ease",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  aspectRatio: "1 / 1",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[4],
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  "& svg": {
    fontSize: 48,
    color: theme.palette.primary.main,
  },
}));

const features = [
  {
    title: "Live Tracking",
    icon: LocationOn,
    path: "/live-tracking",
    shortDesc: "Track buses in real-time",
  },
  {
    title: "Register Students",
    icon: PersonAdd,
    path: "/register-students",
    shortDesc: "Add and manage students",
  },
  {
    title: "Default Routes",
    icon: RouteIcon,
    path: "/default-routes",
    shortDesc: "View and manage default bus routes",
  },
  {
    title: "Bus Camera Monitor",
    icon: VideocamIcon,
    path: "/bus-monitor",
    shortDesc: "View live bus camera feeds",
  },
  {
    title: "Reports",
    icon: Assessment,
    path: "/reports",
    shortDesc: "View analytics and reports",
  },
  {
    title: "Bus Management",
    icon: DirectionsBus,
    path: "/bus-management",
    shortDesc: "Manage bus details and assignments",
  },
  {
    title: "Authenticate",
    icon: Settings,
    path: "/authenticate",
    shortDesc: "Upload Excel to create users",
  },
];

const BusCameraMonitorComingSoon = () => (
  <Box
    sx={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    }}
  >
    <VideocamIcon sx={{ fontSize: 64, color: "#114fa3", mb: 2 }} />
    <Typography variant="h4" sx={{ fontWeight: 700, color: "#114fa3", mb: 1 }}>
      Bus Camera Monitor
    </Typography>
    <Typography variant="h6" sx={{ color: "#4b5563" }}>
      Page Coming Soon
    </Typography>
  </Box>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleLogout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    setEmail(storedEmail || "Admin");

    const interval = setInterval(() => {
      const expiry = localStorage.getItem("sessionExpiry");
      if (!expiry || new Date().getTime() > parseInt(expiry)) {
        handleLogout();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [handleLogout]);

  const handleFeatureClick = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
            <img
              src={ssnLogo}
              alt="SSN Logo"
              style={{ width: 56, height: 56, borderRadius: 10 }}
            />
          </Box>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Scholar Commute Admin
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              {email}
            </Typography>
            <Button
              color="inherit"
              onClick={handleLogout}
              startIcon={<Logout />}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 500,
            color: "text.primary",
            mb: 4,
            textAlign: "center",
          }}
        >
          Welcome to Admin Dashboard
        </Typography>

        <Grid
          container
          spacing={4}
          justifyContent="center"
          alignItems="stretch"
          sx={{ mt: 2 }}
        >
          {features.map((feature, i) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={feature.title}
              sx={{ display: "flex" }}
            >
              <Box
                className="card"
                sx={{
                  flex: 1,
                  minHeight: 220, // Set a fixed height for all cards
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "box-shadow 0.2s",
                  width: "100%", // Ensures full width in grid cell
                  "&:hover": {
                    boxShadow: "0 8px 24px rgba(37,99,235,0.12)",
                  },
                }}
                onClick={() => handleFeatureClick(feature.path)}
              >
                <IconWrapper>{React.createElement(feature.icon)}</IconWrapper>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "var(--muted-foreground)" }}
                >
                  {feature.shortDesc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
