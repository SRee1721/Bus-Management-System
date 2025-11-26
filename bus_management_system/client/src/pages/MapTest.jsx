import React, { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const center = [12.83714, 80.05204];

function MapTest() {
  // Simulate loading for demonstration (Leaflet loads instantly)
  const [loading, setLoading] = useState(false);

  // No error state needed for OSM/Leaflet unless you want to handle tile load errors

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="card" sx={{ mb: 3, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Map Test
      </Typography>
      <Paper elevation={3}>
        <div style={mapContainerStyle}>
          <MapContainer
            center={center}
            zoom={8}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </MapContainer>
        </div>
      </Paper>
    </Box>
  );
}

export default MapTest;
