import { useEffect, useState } from "react"
import type { WorkoutData } from "../types/workout"
import { parseFitFile } from "../utils/fitParser"

interface UseFitParserResult {
	data: WorkoutData | null
	loading: boolean
	error: string | null
}

export function useFitParser(file: File | null): UseFitParserResult {
	const [data, setData] = useState<WorkoutData | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!file) {
			setData(null)
			setError(null)
			setLoading(false)
			return
		}

		let cancelled = false

		async function parseFile() {
			setLoading(true)
			setError(null)
			setData(null)

			try {
				const workoutData = await parseFitFile(file!)

				if (!cancelled) {
					setData(workoutData)
					setLoading(false)
				}
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Failed to parse FIT file")
					setLoading(false)
				}
			}
		}

		parseFile()

		return () => {
			cancelled = true
		}
	}, [file])

	return { data, loading, error }
}
