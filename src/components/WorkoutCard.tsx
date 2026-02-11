import { forwardRef } from "react"
import type { CSSProperties } from "react"
import type { CardSettings, WorkoutData } from "../types/workout"
import { PowerChart } from "./PowerChart"
import { StatsPanel } from "./StatsPanel"
import "./WorkoutCard.css"

interface WorkoutCardProps {
	data: WorkoutData
	settings: CardSettings
	themeStyle?: CSSProperties
}

export const WorkoutCard = forwardRef<HTMLDivElement, WorkoutCardProps>(
	({ data, settings, themeStyle }, ref) => {
		return (
			<div ref={ref} className="workout-card" style={themeStyle}>
				<div className="workout-card-header">
					<span className="header-brand">HUMBLEBRAG</span>
				</div>

				<StatsPanel data={data} settings={settings} />
				<PowerChart records={data.records} settings={settings} />

				<div className="workout-card-footer">
					<span className="footer-text">HUMBLEBRAG</span>
				</div>
			</div>
		)
	},
)

WorkoutCard.displayName = "WorkoutCard"
