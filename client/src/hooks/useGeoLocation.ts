import { useState, useEffect, useRef } from 'react';

export interface GeoPoint {
    lat: number;
    lng: number;
    timestamp: number;
    speed: number | null; // m/s
    accuracy: number;
}

interface UseGeoLocationReturn {
    currentLocation: GeoPoint | null;
    path: GeoPoint[];
    distanceKm: number;
    error: string | null;
    startTracking: () => void;
    stopTracking: () => void;
    isTracking: boolean;
    elapsedTime: number; // seconds
}

const haversineDistance = (coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }) => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // km

    const dLat = toRad(coords2.lat - coords1.lat);
    const dLon = toRad(coords2.lng - coords1.lng);
    const lat1 = toRad(coords1.lat);
    const lat2 = toRad(coords2.lat);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export const useGeoLocation = (): UseGeoLocationReturn => {
    const [isTracking, setIsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);
    const [path, setPath] = useState<GeoPoint[]>([]);
    const [distanceKm, setDistanceKm] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const watchIdRef = useRef<number | null>(null);
    const timerRef = useRef<any>(null);

    // Timer logic
    useEffect(() => {
        if (isTracking) {
            timerRef.current = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTracking]);

    const startTracking = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        setIsTracking(true);
        setElapsedTime(0);
        setPath([]);
        setDistanceKm(0);
        setError(null);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, speed, accuracy } = position.coords;
                const newPoint: GeoPoint = {
                    lat: latitude,
                    lng: longitude,
                    timestamp: position.timestamp,
                    speed: speed,
                    accuracy: accuracy,
                };

                setCurrentLocation(newPoint);

                // Filter out low accuracy points (e.g., > 50 meters) if needed, 
                // but for now we accept them to ensure *something* shows up.
                // We can tighten this later.

                setPath((prevPath) => {
                    if (prevPath.length > 0) {
                        const lastPoint = prevPath[prevPath.length - 1];
                        const dist = haversineDistance(lastPoint, newPoint);

                        // Only add distance if it's significant movement (> 5 meters) to reduce jitter
                        if (dist > 0.005) {
                            setDistanceKm((d) => d + dist);
                            return [...prevPath, newPoint];
                        }
                        return prevPath;
                    } else {
                        return [newPoint];
                    }
                });
            },
            (err) => {
                setError(err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 5000, // Reduced from 1000 to allow slight cache for stability
            }
        );
    };

    const stopTracking = () => {
        setIsTracking(false);
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    return {
        currentLocation,
        path,
        distanceKm,
        error,
        startTracking,
        stopTracking,
        isTracking,
        elapsedTime
    };
};
