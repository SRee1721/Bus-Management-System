import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Delete, Edit, Save, Add } from "@mui/icons-material";

const StyledPaper = ({ children }) => (
  <Paper
    elevation={3}
    sx={{
      padding: 3,
      marginBottom: 3,
      borderRadius: 2,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      backgroundColor: "#f9f9f9",
    }}
  >
    {children}
  </Paper>
);

const EditBus = () => {
  const { busId } = useParams();

  const [bus, setBus] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [stops, setStops] = useState([]);
  const [copyStops, setCopyStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newStopDetails, setNewStopDetails] = useState({
    name: "",
    lat: "",
    lng: "",
  });
  const [refresh, setRefresh] = useState(false);

  // Fetch bus and stops
  useEffect(() => {
    const fetchData = async () => {
      try {
        const busRes = await axios.get(
          `http://localhost:5000/api/buses/${busId}`
        );
        const busData = busRes.data;
        setBus(busData);
        setRouteId(busData.current_route_no);

        const routeType = busData.isDefault ? "default" : "copy";
        const stopsRes = await axios.get(
          `http://localhost:5000/api/routes/${busData.current_route_no}/stops?source=${routeType}`
        );
        const stopsData = stopsRes.data.stops;
        setStops(stopsData);
        setCopyStops(stopsData);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [busId, refresh]);

  // Delete stop
  const handleDeleteStop = async (stopName) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/delete/${stopName}`
      );
      if (response.status === 200) {
        setCopyStops(copyStops.filter((stop) => stop !== stopName));
      } else {
        console.error("Failed to delete stop");
      }
    } catch (error) {
      console.error("Error deleting stop:", error);
    }
  };

  // Clear all stops
  const handleClearAll = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all stops? This cannot be undone."
      )
    ) {
      setCopyStops([]);
    }
  };

  // Add stop dialog
  const handleAddStopClick = () => {
    setNewStopDetails({ name: "", lat: "", lng: "" });
    setOpenAddDialog(true);
  };

  const handleNewStopDetailsChange = (field) => (event) => {
    setNewStopDetails({ ...newStopDetails, [field]: event.target.value });
  };

  const handleAddStopConfirm = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/stops/add", {
        stopname: newStopDetails.name,
        lat: Number(newStopDetails.lat),
        lng: Number(newStopDetails.lng),
      });
      setCopyStops([...copyStops, res.data.stopname]);
      setOpenAddDialog(false);
    } catch (error) {
      console.error("Error adding new stop:", error);
      alert("Failed to add new stop");
    }
  };

  // Save stops
  const handleSave = async () => {
    try {
      const stopsChanged = JSON.stringify(copyStops) !== JSON.stringify(stops);

      await axios.post(
        `http://localhost:5000/api/routes/${routeId}/save-stops`,
        {
          stops: copyStops,
        }
      );

      if (stopsChanged) {
        await axios.post(
          `http://localhost:5000/api/buses/${busId}/set-default`,
          {
            isDefault: false,
          }
        );
      }

      setStops(copyStops);
      setEditMode(false);
      alert("Stops saved successfully");
    } catch (error) {
      console.error("Error saving stops:", error);
      alert("Failed to save stops");
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <StyledPaper>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            Bus {bus?.bus_no}
          </Typography>
          <Button
            variant="outlined"
            color="secondary"
            onClick={async () => {
              try {
                await axios.post(
                  `http://localhost:5000/api/buses/${busId}/set-default`,
                  { isDefault: true }
                );
                setRefresh(!refresh);
                alert("Reverted to routine successfully");
              } catch (error) {
                console.error("Error reverting to routine:", error);
                alert("Failed to revert to routine");
              }
            }}
          >
            Revert to Routine
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          {!editMode ? (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditMode(true)}
            >
              Edit Stops
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Save />}
                onClick={handleSave}
                sx={{ mr: 2 }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setCopyStops(stops);
                  setEditMode(false);
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </Box>

        <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: "#fff" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Bus Stops ({copyStops.length})
            </Typography>
            {editMode && copyStops.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleClearAll}
                startIcon={<Delete />}
              >
                Clear All
              </Button>
            )}
          </Box>
          <List>
            {copyStops.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No stops assigned to this bus"
                  sx={{ textAlign: "center", color: "text.secondary" }}
                />
              </ListItem>
            ) : (
              copyStops.map((stop, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    editMode && (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteStop(stop)}
                      >
                        <Delete />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText primary={`${index + 1}. ${stop}`} />
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        {editMode && (
          <>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddStopClick}
              sx={{ mt: 2 }}
            >
              Add Stop
            </Button>

            <Dialog
              open={openAddDialog}
              onClose={() => setOpenAddDialog(false)}
            >
              <DialogTitle>Add Stop</DialogTitle>
              <DialogContent>
                <TextField
                  label="Stop Name"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={newStopDetails.name}
                  onChange={handleNewStopDetailsChange("name")}
                />
                <TextField
                  label="Latitude"
                  fullWidth
                  sx={{ mt: 2 }}
                  type="number"
                  value={newStopDetails.lat}
                  onChange={handleNewStopDetailsChange("lat")}
                />
                <TextField
                  label="Longitude"
                  fullWidth
                  sx={{ mt: 2 }}
                  type="number"
                  value={newStopDetails.lng}
                  onChange={handleNewStopDetailsChange("lng")}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddStopConfirm} variant="contained">
                  Add
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </StyledPaper>
    </Container>
  );
};

export default EditBus;
