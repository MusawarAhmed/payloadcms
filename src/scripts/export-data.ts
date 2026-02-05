import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

async function exportData() {
  const payload = await getPayload({ config: configPromise })

  console.log('Fetching data...')

  const data: any = {}

  // Collections
  const collections = ['pages', 'posts', 'media', 'categories', 'users']
  for (const slug of collections) {
    console.log(`Exporting ${slug}...`)
    const result = await payload.find({
      collection: slug as any, // Type cast for dynamic iteration
      limit: 1000,
      depth: 0,
    })
    data[slug] = result.docs
  }

  // Globals
  const globals = ['header', 'footer']
  for (const slug of globals) {
    console.log(`Exporting ${slug}...`)
    try {
        const result = await payload.findGlobal({
            slug: slug as any,
            depth: 0,
        })
        data[slug] = result
    } catch (e) {
        console.log(`Global ${slug} might not exist or empty.`, e)
    }
  }

  const backupPath = path.resolve(dirname, '../../backup.json')
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2))
  console.log(`Data exported to ${backupPath}`)

  process.exit(0)
}

exportData()
