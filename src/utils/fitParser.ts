import FitParser from "fit-file-parser"
import type { FitFileData, WorkoutData, WorkoutRecord } from "../types/workout"

export async function parseFitFile(file: File): Promise<WorkoutData> {
	// Read file as ArrayBuffer
	const arrayBuffer = await file.arrayBuffer()

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

	// Validate it's a cycling workout
	const sport = session.sport || "unknown"
	if (sport.toLowerCase() !== "cycling") {
		throw new Error(`Only cycling workouts are currently supported. Found: ${sport}`)
	}

	// Extract records (time series data)
	const fitRecords = data.activity?.records || data.records || []

	if (fitRecords.length === 0) {
		throw new Error("No workout records found in FIT file")
	}

	// Transform records into our format
	const startTimeRaw = session.start_time || session.timestamp || new Date()
	const startTime = startTimeRaw instanceof Date ? startTimeRaw : new Date(startTimeRaw)
	const records: WorkoutRecord[] = fitRecords.map((record) => {
		const timestampRaw = record.timestamp || startTime
		const timestamp = timestampRaw instanceof Date ? timestampRaw : new Date(timestampRaw)
		const elapsedSeconds = (timestamp.getTime() - startTime.getTime()) / 1000

		return {
			timestamp,
			elapsedMinutes: elapsedSeconds / 60,
			power: record.power,
			heartRate: record.heart_rate,
			speed: record.speed,
			cadence: record.cadence,
			distance: record.distance,
		}
	})

	// Build WorkoutData
	const dateRaw = session.start_time || session.timestamp || new Date()
	const date = dateRaw instanceof Date ? dateRaw : new Date(dateRaw)
	const workoutData: WorkoutData = {
		sport: session.sport || "cycling",
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
