import { S3Client, ListObjectsCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env file
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
dotenv.config({ path: path.resolve(dirname, '../.env') })

console.log('--- S3 Connection Test Script ---')
console.log('Endpoint:', process.env.SUPABASE_S3_ENDPOINT)
console.log('Bucket:', process.env.SUPABASE_BUCKET_NAME)
console.log('Region:', process.env.S3_REGION)
console.log('Access Key ID:', process.env.SUPABASE_ACCESS_KEY_ID ? '******' + process.env.SUPABASE_ACCESS_KEY_ID.slice(-4) : 'MISSING')
console.log('Secret Key:', process.env.SUPABASE_SECRET_ACCESS_KEY ? 'EXISTS' : 'MISSING')

const client = new S3Client({
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.SUPABASE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SUPABASE_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Supabase requires this
})

async function testConnection() {
  try {
    console.log('\n1. Testing ListObjects...')
    const command = new ListObjectsCommand({
      Bucket: process.env.SUPABASE_BUCKET_NAME,
      MaxKeys: 1,
    })
    const response = await client.send(command)
    console.log('✅ ListObjects Success!')
    console.log('Bucket is accessible.')
    
    console.log('\n2. Testing Upload (Test File)...')
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.SUPABASE_BUCKET_NAME,
      Key: 'test-connection.txt',
      Body: 'Connection successful',
      ContentType: 'text/plain',
    })
    await client.send(uploadCommand)
    console.log('✅ Upload Success!')
    console.log('Write permissions are working.')

  } catch (error: any) {
    console.error('\n❌ Connection Failed!')
    console.error('Error Name:', error.name)
    console.error('Error Message:', error.message)
    if (error.$metadata) {
        console.error('HTTP Status:', error.$metadata.httpStatusCode)
    }
  }
}

testConnection()
