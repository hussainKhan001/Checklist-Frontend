import { useCallback, useEffect, useRef, useState } from 'react'

const DB_NAME = 'nqc-offline-uploads'
const STORE   = 'queue'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'localId' })
        store.createIndex('ownerId', 'ownerId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function withStore(mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    let result
    Promise.resolve(fn(store)).then(r => { result = r })
    tx.oncomplete = () => resolve(result)
    tx.onerror    = () => reject(tx.error)
  })
}

function put(record) {
  return withStore('readwrite', store => store.put(record))
}
function removeRecord(localId) {
  return withStore('readwrite', store => store.delete(localId))
}
function getAllForOwner(ownerId) {
  return new Promise(async (resolve, reject) => {
    const db  = await openDB()
    const tx  = db.transaction(STORE, 'readonly')
    const idx = tx.objectStore(STORE).index('ownerId')
    const req = idx.getAll(ownerId)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

let seq = 0
export function makeLocalId() {
  seq += 1
  return `local-${Date.now()}-${seq}`
}

// Persists blobs that failed to upload (e.g. weak site network) in IndexedDB
// and retries them in the background — on an interval and whenever the
// browser regains connectivity — until each one succeeds or is dropped.
// `uploadFn(blob, meta)` must resolve with the uploaded photo's URL.
// `onSynced(meta, url)` fires once per successful background upload so the
// caller can move it from "pending" into real state.
export function useOfflineUploadQueue(ownerId, uploadFn, onSynced) {
  const [pending, setPending] = useState([])
  const uploadFnRef = useRef(uploadFn)
  const onSyncedRef = useRef(onSynced)
  uploadFnRef.current = uploadFn
  onSyncedRef.current = onSynced

  useEffect(() => {
    if (!ownerId) return
    let cancelled = false
    getAllForOwner(ownerId).then(records => { if (!cancelled) setPending(records) }).catch(() => {})
    return () => { cancelled = true }
  }, [ownerId])

  const enqueue = useCallback(async (localId, meta, blob) => {
    const record = { localId, ownerId, meta, blob, createdAt: Date.now() }
    await put(record)
    setPending(prev => [...prev.filter(r => r.localId !== localId), record])
  }, [ownerId])

  const flush = useCallback(async () => {
    if (!ownerId || !navigator.onLine) return
    let records
    try { records = await getAllForOwner(ownerId) } catch { return }
    for (const record of records) {
      try {
        const url = await uploadFnRef.current(record.blob, record.meta)
        await removeRecord(record.localId)
        setPending(prev => prev.filter(r => r.localId !== record.localId))
        onSyncedRef.current?.(record.meta, url)
      } catch {
        // still offline / still failing — stays queued, retried next tick
      }
    }
  }, [ownerId])

  useEffect(() => {
    if (!ownerId) return
    window.addEventListener('online', flush)
    const interval = setInterval(flush, 20000)
    flush()
    return () => {
      window.removeEventListener('online', flush)
      clearInterval(interval)
    }
  }, [ownerId, flush])

  return { pending, enqueue }
}
