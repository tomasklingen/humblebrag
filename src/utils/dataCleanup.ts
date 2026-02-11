import type { WorkoutRecord } from "../types/workout"

const MIN_WINDOW_HALF = 2
const MAX_WINDOW_HALF = 12
const MIN_THRESHOLD = 1.05
const MAX_THRESHOLD = 2.2

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max)

const toStrengthRatio = (smoothingStrength: number): number =>
	clamp(smoothingStrength, 0, 100) / 100

/**
 * Computes the median of an array of numbers.
 */
function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Computes the median value of a field within a window around the given index.
 * Window is ±WINDOW_HALF samples from the current index.
 */
function getWindowMedian(
	records: WorkoutRecord[],
	index: number,
	field: "power" | "heartRate" | "speed",
	windowHalf: number,
): number | undefined {
	const start = Math.max(0, index - windowHalf)
	const end = Math.min(records.length - 1, index + windowHalf)

	const values: number[] = []
	for (let i = start; i <= end; i++) {
		const v = records[i][field]
		if (v !== undefined) {
			values.push(v)
		}
	}

	return values.length > 0 ? median(values) : undefined
}

/**
 * Returns true if the value is a spike relative to the median.
 * A spike is defined as a value that deviates by more than threshold from the median.
 */
function isSpike(value: number, med: number, threshold: number): boolean {
	return value > med * threshold || value < med / threshold
}

/**
 * Removes records where power is zero or undefined.
 *
 * During indoor workouts, there are often pauses (e.g., between intervals) where
 * power drops to zero. These can create visual noise in the chart and distort
 * the power profile. This filter removes those zero-power segments.
 */
export function removeZeroPower(records: WorkoutRecord[]): WorkoutRecord[] {
	return records.filter((record) => record.power !== undefined && record.power > 0)
}

/**
 * Removes records where heart rate is zero or undefined.
 *
 * Similar to power, heart rate can drop to zero during pauses or sensor dropouts.
 * This filter removes those zero-HR segments from the chart.
 */
export function removeZeroHeartRate(records: WorkoutRecord[]): WorkoutRecord[] {
	return records.filter((record) => record.heartRate !== undefined && record.heartRate > 0)
}

/**
 * Rolling median spike filter for workout sensor data.
 *
 * Power and heart rate sensors occasionally produce glitch spikes (e.g., a single 2000W
 * reading in a 200W ride). This filter removes those outliers by comparing each point
 * to the median of surrounding points. If a value deviates significantly from the
 * local median, it's replaced with the median.
 *
 * This is a standard technique for cleaning noisy sensor data — the median is robust
 * to isolated outliers without distorting real data patterns.
 */
export function removeSpikes(records: WorkoutRecord[], smoothingStrength: number): WorkoutRecord[] {
	const strength = toStrengthRatio(smoothingStrength)
	if (strength <= 0) {
		return records
	}

	const windowHalf = Math.round(MIN_WINDOW_HALF + (MAX_WINDOW_HALF - MIN_WINDOW_HALF) * strength)
	const threshold = MAX_THRESHOLD - (MAX_THRESHOLD - MIN_THRESHOLD) * strength

	return records.map((record, index) => {
		let power = record.power
		let heartRate = record.heartRate
		let speed = record.speed

		// Check power for spikes
		if (power !== undefined) {
			const med = getWindowMedian(records, index, "power", windowHalf)
			if (med !== undefined && med > 0 && isSpike(power, med, threshold)) {
				power = med
			}
		}

		// Check heart rate for spikes
		if (heartRate !== undefined) {
			const med = getWindowMedian(records, index, "heartRate", windowHalf)
			if (med !== undefined && med > 0 && isSpike(heartRate, med, threshold)) {
				heartRate = med
			}
		}

		if (speed !== undefined) {
			const med = getWindowMedian(records, index, "speed", windowHalf)
			if (med !== undefined && med > 0 && isSpike(speed, med, threshold)) {
				speed = med
			}
		}

		// Return original record if no changes needed
		if (power === record.power && heartRate === record.heartRate && speed === record.speed) {
			return record
		}

		return { ...record, power, heartRate, speed }
	})
}
