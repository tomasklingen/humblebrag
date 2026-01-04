import { format } from "date-fns"
import type { WorkoutData } from "../types/workout"
import "./StatsPanel.css"

interface StatsPanelProps {
	data: WorkoutData
}

export function StatsPanel({ data }: StatsPanelProps) {
	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600)
		const minutes = Math.floor((seconds % 3600) / 60)
		const secs = Math.floor(seconds % 60)

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
		}
		return `${minutes}:${secs.toString().padStart(2, "0")}`
	}

	return (
		<div className="stats-panel">
			<div className="stats-header">
				<h2>{data.sport.charAt(0).toUpperCase() + data.sport.slice(1)} Workout</h2>
				<p className="workout-date">{format(data.date, "MMM d, yyyy • h:mm a")}</p>
				{data.subSport && <p className="workout-type">{data.subSport}</p>}
			</div>

			<div className="stats-grid">
				<div className="stat-item">
					<div className="stat-value">{data.distance.toFixed(1)}</div>
					<div className="stat-label">km</div>
				</div>

				<div className="stat-item">
					<div className="stat-value">{formatDuration(data.duration)}</div>
					<div className="stat-label">Time</div>
				</div>

				<div className="stat-item">
					<div className="stat-value">{Math.round(data.avgPower)}</div>
					<div className="stat-label">Avg Power (W)</div>
				</div>

				<div className="stat-item">
					<div className="stat-value">{data.avgSpeed.toFixed(1)}</div>
					<div className="stat-label">Avg Speed (km/h)</div>
				</div>

				<div className="stat-item">
					<div className="stat-value">{Math.round(data.calories)}</div>
					<div className="stat-label">Calories</div>
				</div>

				{data.avgHeartRate > 0 && (
					<div className="stat-item">
						<div className="stat-value">{Math.round(data.avgHeartRate)}</div>
						<div className="stat-label">Avg HR (bpm)</div>
					</div>
				)}
			</div>
		</div>
	)
}
