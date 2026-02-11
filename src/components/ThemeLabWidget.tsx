import type { CardSettings, WorkoutData } from "../types/workout"
import { CardCustomizer } from "./CardCustomizer"
import "./ThemeLabWidget.css"

interface ThemeLabWidgetProps {
	settings: CardSettings
	onChange: (settings: CardSettings) => void
	data: WorkoutData
}

export function ThemeLabWidget({ settings, onChange, data }: ThemeLabWidgetProps) {
	return (
		<div className="theme-lab-sidebar">
			<div className="theme-lab-sidebar-content">
				<CardCustomizer settings={settings} onChange={onChange} data={data} />
			</div>
		</div>
	)
}
