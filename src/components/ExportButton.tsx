import "./ExportButton.css"

interface ExportButtonProps {
	onClick: () => Promise<void>
	className?: string
	disabled?: boolean
}

export function ExportButton({ onClick, className, disabled = false }: ExportButtonProps) {
	return (
		<button
			className={`export-button ${className ?? ""}`.trim()}
			onClick={() => {
				void onClick()
			}}
			disabled={disabled}
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			Export Image
		</button>
	)
}
