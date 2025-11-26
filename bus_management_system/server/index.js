const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const admin = require("firebase-admin");
const multer = require("multer");
const xlsx = require("xlsx");
require("dotenv").config();
console.log(
  "FIREBASE_PRIVATE_KEY:",
  process.env.FIREBASE_PRIVATE_KEY ? "Loaded" : "Missing"
);
console.log("FIREBASE_TYPE:", process.env.FIREBASE_TYPE ? "Loaded" : "Missing");

// Initialize Firebase Admin with env vars instead of JSON file
//check these out
admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url:
      process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  }),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.firestore();
const real_db = admin.database();

const app = express();
app.use(cors());
app.use(express.json()); //check these out
app.use(morgan("dev")); //check these out
const upload = multer({ dest: "uploads/" });
// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/checkout/health", (req, res) => res.json({ hi: "srini" }));
// app.get("/get_buses", async (req, res) => {
//   const docsnapshot = db.collection("attendance_logs").doc("bus_no_14");
//   const dateCollection = await docsnapshot.get();
//   console.log(dateCollection);
//   const result = [];
//   const data = dateCollection.data();
//   for (const [date, attendanceMap] of Object.entries(data)) {
//     result.push({ [date]: attendanceMap });
//   }

//   res.json({ result });
// });
// Get all buses
app.get("/api/buses", async (req, res) => {
  try {
    const snapshot = await db.collection("buses").get();
    console.log(snapshot);
    const buses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(buses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch buses" });
  }
});

// Get all routes
app.get("/api/routes", async (req, res) => {
  try {
    const snapshot = await db.collection("default_routes").get();
    const routes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(routes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
});

// Get all stops (support single document with all stops as fields)
app.get("/api/stops", async (req, res) => {
  try {
    // Try to fetch a document with all stops as fields
    const stopsDoc = await db.collection("stops").doc("all").get();
    if (stopsDoc.exists) {
      const data = stopsDoc.data();
      // Convert fields to array of { name, map }
      const stops = Object.entries(data).map(([name, map]) => ({ name, map }));
      return res.json(stops);
    }
    // Fallback: return all documents as before
    const snapshot = await db.collection("stops").get();
    const stops = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(stops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stops" });
  }
});

// Get a single route by ID (for bus details)
app.get("/api/routes/:id", async (req, res) => {
  try {
    let isDefault, bus_no, bus, route;
    route = req.params.id;
    bus = req.params.id.split("_");
    bus_no = `bus_no_${bus[bus.length - 1]}`;
    console.log("BUS NO :", bus_no);
    const busRef = db.collection("buses").doc(bus_no);
    const busDoc = await busRef.get();
    if (!busDoc.exists) {
      console.log("No such bus!");
    } else {
      const data = busDoc.data();
      console.log("BUS DATA :", ":", data);
      isDefault = data.isDefault;
      console.log("isDefault:", isDefault);
    }
    let docRef;
    if (isDefault) {
      docRef = db.collection("default_routes").doc(route);
    } else {
      docRef = db.collection("copy_routes").doc(route);
    }
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Route not found" });
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch route" });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    // Use Firebase Auth REST API to sign in
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await response.json();
    if (!response.ok) {
      return res
        .status(401)
        .json({ error: data.error?.message || "Invalid credentials" });
    }
    // Verify the ID token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(data.idToken);
    // You can add more custom claims or checks here if needed
    res.json({ token: data.idToken, uid: decodedToken.uid });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Token verification endpoint
app.post("/api/verify", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    res.json({ valid: true, uid: decoded.uid });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Get a single stop by name (case-insensitive, trimmed), supporting 'all' doc structure
app.get("/api/stops/:name", async (req, res) => {
  try {
    const nameParam = req.params.name.trim().toLowerCase();
    console.log(nameParam);
    // Try to fetch from the 'all' document
    const stopsDoc = await db.collection("stops").doc("lat_lng").get();
    if (stopsDoc.exists) {
      const data = stopsDoc.data();
      console.log(data);
      // Find the field matching the name (case-insensitive, trimmed)
      const foundKey = Object.keys(data).find((key) => key === nameParam);
      if (foundKey) {
        return res.json({ name: foundKey, map: data[foundKey] });
      }
    }
    // Fallback: search all documents
    const snapshot = await db.collection("stops").get();
    console.log("sN", snapshot);
    const stop = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .find((s) => s.name && s.name.trim().toLowerCase() === nameParam);
    if (!stop) {
      return res.status(404).json({ error: "Stop not found" });
    }
    res.json(stop);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stop" });
  }
});
app.get("/api/routes/:id/stops", async (req, res) => {
  const id = req.params.id; //if needed change this here
  const { source } = req.query;
  if (!source) {
    return res.status(400).json({ error: "Source is required" });
  }

  try {
    const colName = source === "copy" ? "copy_routes" : "default_routes";
    const docSnap = await db.collection(colName).doc(id).get();
    if (!docSnap.exists) {
      return res.json({ stops: [] });
    }
    const data = docSnap.data();
    res.json({ stops: data.stops || [] });
  } catch (error) {
    console.error("ERROR FETCHING ROUTE STOP", error);
    res.status(500).json({ error: "Failed to fetch stops" });
  }
});

// Get all stops with lat/lng for a given route_id
app.get("/api/routes/:id/stop-coords", async (req, res) => {
  try {
    // 1. Fetch the route
    const routeDoc = await db
      .collection("default_routes")
      .doc(req.params.id)
      .get();
    if (!routeDoc.exists) {
      return res.status(404).json({ error: "Route not found" });
    }
    const routeData = routeDoc.data();
    const stopNames = routeData.stops || [];

    // 2. Fetch the stops/lat_lng document
    const stopsDoc = await db.collection("stops").doc("lat_lng").get();
    if (!stopsDoc.exists) {
      return res.status(404).json({ error: "Stops data not found" });
    }
    const stopsData = stopsDoc.data();
    // Build a normalized lookup for stop names
    const stopsLookup = {};
    Object.keys(stopsData).forEach((key) => {
      stopsLookup[key.trim().toLowerCase()] = stopsData[key];
    });

    // 3. Map stop names to coordinates (robust match)
    const stopsWithCoords = stopNames.map((name) => {
      const normName = name.trim().toLowerCase();
      const coords = stopsLookup[normName];
      if (coords && coords[0] && coords[1]) {
        return { name, lat: coords[0], lng: coords[1] };
      }
      console.warn("No lat/lng for stop:", name);
      return { name, lat: null, lng: null };
    });

    res.json(stopsWithCoords);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stop coordinates" });
  }
});
app.post("/api/buses/set-default-buses", async (req, res) => {
  try {
    const busesSnapshot = await db.collection("buses").get();
    const batch = db.batch();
    busesSnapshot.forEach((docSnap) => {
      const busRef = db.collection("buses").doc(docSnap.id);
      batch.update(busRef, { isDefault: true });
    });
    await batch.commit();
    res.status(200).json({ message: "All buses updated with isDefault: true" });
  } catch (error) {
    console.error("Error updating buses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/buses/:id", async (req, res) => {
  const busId = req.params.id;

  if (!busId) {
    return res.status(400).json({ error: "Bus ID is required" });
  }

  console.log("Fetching bus with ID:", busId);

  try {
    // print(req.params);
    const busRef = db.collection("buses").doc(busId);
    const busSnap = await busRef.get();
    if (!busSnap.exists) {
      return res.status(404).json({ error: "Bus not found" });
    }
    console.log(busSnap.data());
    res.json({ id: busSnap.id, ...busSnap.data() });
  } catch (error) {
    console.error("Error fetching bus:", error);
    res.status(500).json({ error: "Failed to fetch bus" });
  }
});
app.post("/api/buses/:id/set-default", async (req, res) => {
  const id = req.params.id;

  const value = req.body;
  console.log(value["isDefault"]);
  if (!id) {
    return res.status(404).json({ error: "Failed to revert" });
  }

  try {
    await db
      .collection("buses")
      .doc(id)
      .update({ isDefault: value["isDefault"] });
    res.json({ message: `Bus ${id} is Default set to ${value} ` });
  } catch (error) {
    console.error("Error updating isDefault:", error);
    res.status(500).json({ error: "Failed to update bus default state" });
  }
});

app.post("/api/stops/add", async (req, res) => {
  const { stopname, lat, lng } = req.body;
  console.log(lat, lng);
  try {
    console.log("SAVING THE STOPSS");

    const ref = await db
      .collection("stops")
      .doc("lat_lng")
      .set(
        {
          [stopname]: { 0: lat, 1: lng }, // stopname acts as the key
        },
        { merge: true } // keeps existing stops
      );
    res.status(201).json({ id: ref.id, stopname, lat, lng });
  } catch (error) {
    console.error("Error adding stop:", error);
    res.status(500).json({ error: "Failed to add stop" });
  }
});
app.delete("/api/delete/:stopname", async (req, res) => {
  const stopname = req.params.stopname;
  console.log("STOPNAME :", stopname);
  try {
    const docRef = db.collection("stops").doc("lat_lng");

    // Update the document by deleting the field
    await docRef.update({
      [stopname]: admin.firestore.FieldValue.delete(),
    });

    res.status(200).json({ message: `Stop ${stopname} deleted successfully` });
  } catch (error) {
    console.error("Error deleting stop:", error);
    res.status(500).json({ error: "Failed to delete stop" });
  }
});
// POST /api/routes/:routeId/restore-default-stops
// Body: { stops: [{name, lat, lng}, ...] }
app.post("/api/routes/:routeId/restore-default-stops", async (req, res) => {
  const { routeId } = req.params;
  const { stops } = req.body;

  try {
    for (const stop of stops) {
      // Check if stop exists
      const existing = await StopsCollection.doc(stop.name).get();
      if (!existing.exists) {
        await StopsCollection.doc(stop.name).set({
          lat: stop.lat,
          lng: stop.lng,
        });
      }
    }
    res.status(200).send({ message: "Default stops restored" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to restore stops" });
  }
});

app.post("/api/routes/:routeId/save-stops", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { stops } = req.body;

    const routeRef = db.collection("copy_routes").doc(routeId);

    const docSnap = await routeRef.get();
    if (docSnap.exists) {
      await routeRef.update({ stops });
    } else {
      await routeRef.set({ stops });
    }

    res.status(200).json({ message: "Stops saved successfully" });
  } catch (error) {
    console.error("Error saving stops:", error);
    res.status(500).json({ error: "Failed to save stops" });
  }
});
app.post("/api/notifications", async (req, res) => {
  const { message } = req.body;
  const timestamp = Date.now().toString();

  try {
    await db.collection("notifications").doc(timestamp).set({
      message,
      timestamp: new Date().toISOString(),
    });
    res.json({ message: "Notification added" });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let createdUsers = [];

    for (const row of rows) {
      const email = row.mail;
      const password = row.password;
      const role = row.role; // DayScholar_Student, Hosteller_Student, Teacher

      try {
        const user = await admin.auth().createUser({
          email,
          password,
        });

        // Assign role as custom claim
        await admin.auth().setCustomUserClaims(user.uid, { role });

        createdUsers.push({ email, role, status: "created" });
      } catch (err) {
        createdUsers.push({ email, role, status: "error", error: err.message });
      }
    }

    res.json({ message: "Upload processed", createdUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/live-buses", async (req, res) => {
  try {
    const ref = real_db.ref("bus_locations");
    const snapshot = await ref.once("value");
    const data = snapshot.val() || {};
    res.json(data);
  } catch (error) {
    console.error("Error fetching live bus data:", error);
    res.status(500).json({ error: "Failed to fetch bus data" });
  }
});

// ✅ Example: Update bus location from IoT/Raspberry Pi
app.post("/api/update-location", async (req, res) => {
  try {
    const { busId, latitude, longitude, timestamp } = req.body;

    if (!busId || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ref = real_db.ref(`bus_locations/${busId}`);
    await ref.set({
      latitude,
      longitude,
      timestamp: timestamp || Date.now(),
    });

    res.json({ success: true, message: "Bus location updated" });
  } catch (error) {
    console.error("Error updating bus location:", error);
    res.status(500).json({ error: "Failed to update bus location" });
  }
});
app.get("/api/bus-monitor/:bus_no", async (req, res) => {
  const busNo = req.params.bus_no;
  console.log("Requested busNo:", busNo);

  try {
    const refPath = `bus-monitor/${busNo}`;
    console.log("Firebase path:", refPath);

    const snapshot = await real_db.ref(refPath).once("value");
    const url = snapshot.val();
    console.log("Fetched URL:", url);

    if (url) {
      res.json({ url });
    } else {
      console.log("URL not found");
      res.status(404).json({ error: "URL not found for this bus number" });
    }
  } catch (error) {
    console.error("Firebase error:", error);
    res.status(500).json({ error: "Failed to fetch URL" });
  }
});
/* ------------------------------------------------------------------
   🔥 Helper Function — Fetch attendance for a single bus & date
------------------------------------------------------------------ */
async function fetchAttendanceForDate(busNo, dateStr) {
  const dateCollection = db
    .collection("attendance_logs")
    .doc(`bus_no_${busNo}`)
    .collection(dateStr);

  // fetch both documents at the same time
  const [hostellerDoc, dayscholarDoc] = await Promise.all([
    dateCollection.doc("hosteller").get(),
    dateCollection.doc("dayscholar").get(),
  ]);

  const hostellerData = hostellerDoc.exists ? hostellerDoc.data() : {};
  const dayscholarData = dayscholarDoc.exists ? dayscholarDoc.data() : {};

  const attendees = [];

  // HOSTELLERS
  Object.entries(hostellerData).forEach(([key, timestamp]) => {
    const [name, role] = key.split("@");
    attendees.push({ name, role, timestamp });
  });

  // DAYSCHOLARS
  Object.entries(dayscholarData).forEach(([key, timestamp]) => {
    const [email] = key.split("@");
    attendees.push({ name: email, role: "DAY_SCHOLAR", timestamp });
  });

  return {
    date: dateStr,
    attendees,
    totalAttendees: attendees.length,
  };
}

// /* ------------------------------------------------------------------
//    🚍 GET ALL BUSES — /api/buses
// ------------------------------------------------------------------ */
// app.get("/api/buses", async (req, res) => {
//   try {
//     const busSnap = await db.collection("buses").get();
//     const buses = busSnap.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     return res.json(buses);
//   } catch (err) {
//     console.error("Error fetching buses:", err);
//     res.status(500).json({ error: "Failed to fetch bus list" });
//   }
// });

/* ------------------------------------------------------------------
   📅 DAILY REPORT — /api/attendance/:busNo/daily?date=YYYY-MM-DD
------------------------------------------------------------------ */
app.get("/api/attendance/:busNo/daily", async (req, res) => {
  try {
    const busNo = req.params.busNo;
    const dateStr = req.query.date;

    if (!dateStr) {
      return res
        .status(400)
        .json({ error: "Missing ?date=YYYY-MM-DD parameter" });
    }

    const result = await fetchAttendanceForDate(busNo, dateStr);
    return res.json(result);
  } catch (err) {
    console.error("Daily report error:", err);
    res.status(500).json({ error: "Failed to fetch daily attendance" });
  }
});

/* ------------------------------------------------------------------
   📅 WEEKLY REPORT — /api/attendance/:busNo/weekly
------------------------------------------------------------------ */
app.get("/api/attendance/:busNo/weekly", async (req, res) => {
  try {
    const busNo = req.params.busNo;
    const today = new Date();

    const dateList = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dateList.push(d.toISOString().slice(0, 10));
    }

    // Run all fetches in parallel
    const results = await Promise.all(
      dateList.map((dateStr) => fetchAttendanceForDate(busNo, dateStr))
    );

    // Remove empty days
    const filtered = results.filter((r) => r.attendees.length > 0);

    return res.json({
      bus_no: busNo,
      days: filtered,
    });
  } catch (err) {
    console.error("Weekly report error:", err);
    res.status(500).json({ error: "Failed to fetch weekly attendance" });
  }
});

/* ------------------------------------------------------------------
   📅 MONTHLY REPORT — /api/attendance/:busNo/monthly
------------------------------------------------------------------ */
app.get("/api/attendance/:busNo/monthly", async (req, res) => {
  try {
    const busNo = req.params.busNo;
    const today = new Date();

    const dateList = [];
    for (let i = 0; i < 31; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dateList.push(d.toISOString().slice(0, 10));
    }

    // Parallel fetch
    const results = await Promise.all(
      dateList.map((dateStr) => fetchAttendanceForDate(busNo, dateStr))
    );

    const filtered = results.filter((r) => r.attendees.length > 0);

    return res.json({
      bus_no: busNo,
      days: filtered,
    });
  } catch (err) {
    console.error("Monthly report error:", err);
    res.status(500).json({ error: "Failed to fetch monthly attendance" });
  }
});
app.get('/api/stops', async (req, res) => {
  const stopsDoc = await db.collection('stops').doc('lat_lng').get();
  if (stopsDoc.exists) {
    const data = stopsDoc.data();

    const stops = Object.entries(data).map(([name, coords]) => {
      let lat = null;
      let lng = null;
      console.log("COORDS :", coords);
      lat = coords['0'];
      lng = coords['1'];

      return { name, lat, lng };
    });

    return res.json(stops);
  }
});

const PORT = process.env.PORT || 5000;
const real_db1 = admin.database();
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`, `REAL DB ${real_db1}`)
);
