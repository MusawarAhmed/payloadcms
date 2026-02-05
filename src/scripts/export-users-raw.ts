
import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

async function exportUsers() {
  // URI from original .env
  const uri = "mongodb://localhost:27017";
  const dbName = "payload-commerx";
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    
    const users = await db.collection('users').find({}).toArray();
    
    if (users.length === 0) {
        console.warn(`No users found in database "${dbName}". Trying "test" database...`);
        const dbTest = client.db('test');
        const usersTest = await dbTest.collection('users').find({}).toArray();
        if (usersTest.length > 0) {
            console.log(`Found ${usersTest.length} users in "test" database.`);
            fs.writeFileSync(path.resolve(dirname, '../../users-backup.json'), JSON.stringify(usersTest, null, 2));
            return;
        } else {
             console.error("No users found in 'payload-commerx' or 'test'.");
        }
    } else {
        console.log(`Exported ${users.length} users from "${dbName}".`);
        fs.writeFileSync(path.resolve(dirname, '../../users-backup.json'), JSON.stringify(users, null, 2));
    }
    
  } catch (e) {
      console.error(e);
  } finally {
    await client.close();
  }
}

exportUsers();
