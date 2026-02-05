
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

async function fixHomePage() {
  const payload = await getPayload({ config: configPromise })
  
  const backupPath = path.resolve(dirname, '../../backup.json')
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
  const usersBackup = JSON.parse(fs.readFileSync(path.resolve(dirname, '../../users-backup.json'), 'utf-8'))

  // Re-build Maps
  const userMap = new Map() 
  const dbUsers = await payload.find({ collection: 'users', limit: 1000 })
  for (const u of dbUsers.docs) { userMap.set(u.email, u.id) }
  
  const mongoUserMap = new Map() 
  for (const oldU of usersBackup) {
      const newId = userMap.get(oldU.email)
      if (newId) {
          mongoUserMap.set(oldU._id, newId)
          mongoUserMap.set(oldU.id, newId)
      }
  }

  const mediaMap = new Map()
  const dbMedia = await payload.find({ collection: 'media', limit: 1000 })
  const dbMediaDocs = dbMedia.docs

  const findMediaId = (filename: string, filesize: number) => {
      // 1. Exact match
      const exact = dbMediaDocs.find(m => m.filename === filename)
      if (exact) return exact.id

      // 2. Fuzzy match (name-*.ext) and size overlap
      // Standard fuzzy: backup "foo.png" -> db "foo-1.png"
      const ext = path.extname(filename)
      const base = path.basename(filename, ext)
      
      const regex = new RegExp(`^${base}-\\d+${ext}$`)
      let candidates = dbMediaDocs.filter(m => (typeof m.filename === 'string' && regex.test(m.filename)))

      // 3. Relaxed Fuzzy: If base ends in dash-number (e.g. foo-1), try stripping and matching foo-*
      if (candidates.length === 0 && /-\d+$/.test(base)) {
          const strippedBase = base.replace(/-\d+$/, '')
          const relaxedRegex = new RegExp(`^${strippedBase}-\\d+${ext}$`)
          candidates = dbMediaDocs.filter(m => (typeof m.filename === 'string' && relaxedRegex.test(m.filename)))
      }

      // Filter by size if possible (approx match?)
      const sizeMatch = candidates.find(m => m.filesize === filesize)
      if (sizeMatch) return sizeMatch.id
      
      // Fallback: Return first candidate
      if (candidates.length > 0) return candidates[0].id
      return null
  }
  
  const mongoMediaMap = new Map()
  for (const oldM of backup.media) {
      const newId = findMediaId(oldM.filename, oldM.filesize)
      if (newId) mongoMediaMap.set(oldM.id, newId)
  }

  // Categories Map
  const categoryMap = new Map()
  // Fetch existing categories to map names? Or verify if we can just map IDs?
  // Since we imported categories earlier, we can fetch them.
  const dbCategories = await payload.find({ collection: 'categories', limit: 1000 })
  // We need to map old Category IDs to new.
  // We can try to map by Name if unique?
  for (const c of dbCategories.docs) { categoryMap.set(c.title || c.name, c.id) }
  
  const mongoCategoryMap = new Map()
  if (backup.categories) {
      for (const oldC of backup.categories) {
          const newId = categoryMap.get(oldC.title || oldC.name)
          if (newId) mongoCategoryMap.set(oldC.id, newId)
      }
  }

  const replaceIds = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(replaceIds)
    if (obj && typeof obj === 'object') {
      const newObj: any = {}
      for (const key in obj) {
        if (key === 'id' || key === '_id') continue 
        const val = obj[key]
        
        if (typeof val === 'string') {
            if (mongoUserMap.has(val)) { newObj[key] = mongoUserMap.get(val); continue }
            if (mongoMediaMap.has(val)) { newObj[key] = mongoMediaMap.get(val); continue }
            if (mongoCategoryMap.has(val)) { newObj[key] = mongoCategoryMap.get(val); continue }
        }
        
        newObj[key] = replaceIds(val)
      }
      return newObj
    }
    return obj
  }

  // Find the Home Page content in backup
  const homeDoc = backup.pages.find((p: any) => p.slug === 'home')
  if (!homeDoc) {
      console.error('Home page not found in backup!')
      return
  }

  console.log(`Found Home page in backup: ${homeDoc.title} (Slug: ${homeDoc.slug})`)

  const clean = (doc: any) => {
      const { _id, id, ...rest } = doc
      return rest
  }

  const data = replaceIds(clean(homeDoc))

  try {
      console.log('Updating Page ID 2 with Home content...')
      await payload.update({
          collection: 'pages',
          id: 2,
          data,
          overrideAccess: true
      })
      console.log('Successfully updated Home Page (ID 2).')
  } catch (e: any) {
      console.error('Failed to update Home Page:', e.message)
      // If validation fails (e.g. invalid blocks), try enabling "draft"
      try {
           console.log('Retrying as draft...')
           await payload.update({
              collection: 'pages',
              id: 2,
              data: { ...data, _status: 'draft' },
              overrideAccess: true
          })
          console.log('Saved Home Page as Draft.')
      } catch (e2: any) {
          console.error('Failed to save as draft:', e2.message)
          console.dir(e2, { depth: null })
      }
  }

  process.exit(0)
}

fixHomePage()
