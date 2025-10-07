import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "deutsch-app";
if (!uri) {
  console.error("❌ MONGODB_URI is missing. Put it in .env.local and Vercel env.");
  process.exit(1);
}

const client = new MongoClient(uri);

const LESSONS = "lessons";
const FLASH = "flashcards";

const lessonsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["title", "content"],
    properties: {
      title: { bsonType: "string" },
      content: { bsonType: "string" },
      dict: {
        bsonType: "object",
        additionalProperties: { bsonType: "string" },
      },
      createdAt: { bsonType: ["date", "null"] },
      updatedAt: { bsonType: ["date", "null"] },
    },
  },
};

const flashcardsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["term", "meaning"],
    properties: {
      term: { bsonType: "string" },
      meaning: { bsonType: "string" },
      lessonId: { bsonType: ["objectId", "null"] },
      createdAt: { bsonType: ["date", "null"] },
      updatedAt: { bsonType: ["date", "null"] },
    },
  },
};

(async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const existing = new Set((await db.listCollections().toArray()).map(c => c.name));

    // --- Create collections if missing (no data inserted)
    if (!existing.has(LESSONS)) {
      await db.createCollection(LESSONS, {
        validator: lessonsValidator,
        validationLevel: "moderate",
      });
      console.log(`✅ Created collection: ${LESSONS}`);
    } else {
      // ensure/refresh validator
      await db.command({ collMod: LESSONS, validator: lessonsValidator, validationLevel: "moderate" }).catch(() => {});
      console.log(`ℹ️  ${LESSONS} already exists (validator ensured).`);
    }

    if (!existing.has(FLASH)) {
      await db.createCollection(FLASH, {
        // default collation can’t be changed later; we’ll enforce case-insensitive uniqueness via index collation
        validator: flashcardsValidator,
        validationLevel: "moderate",
      });
      console.log(`✅ Created collection: ${FLASH}`);
    } else {
      await db.command({ collMod: FLASH, validator: flashcardsValidator, validationLevel: "moderate" }).catch(() => {});
      console.log(`ℹ️  ${FLASH} already exists (validator ensured).`);
    }

    // --- Indexes (idempotent)
    await db.collection(FLASH).createIndex(
      { term: 1 },
      { unique: true, collation: { locale: "en", strength: 2 }, name: "uniq_term_ci" }
    );
    await db.collection(LESSONS).createIndex({ createdAt: -1 }, { name: "createdAt_desc" });

    console.log("✅ Indexes ensured.");
    console.log(`🎉 DB ready: ${dbName}. Check Atlas → Browse Collections.`);
  } catch (err) {
    console.error("❌ Init failed:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
