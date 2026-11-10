// app/clear-session/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClearSessionPage() {
    const [status, setStatus] = useState("Clearing session...");
    const router = useRouter();

    useEffect(() => {
        // Clear all cookies
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
            document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }

        // Clear localStorage
        localStorage.clear();

        // Clear sessionStorage
        sessionStorage.clear();

        setStatus("Session cleared! Redirecting to login...");

        // Redirect to login after 1 second
        setTimeout(() => {
            window.location.href = "/login";
        }, 1000);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h1 className="text-xl font-semibold text-gray-800">{status}</h1>
                <p className="text-gray-500 mt-2">Please wait...</p>
            </div>
        </div>
    );
}
