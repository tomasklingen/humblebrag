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
					<span className="header-brand">HUMBLEBRAG</span>
				</div>

				<StatsPanel data={data} settings={settings} />
				<PowerChart records={data.records} settings={settings} />

				<div className="workout-card-footer">
					<span className="footer-text">HUMBLEBRAG</span>
					<span className="footer-dot" />
					<span className="footer-text footer-text-muted">EST. 2026</span>
				</div>
			</div>
		)
	},
)

WorkoutCard.displayName = "WorkoutCard"
