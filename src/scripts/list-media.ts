
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function listMedia() {
  const payload = await getPayload({ config: configPromise })
  
  const media = await payload.find({
      collection: 'media',
      limit: 100
  })

  console.log(`Found ${media.totalDocs} media files:`)
  media.docs.forEach(m => {
      console.log(`ID: ${m.id}, Filename: "${m.filename}", OriginalName: "${(m as any).originalName || 'N/A'}"`)
  })
  process.exit(0)
}

listMedia()
