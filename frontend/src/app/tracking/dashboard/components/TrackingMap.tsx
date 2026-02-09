'use client';

/**
 * Tracking Map Component
 * Leaflet.js map showing real-time field officer locations
 */

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface TrackingSession {
  _id: string;
  session_id: string;
  employee_id: {
    name: string;
  };
  status: string;
  fraud_score: number;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

interface TrackingMapProps {
  sessions: TrackingSession[];
  routeData?: Array<{
    lat: number;
    lng: number;
    timestamp: string;
    is_mock?: boolean;
  }>;
}

export default function TrackingMap({ sessions, routeData = [] }: TrackingMapProps) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLayerRef = useRef<any>(null);
  const isInitialized = useRef(false);

  // Initialize map once on mount
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized.current) return;

    import('leaflet').then((L) => {
      const container = document.getElementById('tracking-map');
      if (!container) {
        console.warn('Map container not found');
        return;
      }

      // Check if container already has a map and remove it
      if ((container as any)._leaflet_id) {
        // Find and remove the map instance
        const mapId = (container as any)._leaflet_id;
        const maps = (L as any).Map._maps;
        if (maps && maps[mapId]) {
          try {
            maps[mapId].remove();
          } catch (e) {
            console.warn('Error removing old map:', e);
          }
        }
        // Clear the container's innerHTML
        container.innerHTML = '';
        delete (container as any)._leaflet_id;
      }

      try {
        const map = L.map('tracking-map', {
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
          boxZoom: true,
        }).setView([23.8103, 90.4125], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 3,
        }).addTo(map);

        mapRef.current = map;
        isInitialized.current = true;
        
        // Ensure map is properly sized after a short delay
        setTimeout(() => {
          if (mapRef.current) {
            try {
              mapRef.current.invalidateSize();
            } catch (e) {
              console.warn('Error invalidating map size:', e);
            }
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing map:', error);
        isInitialized.current = false;
      }
    });

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Map cleanup error:', e);
        }
        mapRef.current = null;
        isInitialized.current = false;
      }
    };
  }, []);

  // Update markers and routes when data changes
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      // Stop any ongoing animations
      mapRef.current.stop();

      // Small delay to ensure animations are stopped
      setTimeout(() => {
        if (!mapRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => {
          try { marker.remove(); } catch (e) {}
        });
        markersRef.current = [];

        // Clear existing markers
        markersRef.current.forEach(marker => {
          try { marker.remove(); } catch (e) {}
        });
        markersRef.current = [];

        // Add markers for each active session
        sessions.forEach((session) => {
          if (!session.current_location) return;

          const { latitude, longitude } = session.current_location;

          // Determine marker color based on fraud score
          const color = session.fraud_score > 50 ? 'red' : 
                       session.fraud_score > 30 ? 'orange' : 'green';

          const marker = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(mapRef.current!);

          marker.bindPopup(`
            <div style="min-width: 200px">
              <strong>${session.employee_id.name}</strong><br/>
              <small>${session.session_id}</small><br/>
              <span style="color: ${color}">Fraud Score: ${session.fraud_score}</span>
            </div>
          `);

          markersRef.current.push(marker);
        });

        // Draw route if route data is available
        if (routeData.length > 0) {
          // Remove previous route layer
          if (routeLayerRef.current && mapRef.current) {
            try {
              mapRef.current.removeLayer(routeLayerRef.current);
            } catch (e) {
              console.warn('Failed to remove previous route layer:', e);
            }
            routeLayerRef.current = null;
          }

          // Create polyline from route points - filter out invalid points
          const latLngs = routeData
            .filter(point => point && typeof point.lat === 'number' && typeof point.lng === 'number')
            .map(point => [point.lat, point.lng] as [number, number]);
          
          // Only proceed if we have valid coordinates
          if (latLngs.length > 0 && mapRef.current) {
            const polyline = L.polyline(latLngs, {
              color: '#2196f3',
              weight: 4,
              opacity: 0.7,
            });

            // Add start and end markers
            const startMarker = L.marker(latLngs[0], {
              icon: L.divIcon({
                className: 'custom-div-icon',
                html: '<div style="background-color: #4CAF50; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">S</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              }),
            });

            const endMarker = L.marker(latLngs[latLngs.length - 1], {
              icon: L.divIcon({
                className: 'custom-div-icon',
                html: '<div style="background-color: #f44336; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">E</div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              }),
            });

            // Create layer group and add to map
            routeLayerRef.current = L.layerGroup([polyline, startMarker, endMarker]);
            routeLayerRef.current.addTo(mapRef.current);
            
            // Fit map to route bounds
            try {
              mapRef.current.fitBounds(latLngs, { padding: [50, 50], animate: false });
            } catch (error) {
              console.error('Error fitting bounds:', error);
            }
          }
        } else if (routeLayerRef.current && mapRef.current) {
          // Clear route if no data
          try {
            mapRef.current.removeLayer(routeLayerRef.current);
          } catch (e) {
            console.warn('Failed to remove route layer:', e);
          }
          routeLayerRef.current = null;
        }

        // Auto-fit bounds if there are sessions and no route selected
        if (routeData.length === 0 && sessions.length > 0 && sessions.some(s => s.current_location)) {
          const bounds = sessions
            .filter(s => s.current_location)
            .map(s => [s.current_location!.latitude, s.current_location!.longitude] as [number, number]);
          
          if (bounds.length > 0) {
            try {
              mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: false });
            } catch (error) {
              console.error('Error fitting bounds:', error);
            }
          }
        }
      }, 50);
    });
  }, [sessions, routeData]);

  return (
    <Box
      id="tracking-map"
      sx={{
        width: '100%',
        height: 500,
        borderRadius: 1,
        overflow: 'hidden',
      }}
    />
  );
}
