import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createUserProfile } from "@/utils/api/user/update";

// Utility function to sleep for retry logic
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(
        `Attempt ${attempt} failed, retrying in ${delay}ms...`,
        error
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  console.log("Auth callback received:", {
    hasCode: !!code,
    error,
    error_description,
    origin,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  });

  // If there's an OAuth error, redirect to login with error
  if (error) {
    console.error("OAuth error:", { error, error_description });
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", error_description || error);
    return NextResponse.redirect(loginUrl.toString());
  }

  if (!code) {
    console.error("No authorization code received");
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      "No authorization code received. Please try again."
    );
    return NextResponse.redirect(loginUrl.toString());
  }

  try {
    // Create Supabase client
    const supabase = await createClient();

    console.log("Attempting to exchange code for session...");

    // Retry the code exchange with exponential backoff
    const { data, error: exchangeError } = await retryWithBackoff(
      () => supabase.auth.exchangeCodeForSession(code),
      3,
      1000
    );

    if (exchangeError) {
      console.error("Error exchanging code for session:", {
        error: exchangeError,
        message: exchangeError.message,
        status: exchangeError.status,
        code: exchangeError.code,
        stack: exchangeError.stack,
      });

      const loginUrl = new URL("/login", origin);

      if (exchangeError.message?.includes("fetch failed")) {
        loginUrl.searchParams.set(
          "error",
          "Network error occurred. Please check your internet connection and try again."
        );
      } else {
        loginUrl.searchParams.set(
          "error",
          `Authentication failed: ${exchangeError.message}`
        );
      }

      return NextResponse.redirect(loginUrl.toString());
    }

    if (!data?.user) {
      console.error("No user data returned from session exchange", { data });
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set(
        "error",
        "No user data received. Please try again."
      );
      return NextResponse.redirect(loginUrl.toString());
    }

    console.log("Successfully authenticated user:", {
      email: data.user.email,
      id: data.user.id,
      provider: data.user.app_metadata?.provider,
    });

    // Create user profile if it doesn't exist (especially for OAuth users)
    try {
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth", data.user.id)
        .single();

      if (!existingProfile) {
        console.log("Creating user profile for new user...");
        const profileResult = await createUserProfile(
          data.user.id,
          data.user.email,
          data.user.user_metadata?.full_name || data.user.user_metadata?.name
        );

        if (profileResult.success) {
          console.log("User profile created successfully");
        } else {
          console.error(
            "Failed to create user profile:",
            profileResult.message
          );
        }
      }
    } catch (profileError) {
      console.error("Error handling user profile:", profileError);
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    console.log("Redirecting to dashboard:", {
      dashboardUrl: `${origin}/dashboard`,
      forwardedHost,
      isLocalEnv,
    });

    // Direct redirect to dashboard - let middleware handle routing logic
    // This eliminates the unnecessary post-login intermediate page
    const response = NextResponse.redirect(`${origin}/dashboard`);
    
    // Clear any potentially large headers to prevent 431 errors
    response.headers.delete('x-middleware-cache');
    response.headers.delete('x-forwarded-proto');
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error("Unexpected error in auth callback:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      "An unexpected error occurred. Please try again."
    );
    return NextResponse.redirect(loginUrl.toString());
  }
}
