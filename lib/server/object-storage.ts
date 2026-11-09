import "server-only"

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

/**
 * Object storage untuk isi berkas unggahan (RustFS di lch-server).
 *
 * Dipakai lewat API S3 biasa, jadi tidak terikat ke RustFS: pindah ke
 * SeaweedFS, Cloudflare R2, atau penyedia S3 lain cukup mengganti env.
 *
 * Kalau env belum lengkap (misalnya demo Vercel), object storage dianggap
 * mati dan isi berkas tetap disimpan di kolom stored_files.data seperti
 * sebelumnya.
 */

type StorageConfig = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

function readConfig(): StorageConfig | null {
  const endpoint = process.env.S3_ENDPOINT
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
  const bucket = process.env.S3_BUCKET
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null
  return {
    endpoint,
    region: process.env.S3_REGION || "us-east-1",
    accessKeyId,
    secretAccessKey,
    bucket,
  }
}

let cached: { client: S3Client; bucket: string } | null | undefined

function storage() {
  if (cached !== undefined) return cached
  const config = readConfig()
  cached = config
    ? {
        bucket: config.bucket,
        client: new S3Client({
          endpoint: config.endpoint,
          region: config.region,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
          // RustFS dan server S3 self-hosted lain memakai alamat
          // http://host/bucket/key, bukan subdomain per bucket.
          forcePathStyle: true,
          // Checksum tambahan bawaan SDK baru tidak didukung semua server S3.
          requestChecksumCalculation: "WHEN_REQUIRED",
          responseChecksumValidation: "WHEN_REQUIRED",
          maxAttempts: 2,
        }),
      }
    : null
  return cached
}

export function objectStorageEnabled() {
  return storage() !== null
}

export function isObjectStorageRequired(): boolean {
  return process.env.REQUIRE_OBJECT_STORAGE === "true"
}

export function isStorageUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const err = error as {
    name?: string
    message?: string
    code?: string
    $metadata?: { httpStatusCode?: number }
  }
  if (err.$metadata?.httpStatusCode && err.$metadata.httpStatusCode >= 500) {
    return true
  }
  if (err.name === "TimeoutError" || err.name === "ConnectTimeoutError") {
    return true
  }
  if (
    err.code === "ECONNREFUSED" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ENOTFOUND"
  ) {
    return true
  }
  const msg = (err.message || "").toLowerCase()
  return (
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound") ||
    msg.includes("fetch failed") ||
    msg.includes("timeout")
  )
}

function required() {
  const s = storage()
  if (!s) throw new Error("Object storage belum dikonfigurasi (S3_*).")
  return s
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string
) {
  const { client, bucket } = required()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
    })
  )
}

export async function getObject(key: string): Promise<Uint8Array<ArrayBuffer>> {
  const { client, bucket } = required()
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  )
  if (!result.Body) throw new Error(`Objek ${key} kosong.`)
  // Disalin ke ArrayBuffer biasa supaya bisa langsung jadi body Response.
  return new Uint8Array(await result.Body.transformToByteArray())
}

export async function getObjectStream(key: string): Promise<ReadableStream> {
  const { client, bucket } = required()
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  )
  if (!result.Body) throw new Error(`Objek ${key} kosong.`)
  return result.Body.transformToWebStream()
}

/** Hapus beberapa objek. Objek yang sudah tidak ada tidak dianggap gagal. */
export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return
  const { client, bucket } = required()
  // Batas DeleteObjects S3 adalah 1000 key per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      })
    )
    if (result.Errors?.length) {
      const first = result.Errors[0]
      throw new Error(
        `Gagal menghapus ${result.Errors.length} objek, misalnya ${first.Key}: ${first.Message}`
      )
    }
  }
}

/** Semua objek di bucket beserta waktu terakhir ditulis. */
export async function listObjects() {
  const { client, bucket } = required()
  const objects: { key: string; lastModified: Date | undefined }[] = []
  let token: string | undefined
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
    )
    for (const o of page.Contents ?? []) {
      if (o.Key) objects.push({ key: o.Key, lastModified: o.LastModified })
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
  return objects
}
