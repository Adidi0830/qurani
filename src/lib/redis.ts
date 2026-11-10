import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT || 6379),
      },
      username: process.env.REDIS_USER || "default",
      password: process.env.REDIS_PASSWORD,
      database: Number(process.env.REDIS_DB || 0),
    });

    client.on("error", (err: Error) => {
      console.error("❌ Redis Client Error", err);
    });

    if (!client.isOpen) {
      await client.connect();
      console.log("✅ Connected to Redis:", process.env.REDIS_HOST);
    }
  }
  return client;
}
