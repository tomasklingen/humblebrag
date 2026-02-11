import { useMemo } from "react"
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import type { CardSettings, WorkoutRecord } from "../types/workout"
import { removeSpikes, removeZeroPower, removeZeroHeartRate } from "../utils/dataCleanup"
import "./PowerChart.css"

interface PowerChartProps {
	records: WorkoutRecord[]
	settings: CardSettings
	sport: string
}

function computeTicks(min: number, max: number, interval: number): number[] {
	const ticks: number[] = []
	const start = Math.ceil(min / interval) * interval
	for (let v = start; v <= max; v += interval) {
		ticks.push(Number(v.toFixed(2)))
	}
	return ticks
}

const speedToPace = (speedKmh: number | undefined): number | undefined => {
	if (!speedKmh || speedKmh <= 0) {
		return undefined
	}

	return 60 / speedKmh
}

export function PowerChart({ records, settings, sport }: PowerChartProps) {
	const isRunning = sport.toLowerCase().includes("running")
	const useDistance = settings.xAxisMode === "distance"

	// Apply trim filter first
	const trimmedRecords = useMemo(() => {
		const trimEnd = settings.trimEndMinutes ?? Infinity
		return records.filter(
			(r) => r.elapsedMinutes >= settings.trimStartMinutes && r.elapsedMinutes <= trimEnd,
		)
	}, [records, settings.trimStartMinutes, settings.trimEndMinutes])

	const cleanedRecords = useMemo(() => {
		let cleaned = trimmedRecords
		if (settings.removeZeroPower) {
			cleaned = isRunning
				? cleaned.filter((record) => record.speed !== undefined && record.speed > 0)
				: removeZeroPower(cleaned)
		}
		if (settings.removeZeroHeartRate) {
			cleaned = removeZeroHeartRate(cleaned)
		}
		if (settings.smoothData > 0) {
			cleaned = removeSpikes(cleaned, settings.smoothData)
		}
		return cleaned
	}, [
		trimmedRecords,
		settings.smoothData,
		settings.removeZeroPower,
		settings.removeZeroHeartRate,
		isRunning,
	])

	// Filter out records without chart metric and decimate for performance
	const metricRecords = useMemo(() => {
		const withMetric = isRunning
			? cleanedRecords.filter((r) => r.speed !== undefined && r.speed > 0)
			: cleanedRecords.filter((r) => r.power !== undefined && r.power > 0)
		if (withMetric.length > 1000) {
			const step = Math.ceil(withMetric.length / 1000)
			return withMetric.filter((_, index) => index % step === 0)
		}
		return withMetric
	}, [cleanedRecords, isRunning])

	if (metricRecords.length === 0) {
		const noDataLabel = isRunning ? "pace" : "power"
		return (
			<div className="chart-container">
				<div className="chart-header">
					<div className="chart-header-accent" />
					<h3>{isRunning ? "Pace" : "Power"}</h3>
				</div>
				<div className="no-data">No {noDataLabel} data available</div>
			</div>
		)
	}

	// Check if data is available AND enabled in settings
	const hasHeartRate =
		settings.showHeartRate && metricRecords.some((r) => r.heartRate !== undefined && r.heartRate > 0)

	const hasTargetPower =
		!isRunning &&
		settings.showTargetPower &&
		metricRecords.some((r) => r.targetPower !== undefined && r.targetPower > 0)

	// Prepare data for chart
	const chartData = metricRecords.map((record) => ({
		time: Number(record.elapsedMinutes.toFixed(1)),
		distance: record.distance !== undefined ? Number(record.distance.toFixed(2)) : undefined,
		metric: isRunning ? speedToPace(record.speed) : record.power,
		targetPower: record.targetPower,
		...(hasHeartRate ? { heartRate: record.heartRate } : {}),
	}))

	const maxMetric = Math.max(
		...chartData.map((point) => point.metric ?? 0),
		...(hasTargetPower ? metricRecords.map((record) => record.targetPower ?? 0) : [0]),
	)
	const yAxisMax = isRunning
		? Math.max(0.5, Math.ceil(maxMetric * 2) / 2)
		: Math.max(50, Math.ceil((maxMetric * 1.1) / 50) * 50)

	const maxHR = hasHeartRate ? Math.max(...metricRecords.map((r) => r.heartRate ?? 0)) : 0
	const hrAxisMax = Math.ceil((maxHR * 1.1) / 10) * 10
	const hrLineColor = "var(--color-error)"
	const hrActiveDotColor = "var(--color-error-light)"
	const hrAxisColor = hrLineColor
	const lineThickness = Math.min(Math.max(settings.graphLineThickness, 0.6), 3)

	// Compute custom x-axis ticks when interval is set
	const xKey = useDistance ? "distance" : "time"
	const xValues = chartData.map((d) => d[xKey]).filter((v): v is number => v !== undefined)
	const xMin = Math.min(...xValues)
	const xMax = Math.max(...xValues)

	const customTicks =
		settings.xAxisInterval !== null ? computeTicks(xMin, xMax, settings.xAxisInterval) : undefined

	return (
		<div className="chart-container">
			<div className="chart-header">
				<div className="chart-header-accent" />
				<h3>{isRunning ? "Pace (min/km)" : "Power (W)"}{hasHeartRate ? " / Heart Rate (bpm)" : ""}</h3>
			</div>
			<ResponsiveContainer width="100%" height={300}>
				<LineChart
					data={chartData}
					margin={{ top: 5, right: hasHeartRate ? 20 : 20, left: 0, bottom: 5 }}
				>
					<defs>
						<linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.8} />
							<stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.1} />
						</linearGradient>
					</defs>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="var(--color-border)"
						horizontal={false}
						vertical={settings.showXAxisMarkers}
					/>
					<XAxis
						dataKey={xKey}
						label={{
							value: useDistance ? "DISTANCE (KM)" : "TIME (MIN)",
							position: "insideBottom",
							offset: -5,
							style: {
								fill: "var(--color-text-ghost)",
								fontSize: "0.6rem",
								fontWeight: 700,
								fontFamily: "Helvetica Neue, Arial, sans-serif",
								letterSpacing: "0.15em",
							},
						}}
						stroke="var(--color-border)"
						tick={{
							fill: "var(--color-text-secondary)",
							fontSize: "0.625rem",
							fontWeight: 600,
							fontFamily: "Helvetica Neue, Arial, sans-serif",
						}}
						tickLine={false}
						{...(customTicks
							? { type: "number" as const, ticks: customTicks, domain: [xMin, xMax] }
							: {})}
					/>
					<YAxis
						yAxisId="power"
						domain={[0, yAxisMax]}
						label={{
							value: isRunning ? "PACE (MIN/KM)" : "POWER (W)",
							angle: -90,
							position: "insideLeft",
							style: {
								fill: "var(--color-text-ghost)",
								fontSize: "0.6rem",
								fontWeight: 700,
								fontFamily: "Helvetica Neue, Arial, sans-serif",
								letterSpacing: "0.15em",
							},
						}}
						stroke="var(--color-border)"
						tick={{
							fill: "var(--color-text-secondary)",
							fontSize: "0.625rem",
							fontWeight: 600,
							fontFamily: "Helvetica Neue, Arial, sans-serif",
						}}
						tickLine={false}
						tickFormatter={isRunning ? (value: number) => value.toFixed(1) : undefined}
					/>
					{hasHeartRate && (
						<YAxis
							yAxisId="hr"
							orientation="right"
							domain={[0, hrAxisMax]}
							label={{
								value: "HR (BPM)",
								angle: 90,
								position: "insideRight",
								style: {
									fill: hrAxisColor,
									fontSize: "0.6rem",
									fontWeight: 700,
									fontFamily: "Helvetica Neue, Arial, sans-serif",
									letterSpacing: "0.15em",
								},
							}}
							stroke={hrAxisColor}
							tick={{
								fill: hrAxisColor,
								fontSize: "0.625rem",
								fontWeight: 600,
								fontFamily: "Helvetica Neue, Arial, sans-serif",
							}}
							tickLine={false}
						/>
					)}
					<Tooltip
						contentStyle={{
							backgroundColor: "var(--color-background)",
							border: "1px solid var(--color-surface)",
							borderRadius: "0",
							color: "var(--color-text-secondary)",
							fontFamily: "Helvetica Neue, Arial, sans-serif",
							fontSize: "0.75rem",
							fontWeight: 600,
						}}
						formatter={(value: number | undefined, name?: string) => {
							if (name === "heartRate") {
								return [`${Math.round(value ?? 0)} bpm`, "Heart Rate"]
							}
							if (name === "metric" && isRunning) {
								return [`${(value ?? 0).toFixed(2)} min/km`, "Pace"]
							}
							const label = name === "targetPower" ? "Target" : "Power"
							return [`${Math.round(value ?? 0)}W`, label]
						}}
						labelFormatter={(label: unknown) => {
							const labelValue =
								typeof label === "number" || typeof label === "string" ? label : ""
							return useDistance ? `${labelValue} km` : `${labelValue} min`
						}}
					/>
					{hasTargetPower && (
						<Line
							yAxisId="power"
							type="monotone"
							dataKey="targetPower"
							stroke="var(--color-text-muted)"
							strokeWidth={lineThickness}
							strokeDasharray="5 5"
							dot={false}
							activeDot={{ r: 4, fill: "var(--color-text-secondary)" }}
						/>
					)}
					<Line
						yAxisId="power"
						type="monotone"
						dataKey="metric"
						stroke="var(--color-primary)"
						strokeWidth={lineThickness}
						fill="url(#powerGradient)"
						dot={false}
						activeDot={{ r: 4, fill: "var(--color-accent)" }}
					/>
					{hasHeartRate && (
						<Line
							yAxisId="hr"
							type="monotone"
							dataKey="heartRate"
							stroke={hrLineColor}
							strokeWidth={lineThickness}
							dot={false}
							activeDot={{ r: 4, fill: hrActiveDotColor }}
						/>
					)}
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}
