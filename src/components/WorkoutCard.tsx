import { forwardRef } from "react"
import type { CardSettings, WorkoutData } from "../types/workout"
import { PowerChart } from "./PowerChart"
import { StatsPanel } from "./StatsPanel"
import "./WorkoutCard.css"

interface WorkoutCardProps {
	data: WorkoutData
	settings: CardSettings
}

export const WorkoutCard = forwardRef<HTMLDivElement, WorkoutCardProps>(
	({ data, settings }, ref) => {
		return (
			<div ref={ref} className="workout-card">
				<div className="workout-card-header">
					<h1>Humblebrag</h1>
				</div>

				<StatsPanel data={data} settings={settings} />
				<PowerChart records={data.records} settings={settings} />

				<div className="workout-card-footer">
					<p>Made with Humblebrag</p>
				</div>
			</div>
		)
	},
)

WorkoutCard.displayName = "WorkoutCard"
