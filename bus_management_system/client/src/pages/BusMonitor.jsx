import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Card,
  CardContent,
  Alert,
  AppBar,
  Toolbar,
  Chip,
  Button,
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import ssnLogo from "../assets/snf.png";

const BusMonitor = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState(null);
  const [cameraUrl, setCameraUrl] = useState(null);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [error, setError] = useState(null);

  // Fetch buses data from backend
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/buses");
        const busList = await response.json();
        setBuses(busList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching buses:", err);
        setError("Failed to fetch bus data");
        setLoading(false);
      }
    };
    fetchBuses();
  }, []);

  // Function to fetch camera URL for selected bus
  const handleBusClick = async (bus) => {
    setSelectedBus(bus);
    setLoadingCamera(true);
    setCameraUrl(null);
    setError(null);

    try {
      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await axios.get(
        `http://localhost:5000/api/bus-monitor/bus_no_${bus.bus_no}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const url = response.data.url;

      if (url) {
        setCameraUrl(url);

        // Test if the camera URL is accessible
        try {
          const testResponse = await fetch(url, {
            method: "HEAD",
            mode: "no-cors", // This allows checking if the URL exists without CORS issues
          });
          // If we get here, the URL is accessible
        } catch (testError) {
          console.warn("Camera URL might not be accessible:", testError);
          // Don't set error here, let the iframe try to load
        }
      } else {
        setError("No camera URL found for this bus.");
      }
    } catch (error) {
      console.error("Error fetching camera URL:", error);
      if (error.name === "AbortError") {
        setError(
          "Request timed out. Camera server might be slow or unavailable."
        );
      } else {
        setError("Failed to load camera URL for this bus.");
      }
    } finally {
      setLoadingCamera(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "500px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !selectedBus) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "#f9fafb",
      }}
    >
      {/* Title Navbar */}
      <AppBar position="static">
        <Toolbar>
          {/* Left Section - Title */}
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1 }}
          >
            <VideocamIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6">Bus Camera Monitor</Typography>
          </Box>

          {/* Right Section - SSN Logo */}
          <Box>
            <img
              src={ssnLogo}
              alt="SSN Logo"
              style={{ height: 55, objectFit: "contain", borderRadius: 10 }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ display: "flex", flex: 1, gap: 0, overflow: "hidden" }}>
        {/* Left Section - Bus List */}
        <Box
          sx={{
            width: "25%",
            minWidth: 250,
            maxWidth: 350,
            height: "100%",
            overflowY: "auto",
            borderRight: "1px solid #e5e7eb",
            bgcolor: "#fff",
            boxShadow: "2px 0 8px rgba(0,0,0,0.03)",
            zIndex: 2,
          }}
        >
          <Box sx={{ p: 2, borderBottom: "1px solid #e5e7eb" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#114fa3" }}>
              Available Buses
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click on a bus to view its camera feed
            </Typography>
          </Box>

          <List sx={{ p: 0 }}>
            {buses.map((bus, index) => (
              <React.Fragment key={bus.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleBusClick(bus)}
                    selected={bus.id === selectedBus?.id}
                    sx={{
                      "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                      borderLeft:
                        bus.id === selectedBus?.id
                          ? "4px solid #2563eb"
                          : "4px solid transparent",
                      bgcolor:
                        bus.id === selectedBus?.id ? "#f0f6ff" : "inherit",
                      transition: "background 0.2s",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        width: "100%",
                      }}
                    >
                      <DirectionsBusIcon color="primary" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          Bus {bus.bus_no}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Route: {bus.current_route_no || "Not assigned"}
                        </Typography>
                      </Box>
                      <Chip
                        label={bus.status || "Active"}
                        color={bus.status === "Active" ? "success" : "default"}
                        size="small"
                      />
                    </Box>
                  </ListItemButton>
                </ListItem>
                {index < buses.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Right Section - Camera Feed */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            bgcolor: "#000",
          }}
        >
          {selectedBus ? (
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Bus Info Header */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#fff",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <VideocamIcon color="primary" />
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      Bus {selectedBus.bus_no} Camera Feed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Route: {selectedBus.current_route_no || "Not assigned"}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {cameraUrl && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => window.open(cameraUrl, "_blank")}
                      startIcon={<VideocamIcon />}
                      size="small"
                    >
                      Open in New Tab
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleBusClick(selectedBus)}
                    startIcon={<RefreshIcon />}
                    size="small"
                    disabled={loadingCamera}
                  >
                    Refresh
                  </Button>
                </Box>
              </Box>

              {/* Camera Feed Area */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 2,
                }}
              >
                {loadingCamera ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <CircularProgress size={48} />
                    <Typography variant="h6" color="white">
                      Loading camera feed...
                    </Typography>
                  </Box>
                ) : cameraUrl ? (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <iframe
                      src={cameraUrl}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        borderRadius: "8px",
                      }}
                      title={`Bus ${selectedBus.bus_no} Camera Feed`}
                      allow="camera; microphone; fullscreen; autoplay"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.error("Iframe load error:", e);
                        setError(
                          "Failed to load camera feed. The camera server might be unavailable."
                        );
                      }}
                    />
                  </Box>
                ) : error ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <VideocamIcon sx={{ fontSize: 64, color: "#dc2626" }} />
                    <Typography variant="h6" color="white" textAlign="center">
                      {error}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="#9ca3af"
                      textAlign="center"
                    >
                      Camera feed is not available for this bus
                    </Typography>
                    {cameraUrl && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => window.open(cameraUrl, "_blank")}
                        startIcon={<VideocamIcon />}
                        sx={{ mt: 2 }}
                      >
                        Open Camera Feed in New Tab
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <VideocamIcon sx={{ fontSize: 64, color: "#6b7280" }} />
                    <Typography variant="h6" color="white" textAlign="center">
                      Select a bus to view camera feed
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <VideocamIcon sx={{ fontSize: 64, color: "#6b7280" }} />
              <Typography variant="h5" color="white" textAlign="center">
                Bus Camera Monitor
              </Typography>
              <Typography variant="body1" color="#9ca3af" textAlign="center">
                Select a bus from the list to view its camera feed
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default BusMonitor;
