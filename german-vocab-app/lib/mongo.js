import mongoose from "mongoose";

const { MONGODB_URI, MONGODB_DB } = process.env;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { dbName: MONGODB_DB || "deutsch-app" })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
