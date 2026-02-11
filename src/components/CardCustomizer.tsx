import { useEffect, useMemo, useRef, useState } from "react"
import type { CardSettings, ThemeHarmony, WorkoutData } from "../types/workout"
import { DEFAULT_THEME_MODEL, createThemePalette, getHarmonyShift } from "../utils/themePalette"
import { DualRangeSlider } from "./DualRangeSlider"
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

const HARMONY_OPTIONS = [
	{ value: "analogous", label: "Analogous", detail: "tight family" },
	{ value: "split", label: "Split", detail: "balanced contrast" },
	{ value: "complementary", label: "Complement", detail: "high pop" },
	{ value: "triadic", label: "Triadic", detail: "creative spread" },
] as const satisfies ReadonlyArray<{ value: ThemeHarmony; label: string; detail: string }>

type ComposerNodeId = "background" | "surface" | "primary" | "accent"
type SidebarSection = "general" | "chart" | "theme"

const CLOSE_BEFORE_OPEN_MS = 210
const MAX_ACTIVITY_TITLE_LENGTH = 28

interface ComposerNode {
	id: ComposerNodeId
	label: string
	hue: number
	color: string
	orbit: number
	x: number
	y: number
}

const toOrbitPosition = (hue: number, orbit: number): Pick<ComposerNode, "x" | "y"> => {
	const wrapped = ((hue % 360) + 360) % 360
	const angle = ((wrapped - 90) * Math.PI) / 180

	return {
		x: 50 + Math.cos(angle) * orbit,
		y: 50 + Math.sin(angle) * orbit,
	}
}

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max)

export function CardCustomizer({ settings, onChange, data }: CardCustomizerProps) {
	const activeFieldPointerId = useRef<number | null>(null)
	const sectionTransitionTimer = useRef<number | null>(null)
	const [activeSection, setActiveSection] = useState<SidebarSection | null>("general")

	const hasHeartRate = data.avgHeartRate > 0
	const hasTargetPower = data.records.some((r) => r.targetPower !== undefined && r.targetPower > 0)
	const hasDistance = data.records.some((r) => r.distance !== undefined && r.distance > 0)

	const durationMinutes = Math.ceil(data.duration / 60)
	const trimEnd = settings.trimEndMinutes ?? durationMinutes
	const intervals = settings.xAxisMode === "distance" ? DISTANCE_INTERVALS : TIME_INTERVALS

	const themePalette = useMemo(
		() =>
			createThemePalette({
				themeHue: settings.themeHue,
				themeVibrance: settings.themeVibrance,
				themeDepth: settings.themeDepth,
				themeContrast: settings.themeContrast,
				themeHarmony: settings.themeHarmony,
			}),
		[
			settings.themeHue,
			settings.themeVibrance,
			settings.themeDepth,
			settings.themeContrast,
			settings.themeHarmony,
		],
	)

	const harmonyShift = getHarmonyShift(settings.themeHarmony)

	const composerNodes = useMemo(() => {
		const baseNodes: Array<Omit<ComposerNode, "x" | "y">> = [
			{
				id: "background",
				label: "Background",
				hue: themePalette.backgroundHue,
				color: themePalette.background,
				orbit: 13,
			},
			{
				id: "surface",
				label: "Surface",
				hue: themePalette.surfaceHue,
				color: themePalette.surface,
				orbit: 24,
			},
			{
				id: "primary",
				label: "Primary",
				hue: themePalette.primaryHue,
				color: themePalette.primary,
				orbit: 34,
			},
			{
				id: "accent",
				label: "Accent",
				hue: themePalette.accentHue,
				color: themePalette.accent,
				orbit: 43,
			},
		]

		return baseNodes.map((node) => {
			const position = toOrbitPosition(node.hue, node.orbit)
			return {
				id: node.id,
				label: node.label,
				hue: node.hue,
				color: node.color,
				orbit: node.orbit,
				x: position.x,
				y: position.y,
			}
		})
	}, [
		themePalette.backgroundHue,
		themePalette.background,
		themePalette.surfaceHue,
		themePalette.surface,
		themePalette.primaryHue,
		themePalette.primary,
		themePalette.accentHue,
		themePalette.accent,
	])

	const composerLinks = useMemo(
		() => [
			{ id: "bg-surface", from: composerNodes[0], to: composerNodes[1] },
			{ id: "surface-primary", from: composerNodes[1], to: composerNodes[2] },
			{ id: "primary-accent", from: composerNodes[2], to: composerNodes[3] },
		],
		[composerNodes],
	)

	const fieldCursor = useMemo(
		() => toOrbitPosition(settings.themeHue, 8 + (settings.themeVibrance / 100) * 42),
		[settings.themeHue, settings.themeVibrance],
	)

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

	const applyFieldPointer = (event: React.PointerEvent<HTMLDivElement>) => {
		const bounds = event.currentTarget.getBoundingClientRect()
		const centerX = bounds.left + bounds.width / 2
		const centerY = bounds.top + bounds.height / 2
		const deltaX = event.clientX - centerX
		const deltaY = event.clientY - centerY
		const maxRadius = Math.min(bounds.width, bounds.height) / 2
		const radialDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

		const hue = ((Math.atan2(deltaY, deltaX) * 180) / Math.PI + 90 + 360) % 360
		const vibrance = Math.round((clamp(radialDistance, 0, maxRadius) / maxRadius) * 100)

		onChange({
			...settings,
			themeHue: Math.round(hue),
			themeVibrance: vibrance,
		})
	}

	const handleFieldPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		activeFieldPointerId.current = event.pointerId
		event.currentTarget.setPointerCapture(event.pointerId)
		applyFieldPointer(event)
	}

	const handleFieldPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (activeFieldPointerId.current !== event.pointerId) {
			return
		}
		applyFieldPointer(event)
	}

	const handleFieldPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
		if (activeFieldPointerId.current !== event.pointerId) {
			return
		}
		activeFieldPointerId.current = null
		event.currentTarget.releasePointerCapture(event.pointerId)
	}

	const handleThemeDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...settings, themeDepth: Number(e.target.value) })
	}

	const handleThemeContrastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...settings, themeContrast: Number(e.target.value) })
	}

	const handleGraphLineThicknessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...settings, graphLineThickness: Number(e.target.value) })
	}

	const handleSmoothDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...settings, smoothData: Number(e.target.value) })
	}

	const handleShowXAxisMarkersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...settings, showXAxisMarkers: e.target.checked })
	}

	const handleThemeHarmonyChange = (harmony: ThemeHarmony) => {
		onChange({ ...settings, themeHarmony: harmony })
	}

	const handleThemeReset = () => {
		onChange({
			...settings,
			themeHue: DEFAULT_THEME_MODEL.themeHue,
			themeVibrance: DEFAULT_THEME_MODEL.themeVibrance,
			themeDepth: DEFAULT_THEME_MODEL.themeDepth,
			themeContrast: DEFAULT_THEME_MODEL.themeContrast,
			themeHarmony: DEFAULT_THEME_MODEL.themeHarmony,
			graphLineThickness: 1.2,
			showXAxisMarkers: true,
		})
	}

	const toggleSection = (section: SidebarSection) => {
		if (sectionTransitionTimer.current !== null) {
			window.clearTimeout(sectionTransitionTimer.current)
			sectionTransitionTimer.current = null
		}

		if (section === activeSection) {
			setActiveSection(null)
			return
		}

		setActiveSection(null)
		sectionTransitionTimer.current = window.setTimeout(() => {
			setActiveSection(section)
			sectionTransitionTimer.current = null
		}, CLOSE_BEFORE_OPEN_MS)
	}

	const handleToggleGeneral = () => toggleSection("general")
	const handleToggleChart = () => toggleSection("chart")
	const handleToggleTheme = () => toggleSection("theme")

	const handleSetBasicMode = () => onChange({ ...settings, statsDisplayMode: "basic" })

	const handleSetAdvancedMode = () => onChange({ ...settings, statsDisplayMode: "advanced" })

	const handleFTPChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		onChange({ ...settings, functionalThresholdPower: Number(e.target.value) || 0 })

	const handleShowPowerRecordsChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		onChange({ ...settings, showPowerRecords: e.target.checked })

	const handleShowHeartRateChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		onChange({ ...settings, showHeartRate: e.target.checked })

	const handleShowTargetPowerChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		onChange({ ...settings, showTargetPower: e.target.checked })

	const handleActivityTitleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		onChange({ ...settings, activityTitle: e.target.value.slice(0, MAX_ACTIVITY_TITLE_LENGTH) })

	const handleXAxisTimeMode = () => handleXAxisModeChange("time")

	const handleXAxisDistanceMode = () => handleXAxisModeChange("distance")

	const handleRemoveZeroPowerChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		onChange({ ...settings, removeZeroPower: e.target.checked })

	const handleRemoveZeroHeartRateChange = (e: React.ChangeEvent<HTMLInputElement>) =>
		onChange({ ...settings, removeZeroHeartRate: e.target.checked })

	useEffect(() => {
		return () => {
			if (sectionTransitionTimer.current !== null) {
				window.clearTimeout(sectionTransitionTimer.current)
			}
		}
	}, [])

	return (
		<div className="card-customizer">
			<div className="card-customizer-header">
				<h3>Customize</h3>
				<p>Tune layout, chart processing, and visual theme.</p>
			</div>

			<section className="customizer-section-block" aria-labelledby="customizer-general-title">
				<button
					type="button"
					id="customizer-general-title"
					className={`customizer-section-toggle ${activeSection === "general" ? "active" : ""}`}
					onClick={handleToggleGeneral}
					aria-expanded={activeSection === "general"}
				>
					<span>General</span>
					<small>Configure stats and headline workout metrics.</small>
				</button>
				<div
					className={`customizer-section-panel ${activeSection === "general" ? "is-open" : ""}`}
					aria-hidden={activeSection !== "general"}
				>
					<div className="customizer-group">
						<h5>Stats</h5>
						<div className="customizer-options">
							<div className="customizer-segment">
								<span className="segment-label">Mode</span>
								<div className="segment-buttons">
									<button
										className={settings.statsDisplayMode === "basic" ? "active" : ""}
										onClick={handleSetBasicMode}
									>
										Basic
									</button>
									<button
										className={settings.statsDisplayMode === "advanced" ? "active" : ""}
										onClick={handleSetAdvancedMode}
									>
										Advanced
									</button>
								</div>
							</div>
							<div className="customizer-segment">
								<span className="segment-label">FTP</span>
								<input
									type="number"
									min={0}
									step={1}
									placeholder="0"
									value={settings.functionalThresholdPower || ""}
									onChange={handleFTPChange}
									className="customizer-input"
								/>
								<span className="segment-unit">W</span>
							</div>
							{settings.statsDisplayMode === "advanced" ? (
								<label className="customizer-toggle">
									<input
										type="checkbox"
										checked={settings.showPowerRecords}
										onChange={handleShowPowerRecordsChange}
									/>
									<span className="toggle-track">
										<span className="toggle-thumb" />
									</span>
									<span className="toggle-label">Show Power Records</span>
								</label>
							) : null}
						</div>
					</div>

					<div className="customizer-group">
						<h5>Activity</h5>
						<div className="customizer-group-body">
							<label className="customizer-text-field">
								<span className="segment-label">Title</span>
								<input
									type="text"
									className="customizer-text-input"
									value={settings.activityTitle}
									onChange={handleActivityTitleChange}
									maxLength={MAX_ACTIVITY_TITLE_LENGTH}
									placeholder={data.sport}
								/>
							</label>
						</div>
					</div>
				</div>
			</section>

			<section className="customizer-section-block" aria-labelledby="customizer-chart-title">
				<button
					type="button"
					id="customizer-chart-title"
					className={`customizer-section-toggle ${activeSection === "chart" ? "active" : ""}`}
					onClick={handleToggleChart}
					aria-expanded={activeSection === "chart"}
				>
					<span>Chart</span>
					<small>Tune data processing and chart axes for cleaner storytelling.</small>
				</button>
				<div
					className={`customizer-section-panel ${activeSection === "chart" ? "is-open" : ""}`}
					aria-hidden={activeSection !== "chart"}
				>
					<div className="customizer-group">
						<h5>Display</h5>
						<div className="customizer-options">
							{hasHeartRate && (
								<label className="customizer-toggle">
									<input
										type="checkbox"
										checked={settings.showHeartRate}
										onChange={handleShowHeartRateChange}
									/>
									<span className="toggle-track">
										<span className="toggle-thumb" />
									</span>
									<span className="toggle-label">Heart Rate Line</span>
								</label>
							)}
							{hasTargetPower && (
								<label className="customizer-toggle">
									<input
										type="checkbox"
										checked={settings.showTargetPower}
										onChange={handleShowTargetPowerChange}
									/>
									<span className="toggle-track">
										<span className="toggle-thumb" />
									</span>
									<span className="toggle-label">Target Power</span>
								</label>
							)}
						</div>
					</div>

					<div className="customizer-group">
						<h5>Axis</h5>
						<div className="customizer-options">
							{hasDistance && (
								<div className="customizer-segment">
									<span className="segment-label">X-Axis</span>
									<div className="segment-buttons">
										<button
											className={settings.xAxisMode === "time" ? "active" : ""}
											onClick={handleXAxisTimeMode}
										>
											Time
										</button>
										<button
											className={settings.xAxisMode === "distance" ? "active" : ""}
											onClick={handleXAxisDistanceMode}
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
					</div>

					<div className="customizer-group">
						<h5>Style</h5>
						<div className="customizer-group-body">
							<label className="theme-slider-row">
								<span>Graph Lines</span>
								<input
									type="range"
									min={0.6}
									max={3}
									step={0.1}
									value={settings.graphLineThickness}
									onChange={handleGraphLineThicknessChange}
									className="theme-range"
								/>
								<span>{settings.graphLineThickness.toFixed(1)}x</span>
							</label>
							<label className="customizer-toggle">
								<input
									type="checkbox"
									checked={settings.showXAxisMarkers}
									onChange={handleShowXAxisMarkersChange}
								/>
								<span className="toggle-track">
									<span className="toggle-thumb" />
								</span>
								<span className="toggle-label">Show X-Axis Markers</span>
							</label>
						</div>
					</div>

					<div className="customizer-group">
						<h5>Data Cleanup</h5>
						<div className="customizer-group-body">
							<label className="theme-slider-row">
								<span>Smooth Data</span>
								<input
									type="range"
									min={0}
									max={100}
									step={1}
									value={settings.smoothData}
									onChange={handleSmoothDataChange}
									className="theme-range"
								/>
								<span>{settings.smoothData === 0 ? "off" : `${settings.smoothData}%`}</span>
							</label>
							<div className="customizer-options">
								<label className="customizer-toggle">
									<input
										type="checkbox"
										checked={settings.removeZeroPower}
										onChange={handleRemoveZeroPowerChange}
									/>
									<span className="toggle-track">
										<span className="toggle-thumb" />
									</span>
									<span className="toggle-label">Remove Zero Power</span>
								</label>
								{hasHeartRate && (
									<label className="customizer-toggle">
										<input
											type="checkbox"
											checked={settings.removeZeroHeartRate}
											onChange={handleRemoveZeroHeartRateChange}
										/>
										<span className="toggle-track">
											<span className="toggle-thumb" />
										</span>
										<span className="toggle-label">Remove Zero Heart Rate</span>
									</label>
								)}
							</div>
						</div>
					</div>

					<div className="customizer-group">
						<h5>Trim Workout</h5>
						<div className="customizer-group-body">
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
				</div>
			</section>

			<section className="customizer-section-block" aria-labelledby="customizer-theme-title">
				<button
					type="button"
					id="customizer-theme-title"
					className={`customizer-section-toggle ${activeSection === "theme" ? "active" : ""}`}
					onClick={handleToggleTheme}
					aria-expanded={activeSection === "theme"}
				>
					<span>Theme Lab</span>
					<small>Color and contrast are scoped to the workout canvas only.</small>
				</button>
				<div
					className={`customizer-section-panel ${activeSection === "theme" ? "is-open" : ""}`}
					aria-hidden={activeSection !== "theme"}
				>
					<div className="customizer-group">
						<h5>Palette</h5>
						<div className="customizer-group-body">
							<div className="theme-lab">
								<div className="theme-spectrum-shell">
									<div className="theme-spectrum-head">
										<span>Harmony Field</span>
										<span>
											{Math.round(settings.themeHue)}deg / V{settings.themeVibrance}
										</span>
									</div>
									<div
										className="theme-harmony-field"
										onPointerDown={handleFieldPointerDown}
										onPointerMove={handleFieldPointerMove}
										onPointerUp={handleFieldPointerEnd}
										onPointerCancel={handleFieldPointerEnd}
									>
										<svg viewBox="0 0 100 100" className="theme-harmony-links" aria-hidden="true">
											{composerLinks.map((link) => (
												<line
													key={link.id}
													x1={link.from.x}
													y1={link.from.y}
													x2={link.to.x}
													y2={link.to.y}
												/>
											))}
										</svg>
										<div
											className="harmony-cursor"
											style={{ left: `${fieldCursor.x}%`, top: `${fieldCursor.y}%` }}
										/>
										{composerNodes.map((node) => (
											<div
												key={node.id}
												className="harmony-node"
												style={{ left: `${node.x}%`, top: `${node.y}%` }}
											>
												<i className="harmony-node-dot" style={{ backgroundColor: node.color }} />
												<span>{node.label}</span>
											</div>
										))}
									</div>
									<p className="theme-harmony-note">
										Drag in the field to set hue and vibrance. Accent sits {harmonyShift}deg from
										primary with {settings.themeHarmony} harmony. Use Background to control how dark
										the base gets.
									</p>
								</div>

								<div className="theme-controls">
									<div className="harmony-grid">
										{HARMONY_OPTIONS.map((option) => (
											<button
												key={option.value}
												type="button"
												className={settings.themeHarmony === option.value ? "active" : ""}
												onClick={() => {
													handleThemeHarmonyChange(option.value)
												}}
											>
												<span>{option.label}</span>
												<small>{option.detail}</small>
											</button>
										))}
									</div>

									<div className="theme-slider-grid">
										<label className="theme-slider-row">
											<span>Background</span>
											<input
												type="range"
												min={0}
												max={100}
												step={1}
												value={settings.themeDepth}
												onChange={handleThemeDepthChange}
												className="theme-range"
											/>
											<span>{settings.themeDepth}</span>
										</label>
										<label className="theme-slider-row">
											<span>Contrast</span>
											<input
												type="range"
												min={0}
												max={100}
												step={1}
												value={settings.themeContrast}
												onChange={handleThemeContrastChange}
												className="theme-range"
											/>
											<span>{settings.themeContrast}</span>
										</label>
									</div>

									<button type="button" className="theme-reset-button" onClick={handleThemeReset}>
										Back to default
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}
