import type { WorkoutRecord } from "../types/workout"

/**
 * Advanced power metrics derived from workout data.
 * These are commonly used by professional cyclists and coaches.
 */
export interface PowerMetrics {
	normalizedPower: number // NP - weighted average accounting for variability
	intensityFactor: number // IF - ratio of NP to FTP
	trainingStressScore: number // TSS - training load metric
	variabilityIndex: number // VI - ratio of NP to average power (1.0 = perfectly steady)
	bestPower1min: number // Best 1-minute average power
	bestPower5min: number // Best 5-minute average power
	bestPower20min: number // Best 20-minute average power (FTP estimate)
	workKJ: number // Total work in kilojoules
}

/**
 * Computes Normalized Power (NP) using the 30-second rolling average method.
 * NP is a weighted average power that accounts for the physiological cost of
 * power variability. Higher variability = higher NP relative to average power.
 */
function computeNormalizedPower(records: WorkoutRecord[]): number {
	const powerValues = records
		.map((r) => r.power)
		.filter((p): p is number => p !== undefined && p > 0)

	if (powerValues.length === 0) return 0

	// Step 1: Compute 30-second rolling averages
	const windowSize = 30 // 30 samples (assuming 1 Hz)
	const rollingAverages: number[] = []

	for (let i = 0; i < powerValues.length; i++) {
		const start = Math.max(0, i - windowSize + 1)
		const window = powerValues.slice(start, i + 1)
		const avg = window.reduce((sum, p) => sum + p, 0) / window.length
		rollingAverages.push(avg)
	}

	// Step 2: Raise each value to the 4th power
	const raised = rollingAverages.map((v) => Math.pow(v, 4))

	// Step 3: Take the average
	const avgRaised = raised.reduce((sum, v) => sum + v, 0) / raised.length

	// Step 4: Take the 4th root
	return Math.pow(avgRaised, 1 / 4)
}

/**
 * Computes the best average power for a given duration (in seconds).
 */
function computeBestAvgPower(records: WorkoutRecord[], durationSeconds: number): number {
	const powerValues = records
		.map((r) => r.power)
		.filter((p): p is number => p !== undefined && p > 0)

	if (powerValues.length < durationSeconds) return 0

	let maxAvg = 0

	for (let i = 0; i <= powerValues.length - durationSeconds; i++) {
		const window = powerValues.slice(i, i + durationSeconds)
		const avg = window.reduce((sum, p) => sum + p, 0) / window.length
		maxAvg = Math.max(maxAvg, avg)
	}

	return maxAvg
}

/**
 * Computes Training Stress Score (TSS).
 * TSS = (duration * NP * IF) / (FTP * 3600) * 100
 * where IF = NP / FTP
 */
function computeTSS(
	durationSeconds: number,
	normalizedPower: number,
	functionalThresholdPower: number,
): number {
	if (functionalThresholdPower === 0) return 0
	const intensityFactor = normalizedPower / functionalThresholdPower
	return (
		((durationSeconds * normalizedPower * intensityFactor) / (functionalThresholdPower * 3600)) *
		100
	)
}

/**
 * Computes all advanced power metrics from workout data.
 */
export function computePowerMetrics(
	records: WorkoutRecord[],
	durationSeconds: number,
	functionalThresholdPower: number = 0, // User's FTP (if known)
): PowerMetrics {
	const powerValues = records
		.map((r) => r.power)
		.filter((p): p is number => p !== undefined && p > 0)

	const avgPower =
		powerValues.length > 0 ? powerValues.reduce((sum, p) => sum + p, 0) / powerValues.length : 0

	const normalizedPower = computeNormalizedPower(records)
	const intensityFactor =
		functionalThresholdPower > 0 ? normalizedPower / functionalThresholdPower : 0
	const trainingStressScore =
		functionalThresholdPower > 0
			? computeTSS(durationSeconds, normalizedPower, functionalThresholdPower)
			: 0
	const variabilityIndex = avgPower > 0 ? normalizedPower / avgPower : 0

	const bestPower1min = computeBestAvgPower(records, 60) // 1 minute = 60 seconds
	const bestPower5min = computeBestAvgPower(records, 300) // 5 minutes = 300 seconds
	const bestPower20min = computeBestAvgPower(records, 1200) // 20 minutes = 1200 seconds

	// Work in kilojoules (approximately equal to calories for cycling)
	const workKJ = (avgPower * durationSeconds) / 1000

	return {
		normalizedPower: Math.round(normalizedPower),
		intensityFactor: Number(intensityFactor.toFixed(2)),
		trainingStressScore: Math.round(trainingStressScore),
		variabilityIndex: Number(variabilityIndex.toFixed(2)),
		bestPower1min: Math.round(bestPower1min),
		bestPower5min: Math.round(bestPower5min),
		bestPower20min: Math.round(bestPower20min),
		workKJ: Math.round(workKJ),
	}
}
