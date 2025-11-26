import React, { useEffect, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Link,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { app, auth } from "../firebase/config";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export default function RegisterPage() {
  const [enabled, setEnabled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState(null);

  useEffect(() => {
    const db = getDatabase(app);
    const statusRef = ref(db, "site_status/enabled");
    console.log("Setting up Firebase listener for site status...");
    const unsubscribe = onValue(
      statusRef,
      (snapshot) => {
        const value = snapshot.val();
        console.log("Current site status from Firebase:", value);
        console.log("Setting enabled state to:", value);
        setEnabled(value);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading site status:", err);
        setError("Failed to load site status.");
        setLoading(false);
      }
    );
    return () => {
      console.log("Cleaning up Firebase listener...");
      unsubscribe();
    };
  }, []);

  const handleToggle = (event) => {
    console.log("Toggle clicked, new value:", event.target.checked);
    console.log("Current enabled state:", enabled);
    console.log("Auth user:", auth.currentUser);
    setPendingValue(event.target.checked);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    console.log("Confirming site status change to:", pendingValue);
    setConfirmOpen(false);
    setUpdating(true);
    setError("");
    try {
      const db = getDatabase(app);
      const statusRef = ref(db, "site_status/enabled");

      // Add console log to debug
      console.log("Updating site status to:", pendingValue);
      console.log("Firebase reference:", statusRef);

      await set(statusRef, pendingValue);
      console.log("Firebase set operation completed");

      // Don't manually set enabled here - let the Firebase listener handle it
      // setEnabled(pendingValue);

      // Add success log
      console.log("Site status updated successfully to:", pendingValue);
    } catch (err) {
      console.error("Error updating site status:", err);
      setError(err.message || "Failed to update site status.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingValue(null);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "linear-gradient(135deg, #e9f0fa 0%, #f5f6fa 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
      }}
    >
      <Container maxWidth="sm">
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
            maxWidth: 520,
            fontFamily: `'Montserrat', 'Inter', 'Segoe UI', 'system-ui', sans-serif`,
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
            Register Students
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
            Add and manage students for bus tracking
          </Typography>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              mb: 3,
            }}
          >
            <Link
              href="https://ssn-face-collector-2.onrender.com"
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{
                fontSize: "1.1rem",
                color: "#114fa3",
                fontWeight: 600,
                border: "1.5px solid #114fa3",
                borderRadius: 2,
                px: 2.5,
                py: 1.2,
                background: "#f5f7fa",
                transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
                boxShadow: "0 2px 8px rgba(17,79,163,0.06)",
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                "&:hover": {
                  background: "#114fa3",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(17,79,163,0.13)",
                },
              }}
            >
              Go to Registration Page{" "}
              <OpenInNewIcon sx={{ fontSize: 18, ml: 0.5 }} />
            </Link>
          </Box>
          <Divider sx={{ width: "100%", my: 3, bgcolor: "#e3e8f0" }} />
          <Box sx={{ mt: 2, width: "100%", textAlign: "center" }}>
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                color: "#22223b",
                fontWeight: 700,
                fontFamily: "inherit",
                fontSize: { xs: "1.08rem", sm: "1.18rem" },
              }}
            >
              Site Availability
            </Typography>
            {loading ? (
              <CircularProgress size={28} />
            ) : (
              <FormControlLabel
                control={
                  <Switch
                    checked={!!enabled}
                    onChange={handleToggle}
                    color="primary"
                    disabled={updating}
                    inputProps={{ "aria-label": "Enable/Disable site" }}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#114fa3",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        {
                          backgroundColor: "#114fa3",
                        },
                    }}
                  />
                }
                label={enabled ? "Enabled" : "Disabled"}
                sx={{
                  fontWeight: 600,
                  color: enabled ? "#114fa3" : "#b0b3b8",
                  mx: "auto",
                  fontSize: "1.05rem",
                }}
              />
            )}
            {updating && <CircularProgress size={20} sx={{ ml: 2 }} />}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
          <Dialog open={confirmOpen} onClose={handleCancel}>
            <DialogTitle sx={{ color: "#114fa3", fontWeight: 700 }}>
              Confirm Site Status Change
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to {pendingValue ? "enable" : "disable"}{" "}
                the site?
                {pendingValue === false && (
                  <>
                    <br />
                    Users will see a maintenance message and be unable to access
                    the site.
                  </>
                )}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancel} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                color={pendingValue ? "primary" : "error"}
                variant="contained"
                sx={{
                  fontWeight: 600,
                  background: pendingValue ? "#114fa3" : "#d32f2f",
                  "&:hover": {
                    background: pendingValue ? "#0a3570" : "#b71c1c",
                  },
                }}
              >
                {pendingValue ? "Enable" : "Disable"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </Box>
  );
}
