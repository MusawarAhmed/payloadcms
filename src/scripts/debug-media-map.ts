
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

async function debugMedia() {
  const payload = await getPayload({ config: configPromise })
  
  const backupPath = path.resolve(dirname, '../../backup.json')
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

  const targetId = "6983852c1faa8476f5447f59"
  console.log(`Looking for Media ID: ${targetId} in backup...`)

  const mediaDoc = backup.media.find((m: any) => m.id === targetId || m._id === targetId)
  if (mediaDoc) {
      console.log(`Found in backup: Filename="${mediaDoc.filename}"`)
      
      // Check Postgres
      const dbMedia = await payload.find({
          collection: 'media',
          where: { filename: { equals: mediaDoc.filename } }
      })
      
      if (dbMedia.docs.length > 0) {
          console.log(`Found in Postgres: ID=${dbMedia.docs[0].id} Filename="${dbMedia.docs[0].filename}"`)
      } else {
          console.log('NOT found in Postgres by filename.')
      }

  } else {
      console.log('NOT found in backup.media')
  }

  process.exit(0)
}

debugMedia()
