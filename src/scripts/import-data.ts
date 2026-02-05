
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

async function importData() {
  const payload = await getPayload({ config: configPromise })
  
  const backupPath = path.resolve(dirname, '../../backup.json')
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at ${backupPath}`)
    process.exit(1)
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
  const idMap = new Map<string, string | number>()

  // CLEANUP DB
  console.log('Cleaning existing data...')
  try {
      const pool = (payload.db as any).pool
      if (pool) {
          await pool.query('TRUNCATE TABLE users, media, categories, posts, pages RESTART IDENTITY CASCADE;')
          console.log('Database truncated.')
      }
  } catch (e) {
      console.warn('Cleanup failed:', e)
  }

  const cleanDoc = (doc: any) => {
    const { _id, __v, id, ...rest } = doc
    return rest
  }

  const processFields = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(processFields)
    }
    if (obj && typeof obj === 'object') {
      const newObj: any = {}
      for (const key in obj) {
        if (key === 'id' || key === '_id') continue
        const val = obj[key]
        if (typeof val === 'string' && idMap.has(val)) {
            newObj[key] = idMap.get(val)
        } else {
            newObj[key] = processFields(val)
        }
      }
      return newObj
    }
    return obj
  }

  // 1. Users
  console.log('--- Importing Users ---')
  const usersBackupPath = path.resolve(dirname, '../../users-backup.json')
  let usersData = backup.users
  if (fs.existsSync(usersBackupPath)) {
      console.log('Using raw users backup with credentials.')
      usersData = JSON.parse(fs.readFileSync(usersBackupPath, 'utf-8'))
  }

  if (usersData) {
      for (const doc of usersData) {
        const oldId = doc.id || doc._id
        const clean = cleanDoc(doc)
        
        try {
            const newDoc = await payload.create({
                collection: 'users',
                data: {
                    ...clean,
                    password: 'temporary-migration-password-123',
                },
                overrideAccess: true,
                disableVerificationEmail: true,
            })
            
            const pool = (payload.db as any).pool
            if (pool && doc.hash && doc.salt) {
                 await pool.query('UPDATE users SET hash = $1, salt = $2 WHERE id = $3', [doc.hash, doc.salt, newDoc.id])
                 console.log(`User mapped and auth restored: ${doc.email} (${oldId} -> ${newDoc.id})`)
            } else {
                 console.log(`User mapped (new password): ${doc.email} (${oldId} -> ${newDoc.id})`)
            }
            idMap.set(oldId, newDoc.id)
        } catch (err: any) {
            console.error(`Failed to import user ${doc.email}:`, err.message)
        }
      }
  }

  // 2. Categories
  console.log('--- Importing Categories ---')
  if (backup.categories) {
    for (const doc of backup.categories) {
        const oldId = doc.id
        const data = processFields(cleanDoc(doc))
        try {
            const newDoc = await payload.create({
                collection: 'categories',
                data,
                overrideAccess: true,
            })
            console.log(`Category mapped: ${doc.title || doc.name} (${oldId} -> ${newDoc.id})`)
            idMap.set(oldId, newDoc.id)
        } catch (err: any) {
             console.error(`Failed to import category:`, err.message)
        }
    }
  }

  // 3. Media
  console.log('--- Importing Media ---')
  if (backup.media) {
    for (const doc of backup.media) {
        const oldId = doc.id
        const filePath = path.resolve(dirname, '../../public/media_source', doc.filename)
        
        try {
            if (fs.existsSync(filePath)) {
                 const fileBuffer = fs.readFileSync(filePath)
                 const newDoc = await payload.create({
                    collection: 'media',
                    data: {
                        alt: doc.alt,
                        caption: processFields(doc.caption)
                    },
                    file: {
                        data: fileBuffer,
                        name: doc.filename,
                        type: doc.mimeType,
                        size: doc.filesize,
                    },
                    overrideAccess: true,
                })
                console.log(`Media mapped: ${doc.filename} (${oldId} -> ${newDoc.id})`)
                idMap.set(oldId, newDoc.id)
            } else {
                console.warn(`File not found for media ${oldId}: ${filePath}`)
            }
        } catch (err: any) {
             console.error(`Failed to import media ${doc.filename}:`, err.message)
        }
    }
  }

  // 4. Content (Pages, Posts) - PASS 1 (Placeholders via SQL to bypass validation)
  const contentCollections = ['posts', 'pages']
  console.log('--- Importing Content (Pass 1: Placeholders via SQL) ---')
  for (const slug of contentCollections) {
      if (backup[slug]) {
          for (const doc of backup[slug]) {
              const oldId = doc.id || doc._id
              
              try {
                  // Use raw SQL to insert minimal row and get ID.
                  // Columns: title, slug (if exists), _status, createdAt, updatedAt
                  // Note: Table name usually plural slug? 'posts', 'pages'.
                  // Check if doc has slug.
                  const hasSlug = !!doc.slug
                  const pool = (payload.db as any).pool
                  
                  if (!pool) throw new Error('No DB pool found')

                  // Construct query
                  // We need to handle potential schema variations (e.g. if slug col doesn't exist? usually it does for these collections)
                  // Safest: Use payload.params naming? NO, just standard columns.
                  
                  let query = ''
                  let values = []
                  
                  // Timestamp
                  const now = new Date().toISOString()
                  
                  if (hasSlug) {
                       query = `INSERT INTO "${slug}" ("title", "slug", "_status", "created_at", "updated_at") VALUES ($1, $2, 'draft', $3, $4) RETURNING id`
                       values = [doc.title || 'Untitled', doc.slug, now, now]
                  } else {
                       query = `INSERT INTO "${slug}" ("title", "_status", "created_at", "updated_at") VALUES ($1, 'draft', $2, $3) RETURNING id`
                       values = [doc.title || 'Untitled', now, now]
                  }

                  const res = await pool.query(query, values)
                  const newId = res.rows[0].id
                  
                  console.log(`${slug} placeholder (SQL): ${doc.title} (${oldId} -> ${newId})`)
                  idMap.set(oldId, newId)
              } catch (err: any) {
                  console.error(`Failed to create SQL placeholder for ${slug} ${oldId}:`, err.message)
                  // Fallback: If SQL fails (e.g. column missing), we skip.
              }
          }
      }
  }
  
  // 4b. Content - PASS 2 (Full Data)
  console.log('--- Importing Content (Pass 2: Full Data) ---')
  for (const slug of contentCollections) {
      if (backup[slug]) {
          for (const doc of backup[slug]) {
              const oldId = doc.id
              if (!idMap.has(oldId)) continue; // Skip if placeholder failed
              const newId = idMap.get(oldId);
              
              const clean = cleanDoc(doc)
              const data = processFields(clean) // Now idMap has all content IDs (including circular)

              try {
                  await payload.update({
                      collection: slug as any, 
                      id: newId as any,
                      data,
                      overrideAccess: true,
                  })
                  console.log(`${slug} updated: ${doc.title} (${newId})`)
              } catch (err: any) {
                  console.error(`Failed to update ${slug} ${newId}:`, err.message)
              }
          }
      }
  }
  
  // 5. Globals
  const globals = ['header', 'footer']
  console.log(`--- Importing Globals ---`)
  for (const slug of globals) {
      if (backup[slug]) {
          console.log(`Updating ${slug}...`)
          const doc = backup[slug]
          const data = processFields(doc)
          try {
             await payload.updateGlobal({
                  slug: slug as any,
                  data,
                  overrideAccess: true,
              })
              console.log(`${slug} updated.`)
          } catch (err: any) {
               console.error(`Failed to update ${slug}:`, err.message)
          }
      }
  }

  console.log('Import completed.')
  process.exit(0)
}

importData()
