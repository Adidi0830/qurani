
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCountries() {
  const { count, error } = await supabase
    .from("countries")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error checking countries:", error);
  } else {
    console.log("Total countries in DB:", count);
  }
}

checkCountries();
