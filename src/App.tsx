import { format } from "date-fns"
import { useEffect, useRef, useState } from "react"
import "./App.css"
import { CardCustomizer } from "./components/CardCustomizer"
import { ExportButton } from "./components/ExportButton"
import { FileUpload } from "./components/FileUpload"
import { WorkoutCard } from "./components/WorkoutCard"
import { useFitParser } from "./hooks/useFitParser"
import type { CardSettings } from "./types/workout"
import { exportAsImage } from "./utils/imageExport"

const STORAGE_KEY = "humblebrag-settings"

const defaultSettings: CardSettings = {
	showHeartRate: true,
	showTargetPower: true,
	smoothData: false,
	removeZeroPower: false,
	removeZeroHeartRate: false,
	xAxisMode: "time",
	xAxisInterval: null,
	trimStartMinutes: 0,
	trimEndMinutes: null,
}

function loadSettings(): CardSettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored) {
			const parsed = JSON.parse(stored)
			// Merge with defaults to ensure all fields exist, excluding trim values
			return {
				...defaultSettings,
				showHeartRate: parsed.showHeartRate ?? defaultSettings.showHeartRate,
				showTargetPower: parsed.showTargetPower ?? defaultSettings.showTargetPower,
				smoothData: parsed.smoothData ?? defaultSettings.smoothData,
				removeZeroPower: parsed.removeZeroPower ?? defaultSettings.removeZeroPower,
				removeZeroHeartRate: parsed.removeZeroHeartRate ?? defaultSettings.removeZeroHeartRate,
				xAxisMode: parsed.xAxisMode ?? defaultSettings.xAxisMode,
				xAxisInterval: parsed.xAxisInterval ?? defaultSettings.xAxisInterval,
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
			xAxisMode: settings.xAxisMode,
			xAxisInterval: settings.xAxisInterval,
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

	// Save settings to localStorage whenever they change
	useEffect(() => {
		saveSettings(settings)
	}, [settings])

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

			<CardCustomizer settings={settings} onChange={setSettings} data={data} />

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
