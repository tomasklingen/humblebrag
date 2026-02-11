import type { WorkoutRecord } from "../types/workout"

/**
 * Power zones based on percentage of FTP.
 * Standard training zones used in cycling.
 */
const POWER_ZONES = {
	recovery: { min: 0, max: 0.55 }, // Active recovery
	endurance: { min: 0.55, max: 0.75 }, // Endurance / base training
	tempo: { min: 0.75, max: 0.9 }, // Tempo / sweetspot
	threshold: { min: 0.9, max: 1.05 }, // Threshold / FTP
	vo2max: { min: 1.05, max: 1.2 }, // VO2 max intervals
	anaerobic: { min: 1.2, max: Infinity }, // Anaerobic capacity / sprints
} as const

export interface WorkoutClassification {
	type: string // e.g., "Threshold Builder", "Recovery Spin"
	description: string // Fun description of the workout
	emoji: string // Visual indicator
	zoneDistribution: Record<string, number> // Percentage of time in each zone
}

/**
 * Analyzes power distribution across training zones.
 */
function analyzeZoneDistribution(records: WorkoutRecord[], ftp: number): Record<string, number> {
	if (ftp === 0) {
		return {}
	}

	const zoneCounts: Record<string, number> = {
		recovery: 0,
		endurance: 0,
		tempo: 0,
		threshold: 0,
		vo2max: 0,
		anaerobic: 0,
	}

	let totalSamples = 0

	for (const record of records) {
		if (record.power?.valueOf() === undefined || record.power === 0) {
			continue
		}

		const powerRatio = record.power / ftp
		totalSamples++

		if (powerRatio < POWER_ZONES.endurance.min) {
			zoneCounts.recovery++
		} else if (powerRatio < POWER_ZONES.tempo.min) {
			zoneCounts.endurance++
		} else if (powerRatio < POWER_ZONES.threshold.min) {
			zoneCounts.tempo++
		} else if (powerRatio < POWER_ZONES.vo2max.min) {
			zoneCounts.threshold++
		} else if (powerRatio < POWER_ZONES.anaerobic.min) {
			zoneCounts.vo2max++
		} else {
			zoneCounts.anaerobic++
		}
	}

	// Convert to percentages
	const distribution: Record<string, number> = {}
	for (const [zone, count] of Object.entries(zoneCounts)) {
		distribution[zone] = totalSamples > 0 ? (count / totalSamples) * 100 : 0
	}

	return distribution
}

/**
 * Calculates variability coefficient (how spiky the workout is).
 */
function calculateVariability(records: WorkoutRecord[]): number {
	const powers = records.map((r) => r.power).filter((p): p is number => p !== undefined && p > 0)

	if (powers.length === 0) return 0

	const mean = powers.reduce((sum, p) => sum + p, 0) / powers.length
	const variance = powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / powers.length
	const stdDev = Math.sqrt(variance)

	return mean > 0 ? stdDev / mean : 0
}

/**
 * Classifies the workout based on power distribution and characteristics.
 */
export function classifyWorkout(
	records: WorkoutRecord[],
	ftp: number,
	normalizedPower: number,
	variabilityIndex: number,
	sport: string = "cycling",
): WorkoutClassification {
	const isRunning = sport.toLowerCase().includes("running")
	const sportRaceNoun = isRunning ? "on foot" : "on two wheels"

	// If no FTP, provide generic classification
	if (ftp === 0) {
		const variability = calculateVariability(records)

		if (variability > 0.5) {
			return {
				type: "Chaos Mode",
				description: "All over the map. The power graph tells a story.",
				emoji: "🎲",
				zoneDistribution: {},
			}
		}

		return {
			type: "The Grind",
			description: "Kept it honest. Set a pace and held the line.",
			emoji: "🚴",
			zoneDistribution: {},
		}
	}

	const zones = analyzeZoneDistribution(records, ftp)
	const variability = calculateVariability(records)
	const intensityFactor = normalizedPower / ftp

	// Recovery ride: mostly Z1-Z2, low intensity
	if (zones.recovery + zones.endurance > 80 && intensityFactor < 0.75) {
		return {
			type: "Active Recovery",
			description: "Easy does it. Keep it light today and bank freshness for the next hard one.",
			emoji: "🧘",
			zoneDistribution: zones,
		}
	}

	// Endurance ride: mostly Z2, steady effort
	if (zones.endurance > 60 && variability < 0.3 && intensityFactor < 0.85) {
		return {
			type: "Base Miles",
			description: "Long and steady. The kind of work that pays off in months, not days.",
			emoji: "🛤️",
			zoneDistribution: zones,
		}
	}

	// Tempo/Sweetspot: lots of Z3, sustained effort
	if (zones.tempo > 40 && variability < 0.35) {
		return {
			type: "Sweetspot",
			description:
				"Right in the productive pain cave. Hard enough to adapt, not hard enough to break.",
			emoji: "🎯",
			zoneDistribution: zones,
		}
	}

	// Threshold work: significant Z4, hard sustained efforts
	if (zones.threshold > 25 && variability < 0.4) {
		return {
			type: "Threshold",
			description: "Riding the edge of sustainable. This is where limits move.",
			emoji: "🔥",
			zoneDistribution: zones,
		}
	}

	// VO2 max intervals: lots of Z5, spiky
	if (zones.vo2max > 15 && variability > 0.4) {
		return {
			type: "VO2 Max",
			description: "Short, sharp, and brutal. The kind of work that rewires your ceiling.",
			emoji: "💀",
			zoneDistribution: zones,
		}
	}

	// Sprint/Anaerobic: Z6 efforts, very spiky
	if (zones.anaerobic > 10 || variability > 0.6) {
		return {
			type: "Full Send",
			description: "Neuromuscular chaos. Every match burned, nothing held back.",
			emoji: "⚡",
			zoneDistribution: zones,
		}
	}

	// High VI but mixed zones: race or group ride
	if (variabilityIndex > 1.1 && variability > 0.45) {
		return {
			type: "Race Day",
			description: `Surges, attacks, recoveries. Controlled chaos ${sportRaceNoun}.`,
			emoji: "🏁",
			zoneDistribution: zones,
		}
	}

	// Mixed workout with varied efforts
	if (variability > 0.35) {
		return {
			type: "Mixed Bag",
			description: "A bit of everything. Structured variety across the zones.",
			emoji: "🔀",
			zoneDistribution: zones,
		}
	}

	// Default: general training
	return {
		type: "The Grind",
		description: "Kept it honest. Set a pace and held the line.",
		emoji: "🚴",
		zoneDistribution: zones,
	}
}

/**
 * Formats zone distribution for display.
 */
export function formatZoneDistribution(distribution: Record<string, number>): string {
	const zones = Object.entries(distribution)
		.filter(([_, percent]) => percent > 5) // Only show zones with >5% time
		.sort(([_, a], [__, b]) => b - a) // Sort by percentage descending
		.map(([zone, percent]) => `${zone}: ${Math.round(percent)}%`)
		.join(", ")

	return zones || "No zone data"
}
