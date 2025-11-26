import React, { useEffect, useState } from "react";
// import { collection, getDocs } from 'firebase/firestore';
// import { db } from '../firebase/config';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  Paper,
  Divider,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const DefaultRoutes = () => {
  const [buses, setBuses] = useState([]);
  const [routesMap, setRoutesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch buses and routes from backend
        const busesRes = await fetch("http://localhost:5000/api/buses");
        const busesData = await busesRes.json();
        const routesRes = await fetch("http://localhost:5000/api/routes");
        const routesArr = await routesRes.json();
        const routesData = {};

        routesArr.forEach((route) => {
          console.log(route.id, ":", route);
          routesData[route.id] = route;
        });
        console.log("Routes Data:", routesData);
        let busList = [];
        busesData.forEach((busData) => {
          const route = routesData[busData.current_route_no];
          busList.push({
            busNo: busData.bus_no,
            stops: route?.stops || [],
          });
        });

        const naturalSort = (a, b) =>
          a.busNo.localeCompare(b.busNo, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        busList.sort(naturalSort);

        setBuses(busList);
        setRoutesMap(routesData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredBuses = buses.filter((bus) =>
    bus.busNo.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          fontSize: "1.5rem",
          color: "#333",
        }}
      >
        Loading bus routes...
      </div>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "linear-gradient(135deg, #e9f0fa 0%, #f5f6fa 100%)",
        py: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container maxWidth="md">
        <Box
          className="card"
          sx={{
            background: "#fff",
            borderRadius: "1.2rem",
            boxShadow: "0 12px 32px rgba(10,25,49,0.13)",
            p: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: 900,
            fontFamily: `'Montserrat', 'Inter', 'Segoe UI', 'system-ui', sans-serif`,
            minHeight: 600,
            justifyContent: "flex-start",
          }}
        >
          <Typography
            variant="h3"
            sx={{
              mb: 1.5,
              fontWeight: 900,
              color: "#114fa3",
              letterSpacing: 1,
              fontFamily: "inherit",
              fontSize: { xs: "2rem", sm: "2.4rem" },
            }}
          >
            Default Bus Routes
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: "#4b5563",
              mb: 3,
              fontWeight: 500,
              fontFamily: "inherit",
              fontSize: { xs: "1.1rem", sm: "1.25rem" },
            }}
          >
            View and manage all default bus routes and stops
          </Typography>
          <Box
            sx={{
              width: "100%",
              mb: 3,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <TextField
              placeholder="Search by bus number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#114fa3" }} />
                  </InputAdornment>
                ),
                style: {
                  background: "#f8fafc",
                  borderRadius: 8,
                  fontFamily: "inherit",
                },
              }}
              sx={{ width: 300 }}
              size="small"
            />
          </Box>
          <Divider sx={{ width: "100%", mb: 3, bgcolor: "#e3e8f0" }} />
          <Box
            sx={{
              width: "100%",
              flex: 1,
              minHeight: 300,
              maxHeight: 350,
              overflow: "auto",
              borderRadius: 2,
              boxShadow: "0 2px 12px rgba(17,79,163,0.04)",
              bgcolor: "#f8fafc",
              "::-webkit-scrollbar": {
                width: 10,
                background: "#e9f0fa",
                borderRadius: 8,
              },
              "::-webkit-scrollbar-thumb": {
                background: "#b0b3b8",
                borderRadius: 8,
              },
            }}
          >
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 200,
                }}
              >
                <CircularProgress size={32} color="primary" />
              </Box>
            ) : (
              <Stack spacing={3} sx={{ p: 2 }}>
                {filteredBuses.length === 0 ? (
                  <Typography
                    sx={{
                      textAlign: "center",
                      color: "#b0b3b8",
                      fontWeight: 500,
                      fontSize: "1.1rem",
                      py: 4,
                    }}
                  >
                    No buses found.
                  </Typography>
                ) : (
                  filteredBuses.map((bus, idx) => (
                    <Paper
                      key={bus.busNo}
                      elevation={3}
                      sx={{
                        borderRadius: 3,
                        boxShadow: "0 2px 12px rgba(17,79,163,0.08)",
                        p: 2.5,
                        bgcolor: "#f8fafc",
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color: "#114fa3",
                          fontSize: "1.13rem",
                          mb: 0.5,
                        }}
                      >
                        Bus: {bus.busNo}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        {bus.stops.length === 0 ? (
                          <Typography
                            sx={{
                              color: "#b0b3b8",
                              fontWeight: 500,
                              fontSize: "0.98rem",
                            }}
                          >
                            No stops
                          </Typography>
                        ) : (
                          bus.stops.map((stop, i) => (
                            <Box
                              key={i}
                              sx={{
                                px: 1.2,
                                py: 0.5,
                                bgcolor: "#e9f0fa",
                                color: "#114fa3",
                                borderRadius: 1.5,
                                fontWeight: 600,
                                fontSize: "0.98rem",
                                mb: 0.5,
                              }}
                            >
                              {stop}
                            </Box>
                          ))
                        )}
                      </Box>
                    </Paper>
                  ))
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

// Styles
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid #d1e3f0",
};

const theadRowStyle = {
  backgroundColor: "#0d6efd",
  color: "white",
};

const thStyle = {
  padding: "1rem",
  border: "1px solid #cbd9ea",
  fontSize: "1.1rem",
  textAlign: "center",
};

const tdStyle = {
  padding: "1rem",
  border: "1px solid #cbd9ea",
  fontSize: "1rem",
  color: "#333",
  verticalAlign: "middle",
};

const rowStyle = {
  transition: "background 0.3s ease",
};

export default DefaultRoutes;
