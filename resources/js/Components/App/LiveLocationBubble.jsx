import { MapPinIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import axios from "axios";
import LiveLocationModal from "./LiveLocationModal";

export default function LiveLocationBubble({ user }) {
    const userId = user?.id;
    const [showModal, setShowModal] = useState(false);
    const [state, setState] = useState({
        loading: true,
        error: null,
        hasLocation: false,
        distanceLabel: null,
        movementText: null,
        timeAgo: null,
    });

    useEffect(() => {
        if (!userId) return;

        let cancelled = false;

        const fetchLocation = (viewerLat = null, viewerLng = null) => {
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
                        setState({
                            loading: false,
                            error: null,
                            hasLocation: false,
                            distanceLabel: null,
                            movementText: null,
                            timeAgo: null,
                        });
                        return;
                    }

                    let movementText = data.movement_text || null;
                    if (
                        !movementText &&
                        typeof data.last_speed_kmh === "number"
                    ) {
                        movementText = `At ${Math.round(
                            data.last_speed_kmh
                        )} km/h`;
                    }

                    setState({
                        loading: false,
                        error: null,
                        hasLocation: true,
                        distanceLabel:
                            data.distance_label || "Location shared",
                        movementText,
                        timeAgo: data.time_ago || "Recently updated",
                    });
                })
                .catch(() => {
                    if (cancelled) return;
                    setState({
                        loading: false,
                        error: "Location unavailable",
                        hasLocation: false,
                        distanceLabel: null,
                        movementText: null,
                        timeAgo: null,
                    });
                });
        };

        // Jaribu kupata location ya current user (viewer) ili kuhesabu distance na rafiki
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

        const interval = setInterval(() => {
            fetchLocation(null, null);
        }, 60000); // refresh kila dakika

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [userId]);

    if (state.loading || state.error || !state.hasLocation) {
        // Tunaweza kurudisha null ili tusijaze UI kama hakuna data
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-50/90 dark:bg-emerald-500/10 px-3 py-1 text-xs md:text-sm text-emerald-700 dark:text-emerald-200 border border-emerald-200/70 dark:border-emerald-400/40 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
            >
                <MapPinIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-300" />
                <span className="font-semibold">View</span>
            </button>

            <LiveLocationModal
                open={showModal}
                onClose={() => setShowModal(false)}
                user={user}
            />
        </>
    );
}