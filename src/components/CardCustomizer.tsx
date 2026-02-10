import { DualRangeSlider } from "./DualRangeSlider"
import type { CardSettings, WorkoutData } from "../types/workout"
import "./CardCustomizer.css"

interface CardCustomizerProps {
	settings: CardSettings
	onChange: (settings: CardSettings) => void
	data: WorkoutData
}

const TIME_INTERVALS = [
	{ label: "Auto", value: null },
	{ label: "5 min", value: 5 },
	{ label: "10 min", value: 10 },
	{ label: "15 min", value: 15 },
	{ label: "30 min", value: 30 },
	{ label: "60 min", value: 60 },
] as const

const DISTANCE_INTERVALS = [
	{ label: "Auto", value: null },
	{ label: "1 km", value: 1 },
	{ label: "2 km", value: 2 },
	{ label: "5 km", value: 5 },
	{ label: "10 km", value: 10 },
	{ label: "20 km", value: 20 },
] as const

export function CardCustomizer({ settings, onChange, data }: CardCustomizerProps) {
	const hasHeartRate = data.avgHeartRate > 0
	const hasTargetPower = data.records.some((r) => r.targetPower !== undefined && r.targetPower > 0)
	const hasDistance = data.records.some((r) => r.distance !== undefined && r.distance > 0)

	const durationMinutes = Math.ceil(data.duration / 60)
	const trimEnd = settings.trimEndMinutes ?? durationMinutes

	const intervals = settings.xAxisMode === "distance" ? DISTANCE_INTERVALS : TIME_INTERVALS

	const handleXAxisModeChange = (mode: "time" | "distance") => {
		onChange({ ...settings, xAxisMode: mode, xAxisInterval: null })
	}

	const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const val = e.target.value === "" ? null : Number(e.target.value)
		onChange({ ...settings, xAxisInterval: val })
	}

	const handleTrimChange = (start: number, end: number) => {
		onChange({
			...settings,
			trimStartMinutes: start,
			trimEndMinutes: end >= durationMinutes ? null : end,
		})
	}

	const handleTrimStartInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.target.value)
		if (!Number.isNaN(val) && val >= 0 && val < trimEnd) {
			onChange({ ...settings, trimStartMinutes: val })
		}
	}

	const handleTrimEndInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.target.value)
		if (!Number.isNaN(val) && val > settings.trimStartMinutes && val <= durationMinutes) {
			onChange({
				...settings,
				trimEndMinutes: val >= durationMinutes ? null : val,
			})
		}
	}

	return (
		<div className="card-customizer">
			<h3>Customize Card</h3>
			<div className="customizer-options">
				{hasHeartRate && (
					<label className="customizer-toggle">
						<input
							type="checkbox"
							checked={settings.showHeartRate}
							onChange={(e) => onChange({ ...settings, showHeartRate: e.target.checked })}
						/>
						<span className="toggle-track">
							<span className="toggle-thumb" />
						</span>
						<span className="toggle-label">Heart Rate</span>
					</label>
				)}
				{hasTargetPower && (
					<label className="customizer-toggle">
						<input
							type="checkbox"
							checked={settings.showTargetPower}
							onChange={(e) => onChange({ ...settings, showTargetPower: e.target.checked })}
						/>
						<span className="toggle-track">
							<span className="toggle-thumb" />
						</span>
						<span className="toggle-label">Target Power</span>
					</label>
				)}
				{hasDistance && (
					<div className="customizer-segment">
						<span className="segment-label">X-Axis</span>
						<div className="segment-buttons">
							<button
								className={settings.xAxisMode === "time" ? "active" : ""}
								onClick={() => handleXAxisModeChange("time")}
							>
								Time
							</button>
							<button
								className={settings.xAxisMode === "distance" ? "active" : ""}
								onClick={() => handleXAxisModeChange("distance")}
							>
								Distance
							</button>
						</div>
					</div>
				)}
				<div className="customizer-segment">
					<span className="segment-label">Interval</span>
					<select
						className="customizer-select"
						value={settings.xAxisInterval ?? ""}
						onChange={handleIntervalChange}
					>
						{intervals.map((opt) => (
							<option key={opt.label} value={opt.value ?? ""}>
								{opt.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="customizer-trim">
				<h4>Trim Workout</h4>
				<DualRangeSlider
					min={0}
					max={durationMinutes}
					step={0.5}
					valueStart={settings.trimStartMinutes}
					valueEnd={trimEnd}
					onChange={handleTrimChange}
				/>
				<div className="trim-inputs">
					<label className="trim-field">
						<span>Start</span>
						<input
							type="number"
							min={0}
							max={trimEnd - 0.5}
							step={0.5}
							value={settings.trimStartMinutes}
							onChange={handleTrimStartInput}
						/>
						<span className="trim-unit">min</span>
					</label>
					<label className="trim-field">
						<span>End</span>
						<input
							type="number"
							min={settings.trimStartMinutes + 0.5}
							max={durationMinutes}
							step={0.5}
							value={trimEnd}
							onChange={handleTrimEndInput}
						/>
						<span className="trim-unit">min</span>
					</label>
				</div>
			</div>
		</div>
	)
}
