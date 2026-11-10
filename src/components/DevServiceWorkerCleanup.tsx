"use client";

import { useEffect } from "react";

/**
 * Component to unregister PWA service worker in development mode
 * This prevents duplicate API requests from cached service worker
 */
export function DevServiceWorkerCleanup() {
    useEffect(() => {
        // Only run in development
        if (process.env.NODE_ENV === "development") {
            // Unregister all service workers except push notification SW
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        // Only unregister PWA/workbox service workers, keep push notification SW
                        const swUrl = registration.active?.scriptURL || "";
                        if (swUrl.includes("sw.js") && !swUrl.includes("swPushNotification")) {
                            console.log("[Dev] Unregistering PWA service worker:", swUrl);
                            registration.unregister().then((success) => {
                                if (success) {
                                    console.log("[Dev] PWA service worker unregistered successfully");
                                }
                            });
                        }
                    });
                });
            }
        }
    }, []);

    return null;
}
