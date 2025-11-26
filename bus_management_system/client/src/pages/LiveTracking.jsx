import React, { useEffect, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import ssnLogo from "../assets/snf.png";
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Card,
  CardContent,
  Alert,
  AppBar,
  Toolbar,
} from "@mui/material";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import RouteIcon from "@mui/icons-material/Route";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  off,
  get,
} from "firebase/database";
import { app as firebaseApp } from "../firebase/config";
import busPng from "../assets/bus.png";

// Custom marker icons for Leaflet
const busIcon = new L.Icon({
  iconUrl: busPng,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});
const selectedBusIcon = new L.Icon({
  iconUrl: busPng,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -44],
  className: "selected-bus-icon",
});
const stopIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const defaultCenter = [12.75199794875771, 80.20321657899466];
const collegeCoordinates = [12.75199794875771, 80.20321657899466]; // College coordinates
const targetArrivalTime = "07:50"; // Target arrival time in 24-hour format

// Helper function to get real-time distance and travel time using OpenRouteService
async function getRealTimeDistanceAndTime(
  busLat,
  busLng,
  collegeLat,
  collegeLng
) {
  const url =
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  try {
    const response = await axios.post(
      url,
      {
        coordinates: [
          [busLng, busLat],
          [collegeLng, collegeLat],
        ], // ORS expects [lng, lat] pairs
      },
      {
        headers: {
          Authorization:
            "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjkyODFhYWI0ZWY1ZjRiNWZhNTllZDEwMzk5OWE2Y2RhIiwiaCI6Im11cm11cjY0In0=",
          "Content-Type": "application/json",
        },
      }
    );

    const route = response.data.features[0];
    const distance = route.properties.summary.distance / 1000; // Convert meters to kilometers
    const duration = route.properties.summary.duration / 60; // Convert seconds to minutes

    return { distance, duration };
  } catch (err) {
    console.error("OpenRouteService error for distance calculation:", err);
    return null;
  }
}

// Helper function to check if bus is delayed
function isBusDelayed(estimatedArrivalTime) {
  const [targetHour, targetMinute] = targetArrivalTime.split(":").map(Number);
  const targetTime = new Date();
  targetTime.setHours(targetHour, targetMinute, 0, 0);

  return estimatedArrivalTime > targetTime;
}

function MapBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

async function fetchRouteLine(coords) {
  // coords: array of [lng, lat] pairs
  const url =
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  try {
    const response = await axios.post(
      url,
      {
        coordinates: coords,
      },
      {
        headers: {
          Authorization:
            "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjkyODFhYWI0ZWY1ZjRiNWZhNTllZDEwMzk5OWE2Y2RhIiwiaCI6Im11cm11cjY0In0=",
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.features[0].geometry.coordinates.map(([lng, lat]) => [
      lat,
      lng,
    ]);
  } catch (err) {
    console.error("OpenRouteService error:", err);
    return null;
  }
}

// Helper to get optimized order from ORS Optimization endpoint
async function getOptimizedOrderORS(locations) {
  if (locations.length < 3) return locations; // No optimization needed
  const apiKey =
    "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjkyODFhYWI0ZWY1ZjRiNWZhNTllZDEwMzk5OWE2Y2RhIiwiaCI6Im11cm11cjY0In0=";
  const url = "https://api.openrouteservice.org/optimization";
  // Prepare jobs (all stops except first and last)
  const jobs = locations.slice(1, -1).map((loc, idx) => ({
    id: idx + 1,
    location: [loc.position[1], loc.position[0]], // [lng, lat]
  }));
  // Prepare vehicles (start at first, end at last)
  const vehicle = {
    id: 1,
    profile: "driving-car",
    start: [locations[0].position[1], locations[0].position[0]],
    end: [
      locations[locations.length - 1].position[1],
      locations[locations.length - 1].position[0],
    ],
  };
  try {
    const response = await axios.post(
      url,
      {
        jobs,
        vehicles: [vehicle],
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      }
    );
    // Get the order: start + optimized jobs + end
    const steps = response.data.routes[0].steps;
    const ordered = [locations[0]];
    for (const step of steps) {
      if (step.type === "job") {
        ordered.push(locations[step.id]); // step.id matches jobs index+1
      }
    }
    ordered.push(locations[locations.length - 1]);
    return ordered;
  } catch (err) {
    console.error("ORS Optimization error:", err);
    return locations;
  }
}

function LiveTracking() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [busStops, setBusStops] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopLocations, setStopLocations] = useState([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapBounds, setMapBounds] = useState(null);
  const [routeLine, setRouteLine] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [realtimeLocation, setRealtimeLocation] = useState(null);
  const [distanceToCollege, setDistanceToCollege] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState(null);
  const [isDelayed, setIsDelayed] = useState(false);

  // Function to calculate distance and time to college using real-time routing
  const calculateDistanceAndTime = useCallback(async (busLocation) => {
    if (!busLocation) {
      setDistanceToCollege(null);
      setEstimatedTime(null);
      setEstimatedArrivalTime(null);
      setIsDelayed(false);
      return;
    }

    try {
      const busLat = busLocation.lat || busLocation.latitude;
      const busLng = busLocation.lng || busLocation.longitude;

      const result = await getRealTimeDistanceAndTime(
        busLat,
        busLng,
        collegeCoordinates[0],
        collegeCoordinates[1]
      );

      if (result) {
        const { distance, duration } = result;
        const currentTime = new Date();
        const estimatedArrival = new Date(
          currentTime.getTime() + duration * 60000
        );

        const isDelayedStatus = isBusDelayed(estimatedArrival);

        setDistanceToCollege(distance);
        setEstimatedTime(Math.round(duration));
        setEstimatedArrivalTime(estimatedArrival);
        setIsDelayed(isDelayedStatus);
      } else {
        // Fallback to simple calculation if API fails
        const fallbackDistance = Math.sqrt(
          Math.pow((busLat - collegeCoordinates[0]) * 111, 2) +
            Math.pow((busLng - collegeCoordinates[1]) * 111, 2)
        );
        const fallbackTime = Math.round(fallbackDistance * 2); // Rough estimate: 2 min per km
        const currentTime = new Date();
        const estimatedArrival = new Date(
          currentTime.getTime() + fallbackTime * 60000
        );

        setDistanceToCollege(fallbackDistance);
        setEstimatedTime(fallbackTime);
        setEstimatedArrivalTime(estimatedArrival);
        setIsDelayed(isBusDelayed(estimatedArrival));
      }
    } catch (error) {
      console.error("Error calculating distance and time:", error);
      setDistanceToCollege(null);
      setEstimatedTime(null);
      setEstimatedArrivalTime(null);
      setIsDelayed(false);
    }
  }, []);

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

  // Listen for real-time bus location updates from Firebase
  useEffect(() => {
    if (!selectedBus) {
      setRealtimeLocation(null);
      setDistanceToCollege(null);
      setEstimatedTime(null);
      setEstimatedArrivalTime(null);
      setIsDelayed(false);
      return;
    }
    const db = getDatabase(firebaseApp);
    const busKey = `bus_no_${selectedBus.bus_no}`;
    const locRef = dbRef(db, `bus_tracking/${busKey}/location`);
    const unsubscribe = onValue(locRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.latitude && data.longitude) {
        const location = {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
        };
        setRealtimeLocation(location);
        calculateDistanceAndTime(location);
      } else {
        setRealtimeLocation(null);
        calculateDistanceAndTime(null);
      }
    });
    return () => {
      off(locRef);
    };
  }, [selectedBus, calculateDistanceAndTime]);

  // Calculate bounds to fit all markers
  const calculateBounds = useCallback((locations) => {
    if (locations.length === 0) return null;
    const bounds = L.latLngBounds(locations.map((loc) => loc.position));
    return bounds;
  }, []);

  const normalize = (str) => str.trim().toLowerCase();

  const handleBusClick = async (bus) => {
    setSelectedBus(bus);
    setLoadingStops(true);
    setRouteLoading(true);
    setRouteLine([]);

    // Fetch real-time coordinates from Firebase for distance calculation
    try {
      const db = getDatabase(firebaseApp);
      const busKey = `bus_no_${bus.bus_no}`;
      const locRef = dbRef(db, `bus_tracking/${busKey}/location`);

      // Get the current value once
      const snapshot = await get(locRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data && data.latitude && data.longitude) {
          const realtimeLocation = {
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude),
          };
          await calculateDistanceAndTime(realtimeLocation);
        } else {
          await calculateDistanceAndTime(null);
        }
      } else {
        // Fallback to static location if no real-time data
        if (bus.current_location) {
          await calculateDistanceAndTime(bus.current_location);
        } else {
          await calculateDistanceAndTime(null);
        }
      }
    } catch (error) {
      console.error("Error fetching real-time location:", error);
      // Fallback to static location
      if (bus.current_location) {
        await calculateDistanceAndTime(bus.current_location);
      } else {
        await calculateDistanceAndTime(null);
      }
    }

    try {
      if (bus.current_route_no) {
        // Fetch route data from backend
        const routeRes = await fetch(
          `http://localhost:5000/api/routes/${bus.current_route_no}`
        );
        if (!routeRes.ok) throw new Error("Route not found");
        const routeData = await routeRes.json();
        setBusStops(routeData.stops || []);
        // Fetch all stop coordinates for this route
        const coordsRes = await fetch(
          `http://localhost:5000/api/routes/${bus.current_route_no}/stop-coords`
        );
        const stopsWithCoords = await coordsRes.json();
        // Only plot stops with valid lat/lng
        let locations = stopsWithCoords
          .filter((s) => s.lat && s.lng)
          .map((s) => ({
            name: s.name,
            position: [s.lat, s.lng],
          }));
        setStopLocations(locations);
        // Add bus location to bounds calculation
        const boundsLocations = [...locations];
        if (bus.current_location) {
          boundsLocations.push({
            name: `Bus ${bus.bus_no}`,
            position: [
              bus.current_location.latitude,
              bus.current_location.longitude,
            ],
          });
        }
        // Calculate and set bounds
        const bounds = calculateBounds(boundsLocations);
        setMapBounds(bounds);
        // Set initial center to bus location or first stop
        if (bus.current_location) {
          setMapCenter([
            bus.current_location.latitude,
            bus.current_location.longitude,
          ]);
        } else if (locations.length > 0) {
          setMapCenter(locations[0].position);
        }
        // --- Optimization logic ---
        if (locations.length > 2) {
          // Get optimized order (start, optimized, end)
          const ordered = await getOptimizedOrderORS(locations);
          // ORS expects [lng, lat] pairs
          const orsCoords = ordered.map((loc) => [
            loc.position[1],
            loc.position[0],
          ]);
          setRouteLoading(true);
          const route = await fetchRouteLine(orsCoords);
          if (route) setRouteLine(route);
          else setRouteLine([]);
          setRouteLoading(false);
        } else if (locations.length > 1) {
          // Just connect as is
          const orsCoords = locations.map((loc) => [
            loc.position[1],
            loc.position[0],
          ]);
          setRouteLoading(true);
          const route = await fetchRouteLine(orsCoords);
          if (route) setRouteLine(route);
          else setRouteLine([]);
          setRouteLoading(false);
        } else {
          setRouteLine([]);
          setRouteLoading(false);
        }
      } else {
        setBusStops([]);
        setStopLocations([]);
        setMapBounds(null);
        setRouteLine([]);
        setRouteLoading(false);
      }
    } catch (err) {
      console.error("Error fetching stops:", err);
      setBusStops([]);
      setStopLocations([]);
      setMapBounds(null);
      setRouteLine([]);
      setRouteLoading(false);
    } finally {
      setLoadingStops(false);
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

  if (error) {
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
        minHeight: 600,
        bgcolor: "#f9fafb",
        overflow: "hidden",
      }}
    >
      {/* Title Navbar */}
      <AppBar position="static">
        <Toolbar>
          {/* Left Section - Title */}
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1 }}
          >
            <DirectionsBusIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6">Live Bus Tracking</Typography>
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

      {/* Main Content Area */}
      <Box
        sx={{
          display: "flex",
          flex: 1,
          gap: 0,
          p: 0,
          overflow: "hidden",
          "@media (max-width:900px)": {
            flexDirection: "column",
            height: "auto",
          },
        }}
      >
        {/* Left Section - Bus List (scrollable) */}
        <Box
          sx={{
            width: { xs: "100%", md: "20%" },
            minWidth: 120,
            maxWidth: 260,
            height: { xs: 120, md: "100%" },
            overflowY: "auto",
            borderRight: { md: "1px solid #e5e7eb" },
            bgcolor: "#fff",
            boxShadow: { md: "2px 0 8px rgba(0,0,0,0.03)" },
            zIndex: 2,
            "@media (max-width:900px)": {
              width: "100%",
              height: 120,
              borderRight: "none",
              borderBottom: "1px solid #e5e7eb",
              flexDirection: "row",
              overflowX: "auto",
              overflowY: "hidden",
              display: "flex",
            },
          }}
        >
          <List sx={{ p: 0, m: 0, width: "100%" }}>
            {buses.map((bus, index) => (
              <ListItem
                key={bus.id}
                button
                onClick={() => handleBusClick(bus)}
                selected={bus.id === selectedBus?.id}
                sx={{
                  "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                  borderLeft:
                    bus.id === selectedBus?.id
                      ? "4px solid #2563eb"
                      : "4px solid transparent",
                  bgcolor: bus.id === selectedBus?.id ? "#f0f6ff" : "inherit",
                  transition: "background 0.2s",
                  minWidth: 0,
                  "@media (max-width:900px)": {
                    display: "inline-block",
                    width: 100,
                    minWidth: 100,
                    borderLeft: "none",
                    borderBottom:
                      bus.id === selectedBus?.id
                        ? "4px solid #2563eb"
                        : "4px solid transparent",
                    bgcolor: bus.id === selectedBus?.id ? "#f0f6ff" : "inherit",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DirectionsBusIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="medium" noWrap>
                    Bus {bus.bus_no}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Center Section - Map (fills vertical space) */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            height: "100vh",
            position: "relative",
            "@media (max-width:900px)": {
              width: "100%",
              height: 300,
              minHeight: 300,
            },
          }}
        >
          <MapContainer
            center={mapCenter}
            zoom={12}
            minZoom={10}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapBounds && <MapBounds bounds={mapBounds} />}
            {/* Draw route line (actual road route) */}
            {routeLoading && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 1000,
                }}
              >
                <CircularProgress size={28} color="primary" />
              </div>
            )}
            {routeLine.length > 1 && !routeLoading && (
              <Polyline
                positions={routeLine}
                pathOptions={{ color: "#0d6efd", weight: 6, opacity: 0.9 }}
              />
            )}
            {/* Bus markers */}
            {/* Selected bus marker */}
            {selectedBus && (
              <Marker
                key={selectedBus.id}
                position={
                  realtimeLocation
                    ? [realtimeLocation.lat, realtimeLocation.lng]
                    : selectedBus.current_location
                    ? [
                        selectedBus.current_location.latitude,
                        selectedBus.current_location.longitude,
                      ]
                    : defaultCenter
                }
                icon={selectedBusIcon}
                eventHandlers={{
                  click: () => handleBusClick(selectedBus),
                }}
              >
                <Popup>
                  <Typography variant="subtitle2">
                    Bus {selectedBus.bus_no}
                  </Typography>
                  <Typography variant="body2">
                    Route: {selectedBus.current_route_no || "Not assigned"}
                  </Typography>
                  <Typography variant="body2">
                    Status: {selectedBus.status || "Active"}
                  </Typography>
                </Popup>
              </Marker>
            )}

            {/* Other buses */}
            {buses
              .filter((bus) => bus.id !== selectedBus?.id)
              .map((bus) => (
                <Marker
                  key={bus.id}
                  position={
                    bus.current_location
                      ? [
                          bus.current_location.latitude,
                          bus.current_location.longitude,
                        ]
                      : defaultCenter
                  }
                  icon={busIcon}
                  eventHandlers={{
                    click: () => handleBusClick(bus),
                  }}
                >
                  <Popup>
                    <Typography variant="subtitle2">
                      Bus {bus.bus_no}
                    </Typography>
                    <Typography variant="body2">
                      Route: {bus.current_route_no || "Not assigned"}
                    </Typography>
                    <Typography variant="body2">
                      Status: {bus.status || "Active"}
                    </Typography>
                  </Popup>
                </Marker>
              ))}
            {/* Stop markers */}
            {stopLocations.map((stop, index) => (
              <Marker key={index} position={stop.position} icon={stopIcon}>
                <Popup>
                  <Typography variant="body2">
                    {index + 1}. {stop.name}
                  </Typography>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Box>

        {/* Right Section - Bus Details (scrollable) */}
        <Box
          sx={{
            width: { xs: "100%", md: "25%" },
            minWidth: 200,
            maxWidth: 350,
            height: { xs: 200, md: "100vh" },
            overflowY: "auto",
            borderLeft: { md: "1px solid #e5e7eb" },
            bgcolor: "#fff",
            boxShadow: { md: "-2px 0 8px rgba(0,0,0,0.03)" },
            zIndex: 2,
            "@media (max-width:900px)": {
              width: "100%",
              height: 200,
              borderLeft: "none",
              borderTop: "1px solid #e5e7eb",
            },
          }}
        >
          {selectedBus ? (
            <Box sx={{ p: 2 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <RouteIcon color="primary" />
                <Typography variant="h6">
                  Bus {selectedBus.bus_no} Details
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle1"
                  color="text.secondary"
                  gutterBottom
                >
                  Current Route:{" "}
                  {selectedBus.current_route_no || "Not assigned"}
                </Typography>
                <Chip
                  label={selectedBus.status || "Active"}
                  color={
                    selectedBus.status === "Active" ? "success" : "default"
                  }
                  size="small"
                />
              </Box>

              {/* Distance and Time Information */}
              {(distanceToCollege !== null || estimatedTime !== null) && (
                <Box sx={{ mb: 2, p: 2, bgcolor: "#f8f9fa", borderRadius: 1 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ color: "#114fa3", fontWeight: 600 }}
                  >
                    College ETA
                  </Typography>

                  {distanceToCollege !== null && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Distance to College:</strong>{" "}
                      {distanceToCollege.toFixed(2)} km
                    </Typography>
                  )}

                  {estimatedTime !== null && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Estimated Travel Time:</strong> {estimatedTime}{" "}
                      minutes
                    </Typography>
                  )}

                  {estimatedArrivalTime !== null && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Estimated Arrival:</strong>{" "}
                      {estimatedArrivalTime.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Typography>
                  )}

                  {isDelayed && (
                    <Chip
                      label="DELAYED"
                      color="error"
                      size="small"
                      sx={{
                        mt: 1,
                        bgcolor: "#ffebee",
                        color: "#d32f2f",
                        fontWeight: "bold",
                      }}
                    />
                  )}
                </Box>
              )}
              <Typography variant="h6" gutterBottom>
                Bus Stops
              </Typography>
              {loadingStops ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : busStops.length > 0 ? (
                <List>
                  {busStops.map((stop, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <LocationOnIcon color="error" fontSize="small" />
                              <Typography variant="body1" fontWeight="medium">
                                {index + 1}. {stop}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < busStops.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No stops available for this route
                </Typography>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Typography variant="body1" color="text.secondary" align="center">
                Select a bus to view details
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default LiveTracking;
