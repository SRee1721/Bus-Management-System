import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const Authenticate = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select an Excel file first.");
      return;
    }
    setLoading(true);
    setResults([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResults(data.createdUsers || []);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        width: "100%",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Upload Users (Excel)
      </Typography>

      <Button
        variant="contained"
        component="label"
        startIcon={<CloudUploadIcon />}
      >
        Choose File
        <input
          type="file"
          hidden
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
      </Button>

      {file && (
        <Typography variant="body2" color="text.secondary">
          Selected: {file.name}
        </Typography>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Upload"}
      </Button>

      {results.length > 0 && (
        <Box sx={{ mt: 3, width: "100%" }}>
          <Typography variant="subtitle1" gutterBottom>
            Upload Results:
          </Typography>
          <List dense>
            {results.map((r, i) => (
              <ListItem key={i}>
                <ListItemText
                  primary={`${r.email} (${r.role})`}
                  secondary={r.status}
                  sx={{
                    color: r.status === "created" ? "green" : "red",
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
};

export default Authenticate;
