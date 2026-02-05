
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

async function patchPosts() {
  const payload = await getPayload({ config: configPromise })
  
  const backupPath = path.resolve(dirname, '../../backup.json')
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
  const usersBackup = JSON.parse(fs.readFileSync(path.resolve(dirname, '../../users-backup.json'), 'utf-8'))

  // Re-build User Map by Email
  // Postgres users have new IDs.
  // We need to map MongoID -> Email -> PostgresID.
  // Or just Email -> PostgresID.
  const userMap = new Map() // MongoID -> PostgresID
  const dbUsers = await payload.find({ collection: 'users', limit: 1000 })
  for (const u of dbUsers.docs) {
      userMap.set(u.email, u.id)
  }
  const mongoUserMap = new Map() // MongoID -> PostgresID
  for (const oldU of usersBackup) {
      // oldU has _id and email
      const newId = userMap.get(oldU.email)
      if (newId) {
          mongoUserMap.set(oldU._id, newId)
          mongoUserMap.set(oldU.id, newId) // Handle both id formats
      }
  }

  // Re-build Media Map by Filename
  const mediaMap = new Map()
  const dbMedia = await payload.find({ collection: 'media', limit: 1000 })
  const dbMediaDocs = dbMedia.docs

  const findMediaId = (filename: string, filesize: number) => {
      // 1. Exact match
      const exact = dbMediaDocs.find(m => m.filename === filename)
      if (exact) return exact.id

      // 2. Fuzzy match (name-*.ext) and size overlap
      const ext = path.extname(filename)
      const base = path.basename(filename, ext)
      const regex = new RegExp(`^${base}-\\d+${ext}$`)
      
      const candidates = dbMediaDocs.filter(m => {
          if (m.filename === filename) return true
          if (typeof m.filename === 'string' && regex.test(m.filename)) return true
          return false
      })

      // Filter by size if possible (approx match?)
      // Backup size might match DB size exactly.
      const sizeMatch = candidates.find(m => m.filesize === filesize)
      if (sizeMatch) return sizeMatch.id
      
      // Fallback: Return first candidate (or most recent by ID?)
      if (candidates.length > 0) return candidates[0].id
      return null
  }
  
  const mongoMediaMap = new Map() // MongoID -> PostgresID
  for (const oldM of backup.media) {
      const newId = findMediaId(oldM.filename, oldM.filesize)
      if (newId) mongoMediaMap.set(oldM.id, newId)
  }

  // Helper to replace IDs
  const replaceIds = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(replaceIds)
    if (obj && typeof obj === 'object') {
      const newObj: any = {}
      for (const key in obj) {
        if (key === 'id' || key === '_id' || key === 'populatedAuthors') continue
        const val = obj[key]
        
        // Check ID maps
        if (typeof val === 'string') {
            if (mongoUserMap.has(val)) { newObj[key] = mongoUserMap.get(val); continue }
            if (mongoMediaMap.has(val)) { newObj[key] = mongoMediaMap.get(val); continue }
        }
        
        newObj[key] = replaceIds(val)
      }
      return newObj
    }
    return obj
  }

  // Patch Posts
  if (backup.posts) {
      for (const doc of backup.posts) {
          // Find existing post by Slug
          const existing = await payload.find({
              collection: 'posts',
              where: { slug: { equals: doc.slug } }
          })
          
          if (existing.docs.length > 0) {
              const target = existing.docs[0]
              
              // Prepare data
              // Omit relatedPosts
              const { relatedPosts, populatedAuthors, ...rest } = doc
              const data = replaceIds(rest)
              
              // Remove IDs from data top level
              delete data.id
              delete data._id
              
              try {
                  await payload.update({
                      collection: 'posts',
                      id: target.id,
                      data,
                      overrideAccess: true
                  })
                  console.log(`Patched post: ${doc.title}`)
              } catch (e: any) {
                  console.error(`Failed to patch post ${doc.title}:`, e.message)
              }
          }
      }
  }
  
  process.exit(0)
}

patchPosts()
