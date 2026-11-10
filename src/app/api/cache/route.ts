import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET() {
  const redis = await getRedis(); // pake await biar dapet client, bukan promise
  const value = await redis.get("hello");
  return NextResponse.json({ hello: value });
}

export async function POST() {
  const redis = await getRedis(); // sama juga di sini
  await redis.set("hello", "world", { EX: 60 }); // simpan ke redis dengan expire 60 detik
  return NextResponse.json({ message: "disimpen ke redis" });
}
