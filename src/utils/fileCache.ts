const DB_NAME = "humblebrag-cache"
const DB_VERSION = 1
const FILE_STORE = "fit-files"
const LATEST_FILE_KEY = "latest"

interface CachedFitFile {
	name: string
	type: string
	lastModified: number
	blob: Blob
}

const isCachedFitFile = (value: unknown): value is CachedFitFile => {
	if (typeof value !== "object" || value === null) {
		return false
	}

	const candidate = value as Partial<CachedFitFile>
	return (
		typeof candidate.name === "string" &&
		typeof candidate.type === "string" &&
		typeof candidate.lastModified === "number" &&
		candidate.blob instanceof Blob
	)
}

const openCacheDatabase = async (): Promise<IDBDatabase | null> => {
	if (typeof indexedDB === "undefined") {
		return null
	}

	return await new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION)

		request.onupgradeneeded = () => {
			const database = request.result
			if (!database.objectStoreNames.contains(FILE_STORE)) {
				database.createObjectStore(FILE_STORE)
			}
		}

		request.onsuccess = () => {
			resolve(request.result)
		}

		request.addEventListener("error", () => {
			reject(request.error ?? new Error("Failed to open FIT cache database"))
		})
	})
}

export const saveCachedFitFile = async (file: File): Promise<void> => {
	const database = await openCacheDatabase()
	if (!database) {
		return
	}

	await new Promise<void>((resolve, reject) => {
		const transaction = database.transaction(FILE_STORE, "readwrite")
		const store = transaction.objectStore(FILE_STORE)
		const payload: CachedFitFile = {
			name: file.name,
			type: file.type,
			lastModified: file.lastModified,
			blob: file,
		}

		store.put(payload, LATEST_FILE_KEY)

		transaction.oncomplete = () => {
			resolve()
		}

		transaction.addEventListener("error", () => {
			reject(transaction.error ?? new Error("Failed to persist FIT file"))
		})
	})

	database.close()
}

export const loadCachedFitFile = async (): Promise<File | null> => {
	const database = await openCacheDatabase()
	if (!database) {
		return null
	}

	const cachedEntry = await new Promise<CachedFitFile | null>((resolve, reject) => {
		const transaction = database.transaction(FILE_STORE, "readonly")
		const store = transaction.objectStore(FILE_STORE)
		const request = store.get(LATEST_FILE_KEY)

		request.onsuccess = () => {
			resolve(isCachedFitFile(request.result) ? request.result : null)
		}

		request.addEventListener("error", () => {
			reject(request.error ?? new Error("Failed to load cached FIT file"))
		})
	})

	database.close()

	if (!cachedEntry) {
		return null
	}

	return new File([cachedEntry.blob], cachedEntry.name, {
		type: cachedEntry.type,
		lastModified: cachedEntry.lastModified,
	})
}

export const clearCachedFitFile = async (): Promise<void> => {
	const database = await openCacheDatabase()
	if (!database) {
		return
	}

	await new Promise<void>((resolve, reject) => {
		const transaction = database.transaction(FILE_STORE, "readwrite")
		const store = transaction.objectStore(FILE_STORE)

		store.delete(LATEST_FILE_KEY)

		transaction.oncomplete = () => {
			resolve()
		}

		transaction.addEventListener("error", () => {
			reject(transaction.error ?? new Error("Failed to clear cached FIT file"))
		})
	})

	database.close()
}
