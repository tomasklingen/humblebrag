import type { ThemeHarmony } from "../types/workout"

export interface ThemeModel {
	themeHue: number
	themeVibrance: number
	themeDepth: number
	themeContrast: number
	themeHarmony: ThemeHarmony
}

export interface ThemePalette {
	primary: string
	accent: string
	background: string
	surface: string
	surfaceHover: string
	border: string
	text: string

	primaryHue: number
	accentHue: number
	backgroundHue: number
	surfaceHue: number
}

export const DEFAULT_THEME_MODEL: ThemeModel = {
	themeHue: 24,
	themeVibrance: 72,
	themeDepth: 76,
	themeContrast: 62,
	themeHarmony: "analogous",
}

const HARMONY_SHIFTS: Record<ThemeHarmony, number> = {
	analogous: 28,
	split: 150,
	complementary: 180,
	triadic: 120,
}

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max)

const lerp = (start: number, end: number, amount: number): number => start + (end - start) * amount

const wrapHue = (hue: number): number => {
	const normalized = hue % 360
	return normalized < 0 ? normalized + 360 : normalized
}

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
	const h = wrapHue(hue)
	const s = clamp(saturation, 0, 100) / 100
	const l = clamp(lightness, 0, 100) / 100

	const chroma = (1 - Math.abs(2 * l - 1)) * s
	const segment = h / 60
	const x = chroma * (1 - Math.abs((segment % 2) - 1))

	let red = 0
	let green = 0
	let blue = 0

	if (segment >= 0 && segment < 1) {
		red = chroma
		green = x
	} else if (segment < 2) {
		red = x
		green = chroma
	} else if (segment < 3) {
		green = chroma
		blue = x
	} else if (segment < 4) {
		green = x
		blue = chroma
	} else if (segment < 5) {
		red = x
		blue = chroma
	} else {
		red = chroma
		blue = x
	}

	const match = l - chroma / 2
	const toHex = (channel: number): string => {
		const bounded = clamp(channel + match, 0, 1)
		return Math.round(bounded * 255)
			.toString(16)
			.padStart(2, "0")
	}

	return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

export const isThemeHarmony = (value: unknown): value is ThemeHarmony =>
	value === "analogous" || value === "split" || value === "complementary" || value === "triadic"

export const normalizeThemeModel = (model: Partial<ThemeModel>): ThemeModel => ({
	themeHue: clamp(
		typeof model.themeHue === "number" ? model.themeHue : DEFAULT_THEME_MODEL.themeHue,
		0,
		360,
	),
	themeVibrance: clamp(
		typeof model.themeVibrance === "number"
			? model.themeVibrance
			: DEFAULT_THEME_MODEL.themeVibrance,
		0,
		100,
	),
	themeDepth: clamp(
		typeof model.themeDepth === "number" ? model.themeDepth : DEFAULT_THEME_MODEL.themeDepth,
		0,
		100,
	),
	themeContrast: clamp(
		typeof model.themeContrast === "number"
			? model.themeContrast
			: DEFAULT_THEME_MODEL.themeContrast,
		0,
		100,
	),
	themeHarmony: isThemeHarmony(model.themeHarmony)
		? model.themeHarmony
		: DEFAULT_THEME_MODEL.themeHarmony,
})

export const createThemePalette = (model: ThemeModel): ThemePalette => {
	const hue = wrapHue(model.themeHue)
	const vibrance = clamp(model.themeVibrance, 0, 100) / 100
	const depth = clamp(model.themeDepth, 0, 100) / 100
	const contrast = clamp(model.themeContrast, 0, 100) / 100

	const primaryHue = hue
	const accentHue = wrapHue(hue + HARMONY_SHIFTS[model.themeHarmony])
	const backgroundHue = wrapHue(hue - lerp(6, 18, depth))
	const surfaceHue = wrapHue(backgroundHue + 10)

	const primarySaturation = lerp(52, 90, vibrance)
	const primaryLightness = lerp(50, 66, contrast)

	const accentSaturation = clamp(primarySaturation + 6, 0, 100)
	const accentLightness = clamp(primaryLightness + lerp(4, 10, 1 - contrast), 0, 100)

	const backgroundSaturation = lerp(18, 34, vibrance)
	const backgroundLightness = clamp(lerp(30, 5, depth) + lerp(0, 4, 1 - contrast), 5, 34)

	const surfaceSaturation = clamp(backgroundSaturation + lerp(2, 10, vibrance), 0, 100)
	const surfaceLightness = clamp(
		backgroundLightness + lerp(6, 16, contrast) + lerp(0, 6, 1 - depth),
		0,
		54,
	)

	const hoverLightness = clamp(surfaceLightness + lerp(3, 9, contrast), 0, 62)
	const borderLightness = clamp(surfaceLightness + lerp(8, 18, contrast), 0, 72)

	const textSaturation = clamp(lerp(2, 8, vibrance), 0, 100)
	const textLightness = clamp(lerp(95, 92, depth), 90, 97)
	const textHue = wrapHue(backgroundHue + 4)

	return {
		primary: hslToHex(primaryHue, primarySaturation, primaryLightness),
		accent: hslToHex(accentHue, accentSaturation, accentLightness),
		background: hslToHex(backgroundHue, backgroundSaturation, backgroundLightness),
		surface: hslToHex(surfaceHue, surfaceSaturation, surfaceLightness),
		surfaceHover: hslToHex(surfaceHue, surfaceSaturation, hoverLightness),
		border: hslToHex(surfaceHue, surfaceSaturation, borderLightness),
		text: hslToHex(textHue, textSaturation, textLightness),
		primaryHue,
		accentHue,
		backgroundHue,
		surfaceHue,
	}
}

export const getHarmonyShift = (harmony: ThemeHarmony): number => HARMONY_SHIFTS[harmony]
