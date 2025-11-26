import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  styled,
} from "@mui/material";
import { DirectionsBus } from "@mui/icons-material";
import ssnLogo from "../assets/snf.png";

const BusCard = styled(Paper)(({ theme }) => ({
  width: 200,
  height: 200,
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
  borderRadius: 10,
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

const BusManagement = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const busRes = await fetch("http://localhost:5000/api/buses");
        const busesData = await busRes.json();

        const busList = busesData.map((busData) => ({
          id: busData.id,
          busNo: busData.bus_no,
          status: busData.status || "Active",
        }));

        busList.sort((a, b) =>
          a.busNo.localeCompare(b.busNo, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );

        setBuses(busList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching buses:", err);
        setLoading(false);
      }
    };
    fetchBuses();
  }, []);

  const filteredBuses = buses.filter((bus) =>
    bus.busNo.toLowerCase().includes(search.toLowerCase())
  );

  const handleBusClick = (busId) => {
    navigate(`/bus-management/edit/${busId}`);
  };

  const handleRevertToRoutine = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/buses/set-default-buses"
      );
      if (response.status === 200) {
        console.log("UPDATE SUCCESSFUL:", response.data);
        navigate("/default-routes");
      }
    } catch (error) {
      console.error("Error reverting to routine:", error);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          textAlign: "center",
          padding: "2rem",
          fontSize: "1.5rem",
          color: "#333",
        }}
      >
        Loading buses...
      </Box>
    );
  }

  return (
    <Box sx={{ m: 0, p: 0 }}>
      {/* Full-width Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#114fa3",
          width: "100%",
          py: 1,
          px: 2,
        }}
      >
        {/* Logo + Heading */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <img
            src={ssnLogo}
            alt="SSN Logo"
            style={{
              width: 55,
              height: 55,
              borderRadius: 10,
              objectFit: "cover",
            }}
          />
          <Typography variant="h4" sx={{ fontWeight: "bold", color: "#fff" }}>
            Edit Bus Routes
          </Typography>
        </Box>

        {/* Search + Button */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
            label="Search by Bus Number"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ backgroundColor: "#fff", borderRadius: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleRevertToRoutine}
          >
            Revert to Routine
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4, minHeight: "100vh" }}>
        <Grid container spacing={3} justifyContent="center">
          {filteredBuses.length > 0 ? (
            filteredBuses.map((bus) => (
              <Grid item key={bus.id}>
                <BusCard onClick={() => handleBusClick(bus.id)}>
                  <IconWrapper>
                    <DirectionsBus />
                  </IconWrapper>
                  <Typography
                    variant="h6"
                    sx={{ mb: 1, fontWeight: "bold", color: "text.primary" }}
                  >
                    Bus {bus.busNo}
                  </Typography>
                </BusCard>
              </Grid>
            ))
          ) : (
            <Typography
              variant="body1"
              sx={{ color: "#888", textAlign: "center", width: "100%", mt: 4 }}
            >
              No matching buses found.
            </Typography>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default BusManagement;
