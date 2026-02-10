import { useRef, useState, type ChangeEvent, type DragEvent } from "react"
import "./FileUpload.css"

interface FileUploadProps {
	onFileSelect: (file: File) => void
	loading?: boolean
	error?: string | null
}

export function FileUpload({ onFileSelect, loading, error }: FileUploadProps) {
	const [dragOver, setDragOver] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setDragOver(true)
	}

	const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setDragOver(false)
	}

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setDragOver(false)

		const files = e.dataTransfer.files
		if (files.length > 0) {
			handleFile(files[0])
		}
	}

	const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (files && files.length > 0) {
			handleFile(files[0])
		}
	}

	const handleFile = (file: File) => {
		// Validate file extension
		if (!file.name.toLowerCase().endsWith(".fit")) {
			alert("Please select a .FIT file")
			return
		}

		// Validate file size (< 10MB)
		if (file.size > 10 * 1024 * 1024) {
			alert("File size must be less than 10MB")
			return
		}

		onFileSelect(file)
	}

	const handleClick = () => {
		fileInputRef.current?.click()
	}

	return (
		<div className="file-upload-container">
			<div
				className={`file-upload-zone ${dragOver ? "drag-over" : ""} ${loading === true ? "loading" : ""}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={handleClick}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept=".fit"
					onChange={handleFileInput}
					style={{ display: "none" }}
				/>

				{loading === true ? (
					<div className="upload-content">
						<div className="spinner"></div>
						<p>Parsing FIT file...</p>
					</div>
				) : (
					<div className="upload-content">
						<svg
							className="upload-icon"
							width="64"
							height="64"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
						<h2>Upload your workout</h2>
						<p>Drop your .FIT file here or click to browse</p>
						<p className="upload-hint">From Garmin, Strava, Wahoo, Zwift, etc.</p>
					</div>
				)}
			</div>

			{error !== null && error !== undefined && error !== "" && (
				<div className="error-message">
					<strong>Error:</strong> {error}
				</div>
			)}
		</div>
	)
}
