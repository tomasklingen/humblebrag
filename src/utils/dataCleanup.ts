import type { WorkoutRecord } from "../types/workout"

// Window size for median filter: ±2 samples (5 samples total)
const WINDOW_HALF = 6

// A value is a spike if it deviates from the median by more than this factor
// e.g., 1.5 means value > median * 1.5 or value < median / 1.5
const THRESHOLD = 1

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
	field: "power" | "heartRate",
): number | undefined {
	const start = Math.max(0, index - WINDOW_HALF)
	const end = Math.min(records.length - 1, index + WINDOW_HALF)

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
 * A spike is defined as a value that deviates by more than THRESHOLD from the median.
 */
function isSpike(value: number, med: number): boolean {
	return value > med * THRESHOLD || value < med / THRESHOLD
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
export function removeSpikes(records: WorkoutRecord[]): WorkoutRecord[] {
	return records.map((record, index) => {
		let power = record.power
		let heartRate = record.heartRate

		// Check power for spikes
		if (power !== undefined) {
			const med = getWindowMedian(records, index, "power")
			if (med !== undefined && med > 0 && isSpike(power, med)) {
				power = med
			}
		}

		// Check heart rate for spikes
		if (heartRate !== undefined) {
			const med = getWindowMedian(records, index, "heartRate")
			if (med !== undefined && med > 0 && isSpike(heartRate, med)) {
				heartRate = med
			}
		}

		// Return original record if no changes needed
		if (power === record.power && heartRate === record.heartRate) {
			return record
		}

		return { ...record, power, heartRate }
	})
}
