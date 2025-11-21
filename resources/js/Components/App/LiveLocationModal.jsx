import { useEffect, useState } from "react";
import axios from "axios";
import { XMarkIcon, MapPinIcon } from "@heroicons/react/24/solid";
import UserAvatar from "./UserAvatar";

export default function LiveLocationModal({ open, onClose, user }) {
    const userId = user?.id;
    const [state, setState] = useState({
        loading: false,
        error: null,
        distanceLabel: null,
        timeAgo: null,
        lat: null,
        lng: null,
        speedKmh: null,
        movementText: null,
        placeName: null,
        placeDetails: null,
    });

    useEffect(() => {
        if (!open || !userId) return;

        let cancelled = false;
        let intervalId = null;

        const fetchPlaceName = async (lat, lng) => {
            if (lat == null || lng == null) return;

            try {
                const res = await axios.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    {
                        params: {
                            format: "jsonv2",
                            lat,
                            lon: lng,
                            zoom: 18,
                            addressdetails: 1,
                        },
                    }
                );

                if (cancelled) return;

                const data = res.data || {};
                const address = data.address || {};

                const city =
                    address.city ||
                    address.town ||
                    address.village ||
                    address.state;
                const poi =
                    address.university ||
                    address.college ||
                    address.school ||
                    address.hospital ||
                    address.public_building ||
                    address.amenity ||
                    address.building;
                const block =
                    address.neighbourhood ||
                    address.quarter ||
                    address.suburb ||
                    address.hamlet;
                const road =
                    address.road ||
                    address.footway ||
                    address.residential;

                // Prefer a human label like "University of Dodoma" or "Block Five"
                const primary =
                    poi ||
                    block ||
                    city ||
                    data.display_name ||
                    null;

                const secondaryParts = [];
                if (block && block !== primary) secondaryParts.push(block);
                if (road) secondaryParts.push(road);
                if (city && city !== primary) secondaryParts.push(city);
                const secondary = secondaryParts.length
                    ? secondaryParts.join(", ")
                    : null;

                setState((prev) => ({
                    ...prev,
                    placeName: primary,
                    placeDetails: secondary,
                }));
            } catch {
            }
        };

        const fetchLocation = (viewerLat = null, viewerLng = null) => {
            setState((prev) => ({
                ...prev,
                loading: true,
                error: null,
            }));

            axios
                .get(route("location.show", userId), {
                    params: {
                        viewer_lat: viewerLat,
                        viewer_lng: viewerLng,
                    },
                })
                .then((res) => {
                    if (cancelled) return;
                    const data = res.data || {};

                    if (!data.has_location) {
                        setState((prev) => ({
                            ...prev,
                            loading: false,
                            error: "User is not sharing live location right now.",
                            distanceLabel: null,
                            timeAgo: null,
                            lat: null,
                            lng: null,
                            speedKmh: null,
                            movementText: null,
                            placeName: null,
                            placeDetails: null,
                        }));
                        return;
                    }

                    const lat =
                        typeof data.last_lat === "number" ? data.last_lat : null;
                    const lng =
                        typeof data.last_lng === "number" ? data.last_lng : null;
                    const speedKmh =
                        typeof data.last_speed_kmh === "number"
                            ? data.last_speed_kmh
                            : null;

                    // Derive a clean movement description
                    let movementText = null;
                    if (speedKmh != null) {
                        const rounded = Math.round(speedKmh);
                        if (rounded < 1) {
                            movementText = "Stationary";
                        } else if (rounded < 7) {
                            movementText = `Walking (${rounded} km/h)`;
                        } else if (rounded < 25) {
                            movementText = `Cycling (${rounded} km/h)`;
                        } else if (rounded < 80) {
                            movementText = `Driving (${rounded} km/h)`;
                        } else {
                            movementText = `In transport (${rounded} km/h)`;
                        }
                    }

                    setState((prev) => ({
                        ...prev,
                        loading: false,
                        error: null,
                        distanceLabel: data.distance_label || null,
                        timeAgo: data.time_ago || null,
                        lat,
                        lng,
                        speedKmh,
                        movementText,
                    }));

                    if (lat !== null && lng !== null) {
                        fetchPlaceName(lat, lng);
                    }
                })
                .catch(() => {
                    if (cancelled) return;
                    setState((prev) => ({
                        ...prev,
                        loading: false,
                        error: "Location details are currently unavailable.",
                    }));
                });
        };

        const getViewerAndFetch = () => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const viewerLat = pos.coords.latitude;
                        const viewerLng = pos.coords.longitude;
                        fetchLocation(viewerLat, viewerLng);
                    },
                    () => {
                        fetchLocation(null, null);
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                fetchLocation(null, null);
            }
        };

        getViewerAndFetch();
        intervalId = setInterval(() => {
            getViewerAndFetch();
        }, 15000);

        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [open, userId]);

    if (!open) return null;

    const hasLocation =
        state.lat != null && state.lng != null && !state.error;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 relative overflow-hidden">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center">
                            <MapPinIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">
                                Live location
                            </div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">
                                {user?.name}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden shadow-md">
                            <UserAvatar user={user} />
                        </div>
                        <div className="flex-1">
                            <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                {state.placeName || "Location detected"}
                            </div>
                            {state.placeDetails && (
                                <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                    {state.placeDetails}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400">
                                Distance from you
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {state.distanceLabel || "Not available"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400">
                                Movement
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {state.movementText || "Stationary or unknown"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-slate-400">
                                Last updated
                            </span>
                            <span className="text-gray-900 dark:text-white">
                                {state.timeAgo || "Recently"}
                            </span>
                        </div>
                    </div>

                    {hasLocation && (
                        <div className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
                            Lat: {state.lat?.toFixed(5)} • Lng: {state.lng?.toFixed(5)}
                        </div>
                    )}

                    {state.error && (
                        <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-200">
                            {state.error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
