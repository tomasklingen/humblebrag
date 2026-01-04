import { toPng } from "html-to-image"

export async function exportAsImage(element: HTMLElement, filename: string): Promise<void> {
	try {
		// Get the element's actual dimensions
		const rect = element.getBoundingClientRect()

		// Generate PNG with high quality
		const dataUrl = await toPng(element, {
			quality: 1.0,
			pixelRatio: 2, // Retina quality
			cacheBust: true, // Ensure fresh render
			backgroundColor: "#0f172a", // Match dark background
			width: rect.width,
			height: rect.height,
			style: {
				// Ensure transform and other CSS don't affect export
				transform: "none",
				margin: "0",
			},
		})

		// Create download link
		const link = document.createElement("a")
		link.download = filename
		link.href = dataUrl
		link.click()
	} catch (error) {
		console.error("Failed to export image:", error)
		throw new Error("Failed to export image. Please try again.")
	}
}
