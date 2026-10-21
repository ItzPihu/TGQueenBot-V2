import fs from "fs";
import path from "path";
import { MongoClient, Db } from "mongodb";
import config from "./config.js";

const LOCAL_DB_PATH = path.resolve(process.cwd(), "local_database.json");

let localDB: Record<string, any[]> = {};
let localMode = false;
let mongoClient: MongoClient | null = null;
let activeDatabase: any = null;

function loadLocalDatabase(): void {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      localDB = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf8"));
    } else {
      localDB = {};
      saveLocalDatabase();
    }
  } catch {
    localDB = {};
  }
}

function saveLocalDatabase(): void {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localDB, null, 2), "utf8");
  } catch {}
}

function matches(document: any, query: Record<string, any>): boolean {
  return Object.entries(query).every(([key, value]) => document[key] === value);
}

function applyUpdate(document: any, update: any): any {
  if (update.$set) {
    return { ...document, ...update.$set };
  }
  if (update.$inc) {
    const next = { ...document };
    for (const [key, val] of Object.entries(update.$inc)) {
      next[key] = (Number(next[key]) || 0) + Number(val);
    }
    return next;
  }
  return { ...document, ...update };
}

function createLocalCollection(name: string) {
  if (!Array.isArray(localDB[name])) {
    localDB[name] = [];
  }

  return {
    find(query: Record<string, any> = {}) {
      let results = localDB[name].filter(item => matches(item, query));
      return {
        sort(sortQuery: Record<string, number> = {}) {
          results = [...results].sort((a, b) => {
            for (const [key, direction] of Object.entries(sortQuery)) {
              if (a[key] === b[key]) continue;
              return (a[key] > b[key] ? 1 : -1) * direction;
            }
            return 0;
          });
          return this;
        },
        limit(limit: number) {
          results = results.slice(0, limit);
          return this;
        },
        async toArray() {
          return [...results];
        }
      };
    },

    async findOne(query: Record<string, any> = {}) {
      return localDB[name].find(item => matches(item, query)) || null;
    },

    async countDocuments(query: Record<string, any> = {}) {
      return localDB[name].filter(item => matches(item, query)).length;
    },

    async insertOne(document: any) {
      localDB[name].push(document);
      saveLocalDatabase();
      return {
        acknowledged: true,
        insertedId: document._id || document.id || String(Date.now())
      };
    },

    async insertMany(documents: any[]) {
      localDB[name].push(...documents);
      saveLocalDatabase();
      return {
        acknowledged: true,
        insertedIds: documents.map(d => d._id || d.id)
      };
    },

    async updateOne(query: Record<string, any>, update: any, options: { upsert?: boolean } = {}) {
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

    async updateMany(query: Record<string, any>, update: any) {
      let modifiedCount = 0;
      localDB[name] = localDB[name].map(item => {
        if (!matches(item, query)) return item;
        modifiedCount++;
        return applyUpdate(item, update);
      });
      if (modifiedCount > 0) saveLocalDatabase();
      return { acknowledged: true, matchedCount: modifiedCount, modifiedCount };
    },

    async deleteOne(query: Record<string, any>) {
      const index = localDB[name].findIndex(item => matches(item, query));
      if (index === -1) return { acknowledged: true, deletedCount: 0 };
      localDB[name].splice(index, 1);
      saveLocalDatabase();
      return { acknowledged: true, deletedCount: 1 };
    },

    async deleteMany(query: Record<string, any>) {
      const oldLength = localDB[name].length;
      localDB[name] = localDB[name].filter(item => !matches(item, query));
      const deletedCount = oldLength - localDB[name].length;
      if (deletedCount > 0) saveLocalDatabase();
      return { acknowledged: true, deletedCount };
    }
  };
}

const localDatabase = {
  collection(name: string) {
    return createLocalCollection(name);
  },
  async close() {
    saveLocalDatabase();
  }
};

export async function connectToDatabase(): Promise<any> {
  const uri = config.database?.uri;
  if (!uri || !uri.trim()) {
    localMode = true;
    loadLocalDatabase();
    activeDatabase = localDatabase;
    return localDatabase;
  }

  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    localMode = false;
    const dbName = config.database.dbName || "Queen";
    activeDatabase = mongoClient.db(dbName);
    return activeDatabase;
  } catch {
    localMode = true;
    loadLocalDatabase();
    activeDatabase = localDatabase;
    return localDatabase;
  }
}

export function isLocalDatabase(): boolean {
  return localMode;
}

export function getDatabase(): any {
  return activeDatabase || localDatabase;
}
