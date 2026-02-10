export interface WorkoutData {
	sport: string
	subSport: string
	date: Date
	duration: number // seconds
	distance: number // km
	avgPower: number // watts
	maxPower: number // watts
	avgSpeed: number // km/h
	avgHeartRate: number // bpm
	maxHeartRate: number // bpm
	calories: number
	records: WorkoutRecord[]
}

export interface WorkoutRecord {
	timestamp: Date
	elapsedMinutes: number
	power?: number // watts
	targetPower?: number // watts (planned workout target)
	heartRate?: number // bpm
	speed?: number // km/h
	cadence?: number // rpm
	distance?: number // km
}

export interface CardSettings {
	showHeartRate: boolean
	showTargetPower: boolean
	xAxisMode: "time" | "distance"
	xAxisInterval: number | null // null = auto, otherwise minutes or km depending on xAxisMode
	trimStartMinutes: number
	trimEndMinutes: number | null // null = full workout (no trim)
}

// Raw FIT file data structure from fit-file-parser
export interface FitFileData {
	activity?: {
		sessions?: FitSession[]
		laps?: FitLap[]
		records?: FitRecord[]
	}
	sessions?: FitSession[]
	laps?: FitLap[]
	records?: FitRecord[]
}

export interface FitSession {
	sport?: string
	sub_sport?: string
	start_time?: Date | string
	timestamp?: Date | string
	total_elapsed_time?: number
	total_timer_time?: number
	total_distance?: number
	avg_power?: number
	max_power?: number
	avg_speed?: number
	avg_heart_rate?: number
	max_heart_rate?: number
	total_calories?: number
}

export interface FitLap {
	timestamp?: Date | string
	start_time?: Date | string
	total_elapsed_time?: number
	total_timer_time?: number
	total_distance?: number
	avg_power?: number
	avg_speed?: number
	avg_heart_rate?: number
}

export interface FitRecord {
	timestamp?: Date | string
	power?: number
	target_power?: number
	heart_rate?: number
	speed?: number
	cadence?: number
	distance?: number
}
