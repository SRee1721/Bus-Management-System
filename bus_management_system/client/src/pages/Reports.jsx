import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  AppBar,
  Toolbar,
  Button,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { CardActionArea } from "@mui/material";
import {
  CloudDownload,
  DirectionsBus,
  Person,
  LocationOn,
  CheckCircle,
} from "@mui/icons-material";
import { jsPDF } from "jspdf";
import ssnLogo from "../assets/snf.png";

const Reports = () => {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime] = useState(new Date());
  const [showReportGenerators, setShowReportGenerators] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all buses
  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/buses");
        const busList = await response.json();
        console.log("BUSES LIST : ", busList);
        setBuses(busList);
        if (busList.length > 0) {
          setSelectedBus(busList[0]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching buses:", err);
        setError("Failed to fetch bus data");
        setLoading(false);
      }
    };
    fetchBuses();
  }, []);

  // Fetch attendance data for selected bus
  useEffect(() => {
    if (!selectedBus) return;

    const fetchAttendanceData = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/attendance/${selectedBus.bus_no}/daily`
        );

        if (response.ok) {
          const data = await response.json();
          console.log("DAILY ATTENDANCE :", data);
          setAttendanceData(data);
        } else {
          setAttendanceData({
            totalStudents: 50,
            attendees: [],
            hostellerCount: 0,
            dayScholarCount: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        setAttendanceData({
          totalStudents: 50,
          attendees: [],
          hostellerCount: 0,
          dayScholarCount: 0,
        });
      }
    };

    fetchAttendanceData();
  }, [selectedBus]);

  const handleBusChange = (event) => {
    const busId = event.target.value;
    const bus = buses.find((b) => b.id === busId);
    setSelectedBus(bus);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleGenerateReport = async (period) => {
    if (isGenerating) return;
    setIsGenerating(true);
    const pdf = new jsPDF();

    const formatDate = (d) => d.toISOString().slice(0, 10);
    const formatDateLocal = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const startOfDay = (d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const addHeader = (text) => {
      pdf.setFontSize(18);
      pdf.text(text, 105, 18, { align: "center" });
      pdf.setFontSize(11);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, 26, {
        align: "center",
      });
    };

    const ensurePage = (y) => {
      if (y > 280) {
        pdf.addPage();
        return 20;
      }
      return y;
    };

    try {
      const today = startOfDay(new Date());
      let dates = [];
      if (period === "Daily") {
        dates = [formatDate(today)];
      } else if (period === "Weekly") {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          dates.push(formatDate(d));
        }
      } else if (period === "Monthly") {
        for (let i = 30; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          dates.push(formatDate(d));
        }
      }

      const baseUrl = "http://localhost:5000";
      const busesRes = await fetch(`${baseUrl}/api/buses`);
      const busesList = await busesRes.json();
      const busNos = (busesList || []).map((b) => b.bus_no).filter(Boolean);

      const allReports = [];
      if (period === "Daily") {
        const dateStr = dates[0];
        for (const busNo of busNos) {
          const r = await fetch(
            `${baseUrl}/api/attendance/${encodeURIComponent(
              busNo
            )}/daily?date=${dateStr}`
          );
          const data = await r.json();
          console.log("DAILY REPORT : ", data);
          allReports.push({
            bus_no: busNo,
            days: [
              {
                date: data.date,
                attendees: data.attendees || [],
                count: (data.attendees || []).length,
              },
            ],
          });
        }
      } else if (period === "Weekly") {
        for (const busNo of busNos) {
          const r = await fetch(
            `${baseUrl}/api/attendance/${encodeURIComponent(busNo)}/weekly`
          );
          const data = await r.json();
          console.log("WEEKLY REPORT : ", data);
          const days = (data.days || []).map((d) => ({
            date: d.date,
            attendees: d.attendees || [],
            count: (d.attendees || []).length,
          }));
          allReports.push({ bus_no: busNo, days });
        }
      } else if (period === "Monthly") {
        for (const busNo of busNos) {
          const r = await fetch(
            `${baseUrl}/api/attendance/${encodeURIComponent(busNo)}/monthly`
          );
          const data = await r.json();
          console.log("MONTHLY REPORT : ", data);
          const days = (data.days || []).map((d) => ({
            date: d.date,
            attendees: d.attendees || [],
            count: (d.attendees || []).length,
          }));
          allReports.push({ bus_no: busNo, days });
        }
      }

      if (period === "Daily")
        addHeader(`Bus Report - Daily (${formatDateLocal(today)})`);
      if (period === "Weekly") addHeader("Bus Report - Weekly (last 7 days)");
      if (period === "Monthly")
        addHeader("Bus Report - Monthly (last 31 days)");

      let y = 36;
      for (const report of allReports) {
        y = ensurePage(y);
        pdf.setFontSize(13);
        pdf.text(`Bus No: ${report.bus_no}`, 20, y);
        y += 7;
        pdf.setFontSize(11);
        const sortedDays = (report.days || [])
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date));
        for (const day of sortedDays) {
          y = ensurePage(y);
          pdf.text(
            `Date: ${day.date}  |  Attendances count: ${day.count}`,
            28,
            y
          );
          y += 6;
          if (day.attendees.length) {
            pdf.setFontSize(10);
            pdf.text("Names:", 32, y);
            y += 5;
            for (const a of day.attendees) {
              y = ensurePage(y);
              pdf.text(`- ${a.name} (${a.role})`, 36, y);
              y += 5;
            }
            pdf.setFontSize(11);
          }
          y += 2;
        }
        y += 4;
      }

      const filename = `bus_report_${period.toLowerCase()}_${formatDateLocal(
        today
      )}.pdf`;
      pdf.save(filename);
    } catch (e) {
      console.error("Failed to generate PDF:", e);
      try {
        pdf.setFontSize(14);
        pdf.text("Failed to generate report. See console for details.", 20, 40);
        pdf.save(`bus_report_error_${Date.now()}.pdf`);
      } catch {}
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
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
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Left Sidebar */}
      <Box
        sx={{
          width: 250,
          bgcolor: "#fff",
          borderRight: "1px solid #e0e0e0",
          p: 2,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "#114fa3", mb: 1 }}
          >
            All Buses
          </Typography>
          <DirectionsBus sx={{ color: "#114fa3" }} />
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel>Select Bus</InputLabel>
          <Select
            value={selectedBus?.id || ""}
            onChange={handleBusChange}
            label="Select Bus"
          >
            {buses.map((bus) => (
              <MenuItem key={bus.id} value={bus.id}>
                Bus {bus.bus_no}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ mt: 2 }}>
          <Button
            variant={showReportGenerators ? "contained" : "outlined"}
            color="primary"
            fullWidth
            onClick={() => setShowReportGenerators((v) => !v)}
          >
            {showReportGenerators ? "Back to Overview" : "Reports Generation"}
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <AppBar position="static" sx={{ bgcolor: "#114fa3" }}>
          <Toolbar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Bus Report - Bus No: {selectedBus?.bus_no}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Entry Time:{" "}
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<CloudDownload />}
              sx={{
                bgcolor: "#fff",
                color: "#114fa3",
                "&:hover": { bgcolor: "#f5f5f5" },
              }}
            >
              Download PDF
            </Button>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ flex: 1, p: 3, overflow: "auto" }}>
          {!showReportGenerators && (
            <>
              {/* Summary Cards */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 2,
                  mb: 3,
                }}
              >
                <Card sx={{ bgcolor: "#fff" }}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: "bold", color: "#114fa3" }}
                    >
                      {attendanceData?.totalStudents || 50}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      TOTAL STUDENTS
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ bgcolor: "#e8f5e8" }}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: "bold", color: "#2e7d32" }}
                    >
                      {attendanceData?.attendees?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ATTENDEES
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Route Covered */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <LocationOn sx={{ color: "#d32f2f", mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Route Covered
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {routeData?.stops?.map((stop, index) => (
                      <Chip
                        key={index}
                        label={stop}
                        variant="outlined"
                        sx={{ bgcolor: "#f5f5f5" }}
                      />
                    )) || (
                      <Typography variant="body2" color="text.secondary">
                        No route assigned
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Attendees List */}
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <CheckCircle sx={{ color: "#2e7d32", mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Attendees ({attendanceData?.attendees?.length || 0})
                    </Typography>
                  </Box>
                  <List>
                    {attendanceData?.attendees?.map((attendee, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "#2e7d32" }}>
                            <Person />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={attendee.name}
                          secondary={`${attendee.role} • ${formatTime(
                            attendee.timestamp
                          )}`}
                        />
                      </ListItem>
                    ))}
                    {(!attendanceData?.attendees ||
                      attendanceData.attendees.length === 0) && (
                      <ListItem>
                        <ListItemText
                          primary="No attendees recorded"
                          sx={{ textAlign: "center", color: "text.secondary" }}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </>
          )}

          {showReportGenerators && (
            <>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 2, textAlign: "center" }}
              >
                Reports
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "60vh",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 3,
                    maxWidth: 960,
                    width: "100%",
                  }}
                >
                  <Card>
                    <CardActionArea
                      onClick={() => handleGenerateReport("Daily")}
                      role="button"
                      aria-label="Download daily report"
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          minHeight: 240,
                        }}
                      >
                        <CloudDownload />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Daily Reports Download
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                  <Card>
                    <CardActionArea
                      onClick={() => handleGenerateReport("Weekly")}
                      role="button"
                      aria-label="Download weekly report"
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          minHeight: 240,
                        }}
                      >
                        <CloudDownload />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Weekly Reports Download
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                  <Card>
                    <CardActionArea
                      onClick={() => handleGenerateReport("Monthly")}
                      role="button"
                      aria-label="Download monthly report"
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          minHeight: 240,
                        }}
                      >
                        <CloudDownload />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Monthly Reports Download
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Reports;
