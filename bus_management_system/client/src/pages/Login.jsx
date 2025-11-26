import React, { useState } from "react";
// import { signInWithEmailAndPassword } from 'firebase/auth';
// import { auth } from '../firebase/config';
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import ssnLogo from "../assets/snf.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      // Call backend API for authentication
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }
      const data = await response.json();
      const { token } = data;
      const expiry = new Date().getTime() + 30 * 60 * 1000; // 30 minutes

      localStorage.setItem("email", email);
      localStorage.setItem("token", token);
      localStorage.setItem("sessionExpiry", expiry);

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f6fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            background: "#fff",
            borderRadius: "1rem",
            boxShadow: "0 8px 32px rgba(10,25,49,0.10)",
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            width: "100%",
            maxWidth: 440,
            position: "relative",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "#22223b", letterSpacing: 0.5 }}
            >
              Scholar Commute Admin
            </Typography>
            <Box sx={{ ml: 2, background: "#fff", borderRadius: 2, p: 0.5 }}>
              <img
                src={ssnLogo}
                alt="SSN Logo"
                style={{ width: 100, height: 100, borderRadius: 12 }}
              />
            </Box>
          </Box>
          <form onSubmit={handleLogin} style={{ width: "100%" }}>
            <Typography
              sx={{ fontWeight: 600, color: "#22223b", mb: 0.5, mt: 2 }}
            >
              Email
            </Typography>
            <TextField
              placeholder="example@ssn.edu.in"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="dense"
              required
              InputProps={{ style: { background: "#f8fafc", borderRadius: 8 } }}
            />
            <Typography
              sx={{ fontWeight: 600, color: "#22223b", mb: 0.5, mt: 2 }}
            >
              Password
            </Typography>
            <TextField
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="dense"
              required
              InputProps={{ style: { background: "#f8fafc", borderRadius: 8 } }}
            />
            <Box sx={{ mt: 1, mb: 2 }}>
              <Button
                variant="text"
                sx={{
                  color: "#114fa3",
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "1rem",
                  pl: 0,
                }}
                disableRipple
              >
                Forgot Password?
              </Button>
            </Box>
            {errorMsg && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {errorMsg}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              sx={{
                mt: 1,
                fontWeight: 700,
                fontSize: "1.1rem",
                background: "#114fa3",
                color: "#fff",
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(10,25,49,0.08)",
                "&:hover": { background: "#0a3570" },
                py: 1.2,
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
