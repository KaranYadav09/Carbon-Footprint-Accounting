import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '../hooks/useGeoLocation';
// Fix Leaflet Default Icon issue in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
    currentLocation: GeoPoint | null;
    path: GeoPoint[];
}

const RecenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom(), { animate: true });
        }
    }, [center, map]);
    return null;
};

const LiveCommuteMap: React.FC<Props> = ({ currentLocation, path }) => {
    // Default center (e.g., Delhi) if no location
    const defaultCenter: [number, number] = [28.6139, 77.2090];
    const center = currentLocation ? [currentLocation.lat, currentLocation.lng] as [number, number] : defaultCenter;

    const polylinePositions = path.map(p => [p.lat, p.lng] as [number, number]);

    return (
        <MapContainer
            center={center}
            zoom={16}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {currentLocation && (
                <>
                    <Marker position={[currentLocation.lat, currentLocation.lng]}>
                        <Popup>
                            Current Location
                            <br />
                            Speed: {currentLocation.speed ? (currentLocation.speed * 3.6).toFixed(1) : 0} km/h
                        </Popup>
                    </Marker>
                    <RecenterMap center={[currentLocation.lat, currentLocation.lng]} />
                </>
            )}

            {polylinePositions.length > 1 && (
                <Polyline positions={polylinePositions} color="#10b981" weight={5} />
            )}
        </MapContainer>
    );
};

export default LiveCommuteMap;
