import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const expiry = localStorage.getItem("sessionExpiry");
        if (!token || !expiry || new Date().getTime() > Number(expiry)) {
          throw new Error("No valid session");
        }
        // Optionally, verify token with backend
        // const response = await fetch('http://localhost:5000/api/verify', {
        //   method: 'POST',
        //   headers: { 'Authorization': `Bearer ${token}` }
        // });
        // if (!response.ok) throw new Error('Token invalid');
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.clear();
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    // Show loading state while checking authentication
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
