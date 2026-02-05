
import { MongoClient } from 'mongodb'

async function inspectDb() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');
    const collections = await db.listCollections().toArray();

    console.log("Collections in 'test':");
    for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(` - ${col.name}: ${count} docs`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

inspectDb();
