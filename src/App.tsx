import { format } from "date-fns"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import "./App.css"
import { ExportButton } from "./components/ExportButton"
import { FileUpload } from "./components/FileUpload"
import { ThemeLabWidget } from "./components/ThemeLabWidget"
import { WorkoutCard } from "./components/WorkoutCard"
import { useFitParser } from "./hooks/useFitParser"
import type { CardSettings } from "./types/workout"
import { downloadImage, exportAsImage } from "./utils/imageExport"
import {
	applyCleanupAdjustments,
	downloadAdjustedWorkoutCsv,
	hasConfiguredDataCleanup,
} from "./utils/workoutDataExport"
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
	smoothData: 0,
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
	graphLineThickness: 1.2,
	showXAxisMarkers: true,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value)

const blobToDataUrl = async (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.addEventListener("load", () => {
			if (typeof reader.result === "string") {
				resolve(reader.result)
				return
			}
			reject(new Error("Failed to read exported image preview"))
		})
		reader.addEventListener("error", () => {
			reject(reader.error ?? new Error("Failed to read exported image preview"))
		})
		reader.readAsDataURL(blob)
	})

type ThemeCanvasStyle = CSSProperties & Record<`--${string}`, string>

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
					typeof parsed.smoothData === "boolean"
						? parsed.smoothData
							? 55
							: 0
						: isFiniteNumber(parsed.smoothData)
							? Math.min(100, Math.max(0, parsed.smoothData))
							: defaultSettings.smoothData,
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
				graphLineThickness: isFiniteNumber(parsed.graphLineThickness)
					? parsed.graphLineThickness
					: defaultSettings.graphLineThickness,
				showXAxisMarkers:
					typeof parsed.showXAxisMarkers === "boolean"
						? parsed.showXAxisMarkers
						: defaultSettings.showXAxisMarkers,
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
			graphLineThickness: settings.graphLineThickness,
			showXAxisMarkers: settings.showXAxisMarkers,
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
	} catch (error) {
		console.error("Failed to save settings to localStorage:", error)
	}
}

function App() {
	const supportsPopoverApi = "showPopover" in HTMLElement.prototype
	const [file, setFile] = useState<File | null>(null)
	const [settings, setSettings] = useState<CardSettings>(loadSettings)
	const { data, loading, error } = useFitParser(file)
	const cardRef = useRef<HTMLDivElement>(null)
	const exportPopoverRef = useRef<HTMLDivElement>(null)
	const [isExportPopoverVisible, setIsExportPopoverVisible] = useState(false)
	const [isExporting, setIsExporting] = useState(false)
	const [exportedImageBlob, setExportedImageBlob] = useState<Blob | null>(null)
	const [exportedImageUrl, setExportedImageUrl] = useState<string | null>(null)
	const [exportFilename, setExportFilename] = useState("")
	const [exportError, setExportError] = useState<string | null>(null)
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

	const canvasThemeStyle = useMemo<ThemeCanvasStyle>(
		() => ({
			"--color-primary": themePalette.primary,
			"--color-accent": themePalette.accent,
			"--color-background": themePalette.background,
			"--color-surface": themePalette.surface,
			"--color-surface-hover": themePalette.surfaceHover,
			"--color-border": themePalette.border,
			"--color-text": themePalette.text,
		}),
		[
			themePalette.primary,
			themePalette.accent,
			themePalette.background,
			themePalette.surface,
			themePalette.surfaceHover,
			themePalette.border,
			themePalette.text,
		],
	)

	const cleanupAdjustmentResult = useMemo(() => {
		if (!data) {
			return null
		}

		return applyCleanupAdjustments(data.records, settings, data.sport)
	}, [
		data,
		settings.removeZeroPower,
		settings.removeZeroHeartRate,
		settings.trimStartMinutes,
		settings.trimEndMinutes,
	])

	const shouldShowAdjustedDataDownload = hasConfiguredDataCleanup(settings)

	// Save settings to localStorage whenever they change
	useEffect(() => {
		saveSettings(settings)
	}, [settings])

	const handleExport = async () => {
		if (!cardRef.current || !data || isExporting) {
			return
		}

		setIsExportPopoverVisible(true)
		setIsExporting(true)
		setExportError(null)

		setExportedImageUrl(null)
		setExportedImageBlob(null)

		const filename = `workout-${format(data.date, "yyyy-MM-dd-HHmm")}.png`
		setExportFilename(filename)

		try {
			const imageBlob = await exportAsImage(cardRef.current)
			const imageDataUrl = await blobToDataUrl(imageBlob)
			setExportedImageUrl(imageDataUrl)
			setExportedImageBlob(imageBlob)
		} catch (error) {
			console.error("Export failed:", error)
			setExportError("Failed to export image. Please try again.")
		} finally {
			setIsExporting(false)
		}
	}

	const clearExportPreviewState = () => {
		setExportedImageUrl(null)
		setExportedImageBlob(null)
		setExportFilename("")
		setExportError(null)
	}

	const closeExportPreview = () => {
		const popover = exportPopoverRef.current
		if (
			supportsPopoverApi &&
			popover &&
			"hidePopover" in popover &&
			popover.matches(":popover-open")
		) {
			popover.hidePopover()
		}
		setIsExportPopoverVisible(false)
		setIsExporting(false)
		clearExportPreviewState()
	}

	const handleExportDownload = () => {
		if (!exportedImageBlob || !exportFilename) {
			return
		}
		downloadImage(exportedImageBlob, exportFilename)
	}

	const handleReset = () => {
		closeExportPreview()
		setFile(null)
	}

	const handleAdjustedDataDownload = () => {
		if (!file || !cleanupAdjustmentResult) {
			return
		}

		if (!cleanupAdjustmentResult.changed) {
			alert("No records changed with the current trim/remove-zero settings.")
			return
		}

		const confirmed = window.confirm(
			`This will download only the adjusted workout data (${cleanupAdjustmentResult.removedCount} records removed). The original FIT file stays unchanged. Continue?`,
		)

		if (!confirmed) {
			return
		}

		const baseName = file.name.toLowerCase().endsWith(".fit")
			? file.name.slice(0, -4)
			: file.name
		downloadAdjustedWorkoutCsv(cleanupAdjustmentResult.records, `${baseName}-adjusted.csv`)
	}

	useEffect(() => {
		const popover = exportPopoverRef.current
		if (!supportsPopoverApi || !popover || !("showPopover" in popover)) {
			return
		}

		if (isExportPopoverVisible) {
			if (!popover.matches(":popover-open")) {
				popover.showPopover()
			}
			return
		}

		if (popover.matches(":popover-open")) {
			popover.hidePopover()
		}
	}, [isExportPopoverVisible, supportsPopoverApi])

	if (!data) {
		return (
			<div className="app">
				<header className="app-header app-header-empty">
					<div className="app-logo">humblebrag</div>
				</header>
				<FileUpload onFileSelect={setFile} loading={loading} error={error} />
			</div>
		)
	}

	return (
		<div className="app">
			<header className="app-header">
				<div className="app-logo">humblebrag</div>
				<div className="app-header-actions">
					{shouldShowAdjustedDataDownload ? (
						<button className="reset-button data-download-button" onClick={handleAdjustedDataDownload}>
							Download Updated Data
						</button>
					) : null}
					<ExportButton
						className="app-header-button"
						onClick={handleExport}
						disabled={isExporting}
					/>
					<button className="reset-button app-header-button" onClick={handleReset}>
						Upload New File
					</button>
				</div>
			</header>

			<div className="app-workspace">
				<aside className="app-sidebar" aria-label="Customization sidebar">
					<ThemeLabWidget settings={settings} onChange={setSettings} data={data} />
				</aside>

				<main className="app-canvas-area">
					<div className="app-canvas-panel">
						<WorkoutCard
							ref={cardRef}
							data={data}
							settings={settings}
							themeStyle={canvasThemeStyle}
						/>
					</div>
				</main>
			</div>

			{isExportPopoverVisible ? (
				<div
					ref={exportPopoverRef}
					className="export-popover"
					popover="auto"
					onToggle={(event) => {
						if (!supportsPopoverApi || !isExportPopoverVisible) {
							return
						}
						const popover = event.currentTarget
						if (!popover.matches(":popover-open")) {
							setIsExportPopoverVisible(false)
							setIsExporting(false)
							clearExportPreviewState()
						}
					}}
				>
					<button className="export-popover-close" onClick={closeExportPreview}>
						Close
					</button>
					<p className="export-popover-title">Radddd! Nice work.</p>
					{isExporting ? (
						<div className="export-popover-loading" aria-live="polite">
							<div className="export-popover-spinner" aria-hidden="true"></div>
							<p className="export-popover-status">Rendering export image...</p>
						</div>
					) : exportedImageUrl ? (
						<>
							<div className="export-polaroid">
								<img className="export-popover-image" src={exportedImageUrl} alt="Exported workout card" />
								<p className="export-polaroid-caption">humblebrag</p>
							</div>
							<button className="export-popover-download" onClick={handleExportDownload}>
								Download Image
							</button>
						</>
					) : exportError ? (
						<p className="export-popover-error">{exportError}</p>
					) : null}
				</div>
			) : null}
		</div>
	)
}

export default App
