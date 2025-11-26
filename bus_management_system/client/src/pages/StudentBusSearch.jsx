import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline,useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import { getDatabase, ref as dbRef, onValue, off } from 'firebase/database';
import { app as firebaseApp } from '../firebase/config';
import busPng from '../assets/bus.png';
import ssnLogo from '../assets/snf.png';

const busIcon = new L.Icon({
    iconUrl: busPng,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });
  
  // normal stop (all intermediate stops)
  const normalStopIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18],
  });
  
  // source stop – highlighted
  const sourceStopIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/252/252025.png',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
  
  // destination stop – highlighted
  const destinationStopIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/252/252039.png',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
  const defaultCenter = [12.83714, 80.05204];

function MapBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

const StudentBusSearch = () => {
  const [stops, setStops] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState({});
  const [sourceStop, setSourceStop] = useState('');
  const [destinationStop, setDestinationStop] = useState('');
  const [matchingBuses, setMatchingBuses] = useState([]);
  const [busLocations, setBusLocations] = useState({}); // { busId: { lat, lng } }
  const [loading, setLoading] = useState(true);
  const [loadingStops, setLoadingStops] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [stopCoords, setStopCoords] = useState({}); // { stopName: { lat, lng } }

  // Fetch all stops from stops/lat_lng document (field names are stop names)
  useEffect(() => {
    const fetchStops = async () => {
      setLoadingStops(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:5000/api/stops');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stopsData = await response.json();
        console.log('Stops data received:', stopsData);
        
        // API returns array of { name, lat, lng } from lat_lng document
        let stopsList = [];
        
        if (Array.isArray(stopsData)) {
          // Extract stop names from the array
          stopsList = stopsData
            .map(s => s.name)
            .filter(name => name && name.trim().length > 0);
        } else if (typeof stopsData === 'object' && stopsData !== null) {
          // Fallback: if it's an object, get keys (stop names)
          stopsList = Object.keys(stopsData).filter(key => key !== 'id');
        }
        
        // Remove duplicates and sort
        const uniqueStops = [...new Set(stopsList)].sort();
        
        console.log('Processed stops list:', uniqueStops);
        
        if (uniqueStops.length === 0) {
          setError('No stops found. Please check your database configuration.');
        } else {
          setStops(uniqueStops);
          // Also store coordinates for later use
          const coordsMap = {};
          if (Array.isArray(stopsData)) {
            stopsData.forEach(s => {
              if (s.name && s.lat && s.lng) {
                coordsMap[s.name] = { lat: s.lat, lng: s.lng };
              }
            });
          }
          setStopCoords(coordsMap);
        }
      } catch (err) {
        console.error('Error fetching stops:', err);
        setError(`Failed to load stops: ${err.message}`);
      } finally {
        setLoadingStops(false);
      }
    };
    fetchStops();
  }, []);

  // Fetch all buses and routes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch buses
        const busesRes = await fetch('http://localhost:5000/api/buses');
        const busesData = await busesRes.json();
        setBuses(busesData);

        // Fetch routes
        const routesRes = await fetch('http://localhost:5000/api/routes');
        const routesData = await routesRes.json();
        const routesMap = {};
        routesData.forEach(route => {
          routesMap[route.id] = route;
        });
        setRoutes(routesMap);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load bus data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Function to check if a route contains both stops in correct order
  const routeMatches = useCallback((routeStops, source, dest) => {
    if (!routeStops || !Array.isArray(routeStops)) return false;
    
    const normalize = (str) => str.trim().toLowerCase();
    const sourceNorm = normalize(source);
    const destNorm = normalize(dest);
    
    const sourceIndex = routeStops.findIndex(s => normalize(s) === sourceNorm);
    const destIndex = routeStops.findIndex(s => normalize(s) === destNorm);
    
    // Both stops must exist and source must come before destination
    return sourceIndex !== -1 && destIndex !== -1 ;
  }, []);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!sourceStop || !destinationStop) {
      setError('Please select both source and destination stops');
      return;
    }

    if (sourceStop === destinationStop) {
      setError('Source and destination cannot be the same');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      // Filter buses that have routes matching both stops
      const matching = [];
      
      for (const bus of buses) {
        if (!bus.current_route_no) continue;
        
        try {
          // Check if bus uses default or copy route
          // Bus document ID format is bus_no_X, so use bus.id directly
          const busRef = await fetch(`http://localhost:5000/api/buses/${bus.id}`);
          if (!busRef.ok) continue;
          const busData = await busRef.json();
          
          // Determine if bus uses default route (default to true if not set)
          let isDefault = true;
          if (typeof busData.isDefault === 'boolean') {
            isDefault = busData.isDefault;
          } else if (busData.isDefault && typeof busData.isDefault === 'object') {
            isDefault = !!busData.isDefault.value;
          } else if (busData.isDefault !== undefined && busData.isDefault !== null) {
            isDefault = Boolean(busData.isDefault);
          }
          
          // Fetch route stops from correct collection based on isDefault
          const source = isDefault ? 'default' : 'copy';
          const routeRes = await fetch(`http://localhost:5000/api/routes/${bus.current_route_no}/stops?source=${source}`);
          
          if (!routeRes.ok) {
            console.warn(`Route ${bus.current_route_no} not found in ${source}_routes`);
            continue;
          }
          const routeData = await routeRes.json();
          const routeStops = routeData.stops || [];
          
          // Check if route contains both stops in correct order
          if (routeMatches(routeStops, sourceStop, destinationStop)) {
            // Get coordinates from stopCoords state (already fetched from lat_lng document)
            // stopCoords structure: { "Stop Name": { lat: number, lng: number } }
            const routeCoords = routeStops
            .map((stopName) => {
              // Try exact match
              let coord = stopCoords[stopName];
        
              // If not found, try case-insensitive match
              if (!coord) {
                const key = Object.keys(stopCoords).find(
                  (k) => k.trim().toLowerCase() === stopName.trim().toLowerCase()
                );
                if (key) coord = stopCoords[key];
              }
        
              return coord && coord.lat && coord.lng
                ? [coord.lat, coord.lng]
                : null;
            })
            .filter(Boolean); // remove nulls
            let sourceCoords = null;
            let destCoords = null;
            
            // Try to find coordinates from state (exact match first)
            if (stopCoords[sourceStop] && stopCoords[sourceStop].lat && stopCoords[sourceStop].lng) {
              sourceCoords = [stopCoords[sourceStop].lat, stopCoords[sourceStop].lng];
            } else {
              // Try case-insensitive match
              const sourceKey = Object.keys(stopCoords).find(key => 
                key.trim().toLowerCase() === sourceStop.trim().toLowerCase()
              );
              if (sourceKey && stopCoords[sourceKey].lat && stopCoords[sourceKey].lng) {
                sourceCoords = [stopCoords[sourceKey].lat, stopCoords[sourceKey].lng];
              }
            }
            
            if (stopCoords[destinationStop] && stopCoords[destinationStop].lat && stopCoords[destinationStop].lng) {
              destCoords = [stopCoords[destinationStop].lat, stopCoords[destinationStop].lng];
            } else {
              // Try case-insensitive match
              const destKey = Object.keys(stopCoords).find(key => 
                key.trim().toLowerCase() === destinationStop.trim().toLowerCase()
              );
              if (destKey && stopCoords[destKey].lat && stopCoords[destKey].lng) {
                destCoords = [stopCoords[destKey].lat, stopCoords[destKey].lng];
              }
            }
            
            // If still not found, fetch from API as fallback
            if (!sourceCoords || !destCoords) {
              try {
                const stopsRes = await fetch('http://localhost:5000/api/stops');
                if (stopsRes.ok) {
                  const stopsData = await stopsRes.json();
                  if (Array.isArray(stopsData)) {
                    if (!sourceCoords) {
                      const sourceStopData = stopsData.find(s => 
                        s.name && s.name.trim().toLowerCase() === sourceStop.trim().toLowerCase()
                      );
                      if (sourceStopData && sourceStopData.lat && sourceStopData.lng) {
                        sourceCoords = [sourceStopData.lat, sourceStopData.lng];
                      }
                    }
                    if (!destCoords) {
                      const destStopData = stopsData.find(s => 
                        s.name && s.name.trim().toLowerCase() === destinationStop.trim().toLowerCase()
                      );
                      if (destStopData && destStopData.lat && destStopData.lng) {
                        destCoords = [destStopData.lat, destStopData.lng];
                      }
                    }
                  }
                }
              } catch (err) {
                console.warn('Could not fetch stop coordinates:', err);
              }
            }
            
            matching.push({
              ...bus,
              routeStops,
              sourceCoords,
              destCoords,
              routeCoords,
            });
          }
        } catch (err) {
          console.error(`Error processing bus ${bus.bus_no}:`, err);
          continue;
        }
      }

      setMatchingBuses(matching);

      // Calculate map bounds to show all matching buses and stops
      if (matching.length > 0) {
        const locations = [];
        matching.forEach(bus => {
          if (bus.current_location) {
            locations.push([bus.current_location.latitude, bus.current_location.longitude]);
          }
          if (bus.sourceCoords) locations.push(bus.sourceCoords);
          if (bus.destCoords) locations.push(bus.destCoords);
        });
        
        if (locations.length > 0) {
          const bounds = L.latLngBounds(locations);
          setMapBounds(bounds);
        }
      }
    } catch (err) {
      console.error('Error searching buses:', err);
      setError('Failed to search buses. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [sourceStop, destinationStop, buses, routeMatches,stopCoords]);

  // Set up real-time location listeners for matching buses
  useEffect(() => {
    if (matchingBuses.length === 0) {
      setBusLocations({});
      return;
    }

    const db = getDatabase(firebaseApp);
    const unsubscribeFunctions = [];

    matchingBuses.forEach(bus => {
      const busKey = `bus_no_${bus.bus_no}`;
      const locRef = dbRef(db, `bus_tracking/${busKey}/location`);
      
      const unsubscribe = onValue(locRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.latitude && data.longitude) {
          setBusLocations(prev => ({
            ...prev,
            [bus.id]: {
              lat: parseFloat(data.latitude),
              lng: parseFloat(data.longitude),
            }
          }));
        }
      });

      unsubscribeFunctions.push(() => off(locRef));
    });

    return () => {
      unsubscribeFunctions.forEach(fn => fn());
    };
  }, [matchingBuses]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: '#114fa3' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <DirectionsBusIcon sx={{ fontSize: 28 }} />
            <Typography variant="h6">
              Find Your Bus
            </Typography>
          </Box>
          <Box>
            <img 
              src={ssnLogo} 
              alt="SSN Logo" 
              style={{ height: 55, objectFit: 'contain', borderRadius: 10 }} 
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Search Form */}
      <Paper sx={{ p: 3, m: 2, borderRadius: 2, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200, flex: 1 }} disabled={loadingStops || stops.length === 0}>
            <InputLabel id="source-stop-label">Source Stop</InputLabel>
            <Select
              labelId="source-stop-label"
              value={sourceStop}
              label="Source Stop"
              onChange={(e) => setSourceStop(e.target.value)}
              displayEmpty
            >
              {loadingStops ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading stops...
                </MenuItem>
              ) : stops.length === 0 ? (
                <MenuItem disabled>No stops available</MenuItem>
              ) : (
                stops.map((stop) => (
                  <MenuItem key={stop} value={stop}>
                    {stop}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200, flex: 1 }} disabled={loadingStops || stops.length === 0}>
            <InputLabel id="dest-stop-label">Destination Stop</InputLabel>
            <Select
              labelId="dest-stop-label"
              value={destinationStop}
              label="Destination Stop"
              onChange={(e) => setDestinationStop(e.target.value)}
              displayEmpty
            >
              {loadingStops ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading stops...
                </MenuItem>
              ) : stops.length === 0 ? (
                <MenuItem disabled>No stops available</MenuItem>
              ) : (
                stops.map((stop) => (
                  <MenuItem key={stop} value={stop}>
                    {stop}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={searching || !sourceStop || !destinationStop}
            sx={{ minWidth: 150, height: 56 }}
          >
            {searching ? <CircularProgress size={24} /> : 'Search Buses'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Results Section */}
      <Box sx={{ display: 'flex', flex: 1, gap: 2, p: 2, overflow: 'hidden' }}>
        {/* Left Panel - Bus List */}
        <Box sx={{ 
          width: { xs: '100%', md: '30%' },
          minWidth: 280,
          maxWidth: 400,
          height: '100%',
          overflowY: 'auto',
          borderRight: { md: '1px solid #e5e7eb' },
          bgcolor: '#fff',
          borderRadius: 2,
          p: 2,
          boxShadow: 1,
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#114fa3' }}>
            Available Buses ({matchingBuses.length})
          </Typography>

          {matchingBuses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DirectionsBusIcon sx={{ fontSize: 64, color: '#b0b3b8', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {sourceStop && destinationStop 
                  ? 'No buses found for this route. Try different stops.'
                  : 'Select source and destination stops to search for buses'}
              </Typography>
            </Box>
          ) : (
            <List>
              {matchingBuses.map((bus, index) => {
                const liveLocation = busLocations[bus.id];
                const busPosition = liveLocation 
                  ? [liveLocation.lat, liveLocation.lng]
                  : (bus.current_location 
                    ? [bus.current_location.latitude, bus.current_location.longitude]
                    : null);

                return (
                  <React.Fragment key={bus.id}>
                    <Card sx={{ mb: 2, boxShadow: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <DirectionsBusIcon color="primary" />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Bus {bus.bus_no}
                          </Typography>
                          <Chip 
                            label={bus.status || 'Active'} 
                            color={bus.status === 'Active' ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                        
                        {busPosition && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <LocationOnIcon sx={{ fontSize: 16, verticalAlign: 'middle' }} />
                            Live tracking active
                          </Typography>
                        )}

                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Route:</strong> {bus.current_route_no || 'N/A'}
                        </Typography>

                        {bus.routeStops && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Stops: {bus.routeStops.length}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                    {index < matchingBuses.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>

        {/* Right Panel - Map */}
        <Box sx={{ 
          flex: 1, 
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 1,
          bgcolor: '#fff',
        }}>
          <MapContainer
            center={mapBounds ? mapBounds.getCenter() : defaultCenter}
            zoom={mapBounds ? 12 : 11}
            minZoom={10}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapBounds && <MapBounds bounds={mapBounds} />}

            
            {/* Bus Markers */}
{matchingBuses.map((bus) => {
  const liveLocation = busLocations[bus.id];
  const busPosition = liveLocation 
    ? [liveLocation.lat, liveLocation.lng]
    : (bus.current_location 
        ? [bus.current_location.latitude, bus.current_location.longitude]
        : null);

  if (!busPosition) return null;

  return (
    <Marker
      key={bus.id}
      position={busPosition}
      icon={busIcon}
    >
      <Popup>
        <Typography variant="subtitle2">Bus {bus.bus_no}</Typography>
        <Typography variant="body2">Route: {bus.current_route_no || 'N/A'}</Typography>
        <Typography variant="body2">Status: {bus.status || 'Active'}</Typography>
        {liveLocation && (
          <Typography variant="caption" color="success.main">
            Live Location
          </Typography>
        )}
      </Popup>
    </Marker>
  );
})}
{/* Route stop markers – show ALL stops, highlight source & destination */}
{matchingBuses.map((bus) =>
  bus.routeStops &&
  bus.routeCoords &&
  bus.routeStops.length === bus.routeCoords.length &&
  bus.routeStops.map((stopName, idx) => {
    const coord = bus.routeCoords[idx]; // [lat, lng]
    if (!coord) return null;

    const isSource =
      stopName.trim().toLowerCase() === sourceStop.trim().toLowerCase();
    const isDest =
      stopName.trim().toLowerCase() === destinationStop.trim().toLowerCase();

    return (
      <Marker
        key={`stop-${bus.id}-${idx}`}
        position={coord}
        icon={
          isSource
            ? sourceStopIcon
            : isDest
            ? destinationStopIcon
            : normalStopIcon
        }
      >
        <Popup>
          <Typography variant="subtitle2">{stopName}</Typography>
          {isSource && (
            <Typography variant="caption" color="primary">
              Source Stop
            </Typography>
          )}
          {isDest && (
            <Typography variant="caption" color="secondary">
              Destination Stop
            </Typography>
          )}
        </Popup>
      </Marker>
    );
  })
)}


{/* Route polylines for each matching bus */}
{matchingBuses.map((bus) =>
  bus.routeCoords && bus.routeCoords.length > 1 && (
    <Polyline
      key={`route-${bus.id}`}
      positions={bus.routeCoords}
    />
  )
)}

</MapContainer>

        </Box>
      </Box>
    </Box>
  );
};

export default StudentBusSearch;

