import type { CardSettings, WorkoutRecord } from "../types/workout"
import { removeZeroHeartRate, removeZeroPower } from "./dataCleanup"

export interface CleanupAdjustmentResult {
	records: WorkoutRecord[]
	changed: boolean
	removedCount: number
}

const toCsvCell = (value: string | number | null | undefined): string => {
	if (value === null || value === undefined) {
		return ""
	}

	const text = String(value)
	if (text.includes(",") || text.includes("\n") || text.includes('"')) {
		return `"${text.replaceAll('"', '""')}"`
	}

	return text
}

export function hasConfiguredDataCleanup(settings: CardSettings): boolean {
	return (
		settings.removeZeroPower ||
		settings.removeZeroHeartRate ||
		settings.trimStartMinutes > 0 ||
		settings.trimEndMinutes !== null
	)
}

export function applyCleanupAdjustments(
	records: WorkoutRecord[],
	settings: CardSettings,
): CleanupAdjustmentResult {
	const trimEnd = settings.trimEndMinutes ?? Infinity

	let adjusted = records.filter(
		(record) => record.elapsedMinutes >= settings.trimStartMinutes && record.elapsedMinutes <= trimEnd,
	)

	if (settings.removeZeroPower) {
		adjusted = removeZeroPower(adjusted)
	}

	if (settings.removeZeroHeartRate) {
		adjusted = removeZeroHeartRate(adjusted)
	}

	const changed =
		adjusted.length !== records.length || adjusted.some((record, index) => record !== records[index])

	return {
		records: adjusted,
		changed,
		removedCount: Math.max(0, records.length - adjusted.length),
	}
}

export function downloadAdjustedWorkoutCsv(records: WorkoutRecord[], filename: string): void {
	const header = [
		"timestamp",
		"elapsedMinutes",
		"distanceKm",
		"powerW",
		"targetPowerW",
		"heartRateBpm",
		"speedKmh",
		"cadenceRpm",
	]

	const lines = [header.join(",")]

	for (const record of records) {
		const row = [
			toCsvCell(record.timestamp.toISOString()),
			toCsvCell(record.elapsedMinutes.toFixed(3)),
			toCsvCell(record.distance?.toFixed(3)),
			toCsvCell(record.power),
			toCsvCell(record.targetPower),
			toCsvCell(record.heartRate),
			toCsvCell(record.speed?.toFixed(3)),
			toCsvCell(record.cadence),
		]
		lines.push(row.join(","))
	}

	const csv = `${lines.join("\n")}\n`
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
	const objectUrl = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.download = filename
	link.href = objectUrl
	link.click()
	URL.revokeObjectURL(objectUrl)
}
