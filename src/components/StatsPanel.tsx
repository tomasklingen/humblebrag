import { format } from "date-fns"
import { useMemo } from "react"
import type { CardSettings, WorkoutData } from "../types/workout"
import { computePowerMetrics } from "../utils/powerMetrics"
import "./StatsPanel.css"

interface StatsPanelProps {
	data: WorkoutData
	settings: CardSettings
}

export function StatsPanel({ data, settings }: StatsPanelProps) {
	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600)
		const minutes = Math.floor((seconds % 3600) / 60)
		const secs = Math.floor(seconds % 60)

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`
	}

	const powerMetrics = useMemo(
		() => computePowerMetrics(data.records, data.duration, settings.functionalThresholdPower),
		[data.records, data.duration, settings.functionalThresholdPower],
	)

	const isAdvancedMode = settings.statsDisplayMode === "advanced"

	// Format subSport for display
	const formatSubSport = (subSport: string): string => {
		if (subSport === "virtual_activity") return "Virtual"
		return subSport
	}

	const classification = powerMetrics.classification

	return (
		<div className="stats-panel">
			{/* SVG filter to render emoji as solid orange silhouette */}
			<svg width="0" height="0" style={{ position: "absolute" }}>
				<defs>
					<filter id="emoji-solid-orange">
						<feFlood style={{ floodColor: "var(--color-primary)" }} result="flood" />
						<feComposite in="flood" in2="SourceGraphic" operator="in" />
					</filter>
				</defs>
			</svg>
			<div className="stats-header">
				<div className="header-top">
					<div className="sport-badge">
						<div className="sport-name">{data.sport.toUpperCase()}</div>
						{data.subSport && <div className="sport-sub">{formatSubSport(data.subSport)}</div>}
					</div>
					<div className="date-vertical">
						<div className="date-line">{format(data.date, "MMM")}</div>
						<div className="date-line date-day">{format(data.date, "dd")}</div>
						<div className="date-line">{format(data.date, "yyyy")}</div>
					</div>
				</div>
				{isAdvancedMode && (
					<div className="workout-classification">
						<span className="classification-emoji">{classification.emoji}</span>
						<div className="classification-content">
							<div className="classification-type">{classification.type}</div>
							<div className="classification-description">{classification.description}</div>
						</div>
					</div>
				)}
			</div>

			<div className="stats-primary">
				<div className="stat-primary">
					<div className="stat-value-large">{data.distance.toFixed(1)}</div>
					<div className="stat-label-large">KM</div>
				</div>
				<div className="stat-primary">
					<div className="stat-value-large">{formatDuration(data.duration)}</div>
					<div className="stat-label-large">TIME</div>
				</div>
				<div className="stat-primary">
					<div className="stat-value-large">
						{isAdvancedMode ? powerMetrics.normalizedPower : Math.round(data.avgPower)}
					</div>
					<div className="stat-label-large">{isAdvancedMode ? "NP" : "AVG"}</div>
					<div className="stat-unit">watts</div>
				</div>
			</div>

			{isAdvancedMode ? (
				<div className="stats-grid">
					{settings.showPowerRecords && (
						<>
							<div className="stat-item">
								<div className="stat-label">1min Power</div>
								<div className="stat-value">{powerMetrics.bestPower1min}W</div>
							</div>
							<div className="stat-item">
								<div className="stat-label">5min Power</div>
								<div className="stat-value">{powerMetrics.bestPower5min}W</div>
							</div>
							<div className="stat-item">
								<div className="stat-label">20min Power</div>
								<div className="stat-value">{powerMetrics.bestPower20min}W</div>
							</div>
						</>
					)}
					<div className="stat-item">
						<div className="stat-label">VI</div>
						<div className="stat-value">{powerMetrics.variabilityIndex}</div>
					</div>
					<div className="stat-item">
						<div className="stat-label">Work</div>
						<div className="stat-value">{powerMetrics.workKJ} kJ</div>
					</div>
					{settings.functionalThresholdPower > 0 && (
						<>
							<div className="stat-item">
								<div className="stat-label">IF</div>
								<div className="stat-value">{powerMetrics.intensityFactor}</div>
							</div>
							<div className="stat-item">
								<div className="stat-label">TSS</div>
								<div className="stat-value">{powerMetrics.trainingStressScore}</div>
							</div>
						</>
					)}
					{data.avgHeartRate > 0 && (
						<div className="stat-item">
							<div className="stat-label">Avg HR</div>
							<div className="stat-value">{Math.round(data.avgHeartRate)} bpm</div>
						</div>
					)}
				</div>
			) : (
				<div className="stats-grid">
					<div className="stat-item">
						<div className="stat-label">Avg Speed</div>
						<div className="stat-value">{data.avgSpeed.toFixed(1)} km/h</div>
					</div>
					<div className="stat-item">
						<div className="stat-label">Max Power</div>
						<div className="stat-value">{Math.round(data.maxPower)}W</div>
					</div>
					<div className="stat-item">
						<div className="stat-label">Calories</div>
						<div className="stat-value">{Math.round(data.calories)}</div>
					</div>
					{data.avgHeartRate > 0 && (
						<>
							<div className="stat-item">
								<div className="stat-label">Avg HR</div>
								<div className="stat-value">{Math.round(data.avgHeartRate)} bpm</div>
							</div>
							<div className="stat-item">
								<div className="stat-label">Max HR</div>
								<div className="stat-value">{Math.round(data.maxHeartRate)} bpm</div>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	)
}
