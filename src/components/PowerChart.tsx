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
}

function computeTicks(min: number, max: number, interval: number): number[] {
	const ticks: number[] = []
	const start = Math.ceil(min / interval) * interval
	for (let v = start; v <= max; v += interval) {
		ticks.push(Number(v.toFixed(2)))
	}
	return ticks
}

export function PowerChart({ records, settings }: PowerChartProps) {
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
			cleaned = removeZeroPower(cleaned)
		}
		if (settings.removeZeroHeartRate) {
			cleaned = removeZeroHeartRate(cleaned)
		}
		if (settings.smoothData) {
			cleaned = removeSpikes(cleaned)
		}
		return cleaned
	}, [trimmedRecords, settings.smoothData, settings.removeZeroPower, settings.removeZeroHeartRate])

	// Filter out records without power data and decimate for performance
	const powerRecords = useMemo(() => {
		const withPower = cleanedRecords.filter((r) => r.power !== undefined && r.power > 0)
		if (withPower.length > 1000) {
			const step = Math.ceil(withPower.length / 1000)
			return withPower.filter((_, index) => index % step === 0)
		}
		return withPower
	}, [cleanedRecords])

	if (powerRecords.length === 0) {
		return (
			<div className="chart-container">
				<div className="chart-header">
					<div className="chart-header-accent" />
					<h3>Power</h3>
				</div>
				<div className="no-data">No power data available</div>
			</div>
		)
	}

	// Check if data is available AND enabled in settings
	const hasHeartRate =
		settings.showHeartRate && powerRecords.some((r) => r.heartRate !== undefined && r.heartRate > 0)

	// Prepare data for chart
	const chartData = powerRecords.map((record) => ({
		time: Number(record.elapsedMinutes.toFixed(1)),
		distance: record.distance !== undefined ? Number(record.distance.toFixed(2)) : undefined,
		power: record.power,
		targetPower: record.targetPower,
		...(hasHeartRate ? { heartRate: record.heartRate } : {}),
	}))

	const maxPower = Math.max(
		...powerRecords.map((r) => r.power ?? 0),
		...powerRecords.map((r) => r.targetPower ?? 0),
	)
	const yAxisMax = Math.ceil((maxPower * 1.1) / 50) * 50

	const hasTargetPower =
		settings.showTargetPower &&
		powerRecords.some((r) => r.targetPower !== undefined && r.targetPower > 0)

	const maxHR = hasHeartRate ? Math.max(...powerRecords.map((r) => r.heartRate ?? 0)) : 0
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
				<h3>Power (W){hasHeartRate ? " / Heart Rate (bpm)" : ""}</h3>
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
							value: "POWER (W)",
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
							dataKey="power"
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
