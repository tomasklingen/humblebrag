import { useCallback } from "react"
import "./DualRangeSlider.css"

interface DualRangeSliderProps {
	min: number
	max: number
	step: number
	valueStart: number
	valueEnd: number
	onChange: (start: number, end: number) => void
}

export function DualRangeSlider({
	min,
	max,
	step,
	valueStart,
	valueEnd,
	onChange,
}: DualRangeSliderProps) {
	const range = max - min
	const fillLeft = range > 0 ? ((valueStart - min) / range) * 100 : 0
	const fillRight = range > 0 ? ((max - valueEnd) / range) * 100 : 0

	const handleStartChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = Number(e.target.value)
			onChange(Math.min(val, valueEnd - step), valueEnd)
		},
		[valueEnd, step, onChange],
	)

	const handleEndChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = Number(e.target.value)
			onChange(valueStart, Math.max(val, valueStart + step))
		},
		[valueStart, step, onChange],
	)

	return (
		<div className="dual-range-slider">
			<div className="dual-range-track">
				<div className="dual-range-fill" style={{ left: `${fillLeft}%`, right: `${fillRight}%` }} />
			</div>
			<input
				type="range"
				className="dual-range-input dual-range-start"
				min={min}
				max={max}
				step={step}
				value={valueStart}
				onChange={handleStartChange}
			/>
			<input
				type="range"
				className="dual-range-input dual-range-end"
				min={min}
				max={max}
				step={step}
				value={valueEnd}
				onChange={handleEndChange}
			/>
		</div>
	)
}
