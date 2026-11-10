import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
// import { cleanupLargeCookies } from "@/utils/auth-cleanup"; // Disabled automatic cleanup

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!client) {
    // Check if environment variables are set
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      console.error("Missing Supabase environment variables:", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      });
      throw new Error("Missing Supabase environment variables");
    }

    // Note: Removed automatic cleanup to prevent session interference
    // cleanupLargeCookies(); // Can be called manually if needed

    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          flowType: "pkce",
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // Let Next.js handle URL detection
          // Add custom storage to manage session size
          storage: {
            getItem: (key: string) => {
              try {
                const item = localStorage.getItem(key);
                // Check if item is too large
                if (item && item.length > 50000) { // > 50KB
                  console.warn(`Large session item detected: ${key} (${item.length} chars)`);
                  // Consider partial cleanup or compression here
                }
                return item;
              } catch (error) {
                console.error('Error getting storage item:', error);
                return null;
              }
            },
            setItem: (key: string, value: string) => {
              try {
                // Check size before storing
                if (value.length > 50000) { // > 50KB
                  console.warn(`Attempting to store large session: ${key} (${value.length} chars)`);
                  // Note: Cleanup disabled to prevent session interference
                  // cleanupLargeCookies();
                }
                localStorage.setItem(key, value);
              } catch (error) {
                console.error('Error setting storage item:', error);
                // Note: Cleanup retry disabled to prevent session interference  
                // cleanupLargeCookies();
                // Just log the error instead of retrying with cleanup
                console.error('Failed to store session - storage may be full');
                throw error;
              }
            },
            removeItem: (key: string) => {
              try {
                localStorage.removeItem(key);
              } catch (error) {
                console.error('Error removing storage item:', error);
              }
            },
          },
        },
        global: {
          fetch: async (url, options = {}) => {
            // Use existing signal if provided, otherwise create timeout
            const existingSignal = (options as RequestInit).signal;
            
            if (existingSignal) {
              // If signal already exists, just use native fetch
              return fetch(url, options);
            }
            
            // Add timeout for requests without signal
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              });
              return response;
            } catch (error) {
              if ((error as { name?: string })?.name === "AbortError") {
                console.warn("Supabase request timed out", { url });
                return new Response(JSON.stringify({ error: "Request timeout" }), {
                  status: 408,
                  statusText: "Request Timeout",
                  headers: { "Content-Type": "application/json" },
                });
              }
              throw error;
            } finally {
              clearTimeout(timeoutId);
            }
          },
        },
      }
    );

    // Set up auth state change listener (cleanup disabled to prevent session interference)
    client.auth.onAuthStateChange((event) => {
      // Note: Removed automatic cleanup that was interfering with valid sessions
      // if (event === 'SIGNED_OUT') {
      //   cleanupLargeCookies(); // Only cleanup on explicit logout if needed
      // }
      console.log('Auth state changed:', event);
    });
  }
  return client;
}
