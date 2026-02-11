import { format } from "date-fns"
import { useEffect, useMemo, useRef, useState } from "react"
import "./App.css"
import { ExportButton } from "./components/ExportButton"
import { FileUpload } from "./components/FileUpload"
import { ThemeLabWidget } from "./components/ThemeLabWidget"
import { WorkoutCard } from "./components/WorkoutCard"
import { useFitParser } from "./hooks/useFitParser"
import type { CardSettings } from "./types/workout"
import { exportAsImage } from "./utils/imageExport"
import {
	DEFAULT_THEME_MODEL,
	createThemePalette,
	isThemeHarmony,
	normalizeThemeModel,
} from "./utils/themePalette"

const STORAGE_KEY = "humblebrag-settings"

const defaultSettings: CardSettings = {
	showHeartRate: true,
	showTargetPower: true,
	smoothData: false,
	removeZeroPower: false,
	removeZeroHeartRate: false,
	...DEFAULT_THEME_MODEL,
	xAxisMode: "time",
	xAxisInterval: null,
	trimStartMinutes: 0,
	trimEndMinutes: null,
	statsDisplayMode: "advanced",
	showPowerRecords: true,
	functionalThresholdPower: 0,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value)

function loadSettings(): CardSettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) {
			const parsed = JSON.parse(stored) as unknown
			if (!isRecord(parsed)) {
				return defaultSettings
			}

			const themeModel = normalizeThemeModel({
				themeHue: isFiniteNumber(parsed.themeHue) ? parsed.themeHue : undefined,
				themeVibrance: isFiniteNumber(parsed.themeVibrance) ? parsed.themeVibrance : undefined,
				themeDepth: isFiniteNumber(parsed.themeDepth) ? parsed.themeDepth : undefined,
				themeContrast: isFiniteNumber(parsed.themeContrast) ? parsed.themeContrast : undefined,
				themeHarmony: isThemeHarmony(parsed.themeHarmony) ? parsed.themeHarmony : undefined,
			})

			// Merge with defaults to ensure all fields exist, excluding trim values
			return {
				...defaultSettings,
				showHeartRate:
					typeof parsed.showHeartRate === "boolean"
						? parsed.showHeartRate
						: defaultSettings.showHeartRate,
				showTargetPower:
					typeof parsed.showTargetPower === "boolean"
						? parsed.showTargetPower
						: defaultSettings.showTargetPower,
				smoothData:
					typeof parsed.smoothData === "boolean" ? parsed.smoothData : defaultSettings.smoothData,
				removeZeroPower:
					typeof parsed.removeZeroPower === "boolean"
						? parsed.removeZeroPower
						: defaultSettings.removeZeroPower,
				removeZeroHeartRate:
					typeof parsed.removeZeroHeartRate === "boolean"
						? parsed.removeZeroHeartRate
						: defaultSettings.removeZeroHeartRate,
				...themeModel,
				xAxisMode:
					parsed.xAxisMode === "distance" || parsed.xAxisMode === "time"
						? parsed.xAxisMode
						: defaultSettings.xAxisMode,
				xAxisInterval:
					parsed.xAxisInterval === null || isFiniteNumber(parsed.xAxisInterval)
						? parsed.xAxisInterval
						: defaultSettings.xAxisInterval,
				statsDisplayMode:
					parsed.statsDisplayMode === "basic" || parsed.statsDisplayMode === "advanced"
						? parsed.statsDisplayMode
						: defaultSettings.statsDisplayMode,
				showPowerRecords:
					typeof parsed.showPowerRecords === "boolean"
						? parsed.showPowerRecords
						: defaultSettings.showPowerRecords,
				functionalThresholdPower: isFiniteNumber(parsed.functionalThresholdPower)
					? parsed.functionalThresholdPower
					: defaultSettings.functionalThresholdPower,
			}
		}
	} catch (error) {
		console.error("Failed to load settings from localStorage:", error)
	}
	return defaultSettings
}

function saveSettings(settings: CardSettings): void {
	try {
		// Save all settings except trim values
		const toSave = {
			showHeartRate: settings.showHeartRate,
			showTargetPower: settings.showTargetPower,
			smoothData: settings.smoothData,
			removeZeroPower: settings.removeZeroPower,
			removeZeroHeartRate: settings.removeZeroHeartRate,
			themeHue: settings.themeHue,
			themeVibrance: settings.themeVibrance,
			themeDepth: settings.themeDepth,
			themeContrast: settings.themeContrast,
			themeHarmony: settings.themeHarmony,
			xAxisMode: settings.xAxisMode,
			xAxisInterval: settings.xAxisInterval,
			statsDisplayMode: settings.statsDisplayMode,
			showPowerRecords: settings.showPowerRecords,
			functionalThresholdPower: settings.functionalThresholdPower,
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
	} catch (error) {
		console.error("Failed to save settings to localStorage:", error)
	}
}

function App() {
	const [file, setFile] = useState<File | null>(null)
	const [settings, setSettings] = useState<CardSettings>(loadSettings)
	const { data, loading, error } = useFitParser(file)
	const cardRef = useRef<HTMLDivElement>(null)
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

	// Save settings to localStorage whenever they change
	useEffect(() => {
		saveSettings(settings)
	}, [settings])

	useEffect(() => {
		const root = document.documentElement
		root.style.setProperty("--color-primary", themePalette.primary)
		root.style.setProperty("--color-accent", themePalette.accent)
		root.style.setProperty("--color-background", themePalette.background)
		root.style.setProperty("--color-surface", themePalette.surface)
		root.style.setProperty("--color-surface-hover", themePalette.surfaceHover)
		root.style.setProperty("--color-border", themePalette.border)
		root.style.setProperty("--color-text", themePalette.text)
	}, [
		themePalette.primary,
		themePalette.accent,
		themePalette.background,
		themePalette.surface,
		themePalette.surfaceHover,
		themePalette.border,
		themePalette.text,
	])

	const handleExport = async () => {
		if (cardRef.current && data) {
			const filename = `workout-${format(data.date, "yyyy-MM-dd-HHmm")}.png`
			await exportAsImage(cardRef.current, filename)
		}
	}

	const handleReset = () => {
		setFile(null)
	}

	if (!data) {
		return (
			<div className="app">
				<FileUpload onFileSelect={setFile} loading={loading} error={error} />
			</div>
		)
	}

	return (
		<div className="app">
			<WorkoutCard ref={cardRef} data={data} settings={settings} />

			<ThemeLabWidget settings={settings} onChange={setSettings} data={data} />

			<div className="app-actions">
				<ExportButton onClick={handleExport} />
				<button className="reset-button" onClick={handleReset}>
					Upload New File
				</button>
			</div>
		</div>
	)
}

export default App
