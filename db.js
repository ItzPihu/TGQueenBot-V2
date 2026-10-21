import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import config from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_PATH = path.join(__dirname, "local_database.json");

let localDB = {};
let localMode = false;
let mongoClient = null;

function loadLocalDatabase() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      localDB = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf8"));
    } else {
      localDB = {};
      saveLocalDatabase();
    }
  } catch (error) {
    console.error("Error loading local database:", error);
    localDB = {};
  }
}

function saveLocalDatabase() {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localDB, null, 2), "utf8");
}

function matches(document, query) {
  return Object.entries(query).every(([key, value]) => document[key] === value);
}

function applyUpdate(document, update) {
  if (update.$set) {
    return { ...document, ...update.$set };
  }
  if (update.$inc) {
    const updated = { ...document };
    for (const [key, incVal] of Object.entries(update.$inc)) {
      updated[key] = (Number(updated[key]) || 0) + Number(incVal);
    }
    return updated;
  }
  return { ...document, ...update };
}

function createLocalCollection(name) {
  if (!Array.isArray(localDB[name])) {
    localDB[name] = [];
  }

  return {
    find(query = {}) {
      let results = localDB[name].filter(item => matches(item, query));
      return {
        sort(sortQuery = {}) {
          results = [...results].sort((a, b) => {
            for (const [key, direction] of Object.entries(sortQuery)) {
              if (a[key] === b[key]) continue;
              return (a[key] > b[key] ? 1 : -1) * direction;
            }
            return 0;
          });
          return this;
        },
        limit(limitCount) {
          results = results.slice(0, limitCount);
          return this;
        },
        async toArray() {
          return [...results];
        }
      };
    },

    async findOne(query = {}) {
      return localDB[name].find(item => matches(item, query)) || null;
    },

    async countDocuments(query = {}) {
      return localDB[name].filter(item => matches(item, query)).length;
    },

    async insertOne(document) {
      localDB[name].push(document);
      saveLocalDatabase();
      return {
        acknowledged: true,
        insertedId: document._id || document.id || String(Date.now())
      };
    },

    async insertMany(documents) {
      localDB[name].push(...documents);
      saveLocalDatabase();
      return {
        acknowledged: true,
        insertedIds: documents.map(doc => doc._id || doc.id)
      };
    },

    async updateOne(query, update, options = {}) {
      const index = localDB[name].findIndex(item => matches(item, query));
      if (index === -1) {
        if (options.upsert) {
          const newDoc = applyUpdate({ ...query }, update);
          localDB[name].push(newDoc);
          saveLocalDatabase();
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      }
      localDB[name][index] = applyUpdate(localDB[name][index], update);
      saveLocalDatabase();
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    },

    async updateMany(query, update) {
      let modifiedCount = 0;
      localDB[name] = localDB[name].map(item => {
        if (!matches(item, query)) return item;
        modifiedCount++;
        return applyUpdate(item, update);
      });
      if (modifiedCount > 0) {
        saveLocalDatabase();
      }
      return { acknowledged: true, matchedCount: modifiedCount, modifiedCount };
    },

    async findOneAndUpdate(query, update, options = {}) {
      const index = localDB[name].findIndex(item => matches(item, query));
      if (index === -1) {
        if (!options.upsert) {
          return { value: null };
        }
        const newDoc = applyUpdate({ ...query }, update);
        localDB[name].push(newDoc);
        saveLocalDatabase();
        return { value: options.returnDocument === "after" ? newDoc : null };
      }
      const oldDoc = { ...localDB[name][index] };
      localDB[name][index] = applyUpdate(localDB[name][index], update);
      saveLocalDatabase();
      return {
        value: options.returnDocument === "after" ? localDB[name][index] : oldDoc
      };
    },

    async deleteOne(query) {
      const index = localDB[name].findIndex(item => matches(item, query));
      if (index === -1) {
        return { acknowledged: true, deletedCount: 0 };
      }
      localDB[name].splice(index, 1);
      saveLocalDatabase();
      return { acknowledged: true, deletedCount: 1 };
    },

    async deleteMany(query) {
      const initialCount = localDB[name].length;
      localDB[name] = localDB[name].filter(item => !matches(item, query));
      const deletedCount = initialCount - localDB[name].length;
      if (deletedCount > 0) {
        saveLocalDatabase();
      }
      return { acknowledged: true, deletedCount };
    }
  };
}

const localDatabase = {
  collection(name) {
    return createLocalCollection(name);
  },
  async close() {
    saveLocalDatabase();
  }
};

async function connectToDatabase() {
  const uri = config.database?.mongoUri;

  if (!uri || !uri.trim()) {
    localMode = true;
    loadLocalDatabase();
    console.log("No MongoDB URI configured. Using local JSON database.");
    return localDatabase;
  }

  try {
    mongoClient = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    await mongoClient.connect();
    localMode = false;
    console.log("Connected to MongoDB.");
    return mongoClient.db(config.database?.dbName || "economyBot");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.log("Falling back to local JSON database.");
    localMode = true;
    loadLocalDatabase();
    return localDatabase;
  }
}

function isLocalDatabase() {
  return localMode;
}

export { connectToDatabase, isLocalDatabase };
export default connectToDatabase;
