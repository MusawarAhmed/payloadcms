
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function verifyMigration() {
  const payload = await getPayload({ config: configPromise })

  console.log('Verifying Migration...')

  try {
    const users = await payload.find({ collection: 'users' })
    console.log(`Users count: ${users.totalDocs}`)
    
    const media = await payload.find({ collection: 'media' })
    console.log(`Media count: ${media.totalDocs}`)

    const pages = await payload.find({ collection: 'pages' })
    console.log(`Pages count: ${pages.totalDocs}`)
    
  } catch (e) {
    console.error('Error verifying:', e)
  }

  process.exit(0)
}

verifyMigration()
