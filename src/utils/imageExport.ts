const EXPORT_PIXEL_RATIO = 2

const getExportBackground = (element: HTMLElement): string => {
	const elementBackground = getComputedStyle(element).backgroundColor
	if (elementBackground && elementBackground !== "rgba(0, 0, 0, 0)") {
		return elementBackground
	}

	const rootBackground = getComputedStyle(document.documentElement)
		.getPropertyValue("--color-background")
		.trim()
	return rootBackground || "#0f172a"
}

const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
	new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error("Failed to finalize export image"))
					return
				}
				resolve(blob)
			},
			"image/png",
			1,
		)
	})

interface RasterizedBlobImage {
	width: number
	height: number
	draw: (context: CanvasRenderingContext2D, x: number, y: number) => void
	dispose: () => void
}

const rasterizeBlobImage = async (blob: Blob): Promise<RasterizedBlobImage> => {
	if (typeof createImageBitmap === "function") {
		const bitmap = await createImageBitmap(blob)
		return {
			width: bitmap.width,
			height: bitmap.height,
			draw: (context, x, y) => {
				context.drawImage(bitmap, x, y)
			},
			dispose: () => {
				bitmap.close()
			},
		}
	}

	const image = await new Promise<HTMLImageElement>((resolve, reject) => {
		const objectUrl = URL.createObjectURL(blob)
		const previewImage = new Image()
		previewImage.addEventListener("load", () => {
			URL.revokeObjectURL(objectUrl)
			resolve(previewImage)
		})
		previewImage.addEventListener("error", () => {
			URL.revokeObjectURL(objectUrl)
			reject(new Error("Failed to decode exported image"))
		})
		previewImage.src = objectUrl
	})

	return {
		width: image.naturalWidth,
		height: image.naturalHeight,
		draw: (context, x, y) => {
			context.drawImage(image, x, y)
		},
		dispose: () => {},
	}
}

const createSquareBlob = async (blob: Blob, backgroundColor: string): Promise<Blob> => {
	const image = await rasterizeBlobImage(blob)
	try {
		const squareSize = Math.max(image.width, image.height)
		const canvas = document.createElement("canvas")
		canvas.width = squareSize
		canvas.height = squareSize

		const context = canvas.getContext("2d")
		if (!context) {
			throw new Error("Failed to initialize export canvas")
		}

		context.fillStyle = backgroundColor
		context.fillRect(0, 0, squareSize, squareSize)

		const x = (squareSize - image.width) / 2
		const y = (squareSize - image.height) / 2
		image.draw(context, x, y)

		return await canvasToPngBlob(canvas)
	} finally {
		image.dispose()
	}
}

export async function exportAsImage(element: HTMLElement): Promise<Blob> {
	try {
		const { toBlob } = await import("html-to-image")
		const rect = element.getBoundingClientRect()
		const width = Math.max(1, Math.ceil(rect.width))
		const height = Math.max(1, Math.ceil(rect.height))
		const backgroundColor = getExportBackground(element)
		await document.fonts.ready

		const blob = await toBlob(element, {
			quality: 1,
			pixelRatio: EXPORT_PIXEL_RATIO,
			cacheBust: true,
			backgroundColor,
			width,
			height,
			style: {
				transform: "none",
				margin: "0",
			},
		})

		if (!blob) {
			throw new Error("Failed to create export image blob")
		}

		return await createSquareBlob(blob, backgroundColor)
	} catch (error) {
		console.error("Failed to export image:", error)
		throw new Error("Failed to export image. Please try again.")
	}
}

export function downloadImage(blob: Blob, filename: string): void {
	const objectUrl = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.download = filename
	link.href = objectUrl
	link.click()
	URL.revokeObjectURL(objectUrl)
}
