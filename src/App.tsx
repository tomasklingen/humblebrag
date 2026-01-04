import { format } from "date-fns"
import { useRef, useState } from "react"
import "./App.css"
import { ExportButton } from "./components/ExportButton"
import { FileUpload } from "./components/FileUpload"
import { WorkoutCard } from "./components/WorkoutCard"
import { useFitParser } from "./hooks/useFitParser"
import { exportAsImage } from "./utils/imageExport"

function App() {
	const [file, setFile] = useState<File | null>(null)
	const { data, loading, error } = useFitParser(file)
	const cardRef = useRef<HTMLDivElement>(null)

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
			<WorkoutCard ref={cardRef} data={data} />

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
