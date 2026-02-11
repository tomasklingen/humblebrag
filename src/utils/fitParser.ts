import type { FitFileData, FitRecord, WorkoutData, WorkoutRecord } from "../types/workout"

const SUPPORTED_SPORTS = new Set(["cycling", "running"])

const asFiniteNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null

const readNumericField = (record: FitRecord, keys: string[]): number | undefined => {
	const dynamicRecord: Record<string, unknown> = isRecord(record) ? record : {}
	for (const key of keys) {
		const value = asFiniteNumber(dynamicRecord[key])
		if (value !== undefined) {
			return value
		}
	}
	return undefined
}

export async function parseFitFile(file: File): Promise<WorkoutData> {
	// Read file as ArrayBuffer
	const arrayBuffer = await file.arrayBuffer()
	const { default: FitParser } = await import("fit-file-parser")

	// Parse with fit-file-parser using async method
	const fitParser = new FitParser({
		force: true,
		speedUnit: "km/h",
		lengthUnit: "km",
		temperatureUnit: "celsius",
		elapsedRecordField: true,
		mode: "list",
	})

	try {
		const data = await fitParser.parseAsync(arrayBuffer)
		const workoutData = transformFitData(data as FitFileData)
		return workoutData
	} catch (error) {
		throw new Error(
			`Failed to parse FIT file: ${error instanceof Error ? error.message : "Unknown error"}`,
		)
	}
}

function transformFitData(data: FitFileData): WorkoutData {
	// Extract session data (primary workout summary)
	const sessions = data.activity?.sessions || data.sessions || []

	if (sessions.length === 0) {
		throw new Error("No workout session found in FIT file")
	}

	const session = sessions[0]

	// Validate supported workout sport
	const sport = session.sport || "unknown"
	if (!SUPPORTED_SPORTS.has(sport.toLowerCase())) {
		throw new Error(`Only cycling and running workouts are currently supported. Found: ${sport}`)
	}

	// Extract records (time series data)
	const fitRecords = data.activity?.records || data.records || []

	if (fitRecords.length === 0) {
		throw new Error("No workout records found in FIT file")
	}

	// Transform records into our format
	const startTimeRaw = session.start_time || session.timestamp || new Date()
	const startTime = startTimeRaw instanceof Date ? startTimeRaw : new Date(startTimeRaw)
	const records: WorkoutRecord[] = []
	let previousTimestamp: Date | null = null
	let previousDistanceKm: number | undefined

	for (const record of fitRecords) {
		const timestampRaw = record.timestamp || startTime
		const timestamp = timestampRaw instanceof Date ? timestampRaw : new Date(timestampRaw)
		const elapsedSeconds = (timestamp.getTime() - startTime.getTime()) / 1000
		const distanceKm = readNumericField(record, ["distance", "enhanced_distance"])

		const sourceSpeedKmh = readNumericField(record, ["speed", "enhanced_speed"])
		let derivedSpeedKmh: number | undefined

		if (
			sourceSpeedKmh === undefined &&
			distanceKm !== undefined &&
			previousDistanceKm !== undefined &&
			previousTimestamp !== null
		) {
			const distanceDeltaKm = distanceKm - previousDistanceKm
			const elapsedDeltaHours = (timestamp.getTime() - previousTimestamp.getTime()) / 3_600_000
			if (distanceDeltaKm > 0 && elapsedDeltaHours > 0) {
				derivedSpeedKmh = distanceDeltaKm / elapsedDeltaHours
			}
		}

		records.push({
			timestamp,
			elapsedMinutes: elapsedSeconds / 60,
			power: record.power,
			targetPower: record.target_power,
			heartRate: record.heart_rate,
			speed: sourceSpeedKmh ?? derivedSpeedKmh,
			cadence: record.cadence,
			distance: distanceKm,
		})

		previousTimestamp = timestamp
		if (distanceKm !== undefined) {
			previousDistanceKm = distanceKm
		}
	}

	// Build WorkoutData
	const dateRaw = session.start_time || session.timestamp || new Date()
	const date = dateRaw instanceof Date ? dateRaw : new Date(dateRaw)
	const workoutData: WorkoutData = {
		sport: session.sport || sport,
		subSport: session.sub_sport || "",
		date,
		duration: session.total_elapsed_time || session.total_timer_time || 0,
		distance: session.total_distance || 0,
		avgPower: session.avg_power || 0,
		maxPower: session.max_power || 0,
		avgSpeed: session.avg_speed || 0,
		avgHeartRate: session.avg_heart_rate || 0,
		maxHeartRate: session.max_heart_rate || 0,
		calories: session.total_calories || 0,
		records,
	}

	return workoutData
}
