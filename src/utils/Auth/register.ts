"use server";

import { authApi } from "@/lib/api";

export default async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("full_name") as string;
  const username = formData.get("username") as string;
  const countryId = formData.get("country_id") as string;
  const stateId = formData.get("states_id") as string;
  const cityId = formData.get("city_id") as string;
  const timezone = formData.get("timezone") as string;

  try {
    await authApi.register({
      email,
      password,
      username: username.startsWith("@") ? username.slice(1) : username,
      name,
      countryId: countryId ? parseInt(countryId) : undefined,
      stateId: stateId ? parseInt(stateId) : undefined,
      cityId: cityId ? parseInt(cityId) : undefined,
      timezone: timezone || undefined,
    });

    return {
      success: true,
      message: "User registered successfully",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Registration failed";
    console.error("Signup error:", errorMessage);

    if (errorMessage.toLowerCase().includes("already") || errorMessage.toLowerCase().includes("exist")) {
      return {
        success: false,
        error: "User already registered",
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
