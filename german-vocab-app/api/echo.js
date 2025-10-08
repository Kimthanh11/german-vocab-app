import { dbConnect } from "../lib/mongo.js";
import mongoose from "mongoose";

export default async function handler(req, res) {
  try {
    const uriSet = !!process.env.MONGODB_URI;
    await dbConnect();
    const ping = await mongoose.connection.db.admin().command({ ping: 1 });
    res.status(200).json({
      ok: true,
      uriSet,
      db: mongoose.connection.name,
      colls: (await mongoose.connection.db.listCollections().toArray()).map(c => c.name),
      ping,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
