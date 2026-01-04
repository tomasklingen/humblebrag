import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import type { WorkoutRecord } from "../types/workout"
import "./PowerChart.css"

interface PowerChartProps {
	records: WorkoutRecord[]
}

export function PowerChart({ records }: PowerChartProps) {
	// Filter out records without power data and decimate for performance
	const powerRecords = records
		.filter((r) => r.power !== undefined && r.power > 0)
		.filter((_, index) => {
			// For large datasets, show every Nth point to improve performance
			if (records.length > 1000) {
				return index % Math.ceil(records.length / 1000) === 0
			}
			return true
		})

	if (powerRecords.length === 0) {
		return (
			<div className="chart-container">
				<h3>Power</h3>
				<div className="no-data">No power data available</div>
			</div>
		)
	}

	// Prepare data for chart
	const chartData = powerRecords.map((record) => ({
		time: Number(record.elapsedMinutes.toFixed(1)),
		power: record.power,
	}))

	const maxPower = Math.max(...powerRecords.map((r) => r.power || 0))
	const yAxisMax = Math.ceil((maxPower * 1.1) / 50) * 50 // Round up to nearest 50

	return (
		<div className="chart-container">
			<h3>Power (W)</h3>
			<ResponsiveContainer width="100%" height={300}>
				<LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
					<defs>
						<linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8} />
							<stop offset="100%" stopColor="#f97316" stopOpacity={0.1} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="#334155" />
					<XAxis
						dataKey="time"
						label={{ value: "Time (min)", position: "insideBottom", offset: -5 }}
						stroke="#94a3b8"
						tick={{ fill: "#94a3b8" }}
					/>
					<YAxis
						domain={[0, yAxisMax]}
						label={{ value: "Power (W)", angle: -90, position: "insideLeft" }}
						stroke="#94a3b8"
						tick={{ fill: "#94a3b8" }}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: "#1e293b",
							border: "1px solid #334155",
							borderRadius: "8px",
							color: "#f1f5f9",
						}}
						formatter={(value: number | undefined) => [`${Math.round(value || 0)}W`, "Power"]}
						labelFormatter={(label: number) => `${label} min`}
					/>
					<Line
						type="monotone"
						dataKey="power"
						stroke="#f97316"
						strokeWidth={1.2}
						fill="url(#powerGradient)"
						dot={false}
						activeDot={{ r: 4, fill: "#fbbf24" }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}
