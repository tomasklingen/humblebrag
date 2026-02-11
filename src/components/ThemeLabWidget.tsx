import { useEffect, useRef, useState } from "react"
import type { CardSettings, WorkoutData } from "../types/workout"
import { CardCustomizer } from "./CardCustomizer"
import "./ThemeLabWidget.css"

interface ThemeLabWidgetProps {
	settings: CardSettings
	onChange: (settings: CardSettings) => void
	data: WorkoutData
}

const CUSTOMIZE_POPOVER_ID = "customize-popover"

type PopoverElement = HTMLDivElement & {
	showPopover?: () => void
	hidePopover?: () => void
}

const detectPopoverSupport = (): boolean => {
	if (typeof HTMLElement === "undefined") {
		return false
	}

	return typeof HTMLElement.prototype.showPopover === "function"
}

const supportsPopoverApi = detectPopoverSupport()

export function ThemeLabWidget({ settings, onChange, data }: ThemeLabWidgetProps) {
	const popoverRef = useRef<HTMLDivElement | null>(null)
	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		const popover = popoverRef.current as PopoverElement | null
		if (!popover || !supportsPopoverApi) {
			return
		}

		const handleToggle = (event: Event) => {
			const nextState = (event as Event & { newState?: string }).newState
			if (nextState === "open") {
				setIsOpen(true)
				return
			}
			if (nextState === "closed") {
				setIsOpen(false)
				return
			}
			setIsOpen(popover.matches(":popover-open"))
		}

		popover.addEventListener("toggle", handleToggle)

		return () => {
			popover.removeEventListener("toggle", handleToggle)
		}
	}, [])

	const togglePopover = () => {
		const popover = popoverRef.current as PopoverElement | null
		if (!popover) {
			return
		}

		if (!supportsPopoverApi || typeof popover.showPopover !== "function") {
			setIsOpen((current) => !current)
			return
		}

		if (popover.matches(":popover-open")) {
			popover.hidePopover?.()
			setIsOpen(false)
		} else {
			popover.showPopover()
			setIsOpen(true)
		}
	}

	const closePopover = () => {
		const popover = popoverRef.current as PopoverElement | null
		if (supportsPopoverApi && popover?.matches(":popover-open")) {
			popover.hidePopover?.()
		}
		setIsOpen(false)
	}

	const popoverProps = supportsPopoverApi ? { popover: "manual" as const } : {}

	return (
		<div className={`theme-lab-widget-shell ${isOpen ? "is-open" : ""}`}>
			<button
				type="button"
				className="theme-lab-widget-toggle"
				onClick={togglePopover}
				aria-controls={CUSTOMIZE_POPOVER_ID}
				aria-expanded={isOpen}
			>
				<span className="theme-lab-widget-kicker">Floating</span>
				<span className="theme-lab-widget-title">Customize</span>
				<span className="theme-lab-widget-state">{isOpen ? "Collapse" : "Expand"}</span>
			</button>

			<div
				ref={popoverRef}
				id={CUSTOMIZE_POPOVER_ID}
				className={`theme-lab-widget-popover ${!supportsPopoverApi && isOpen ? "fallback-open" : ""}`}
				{...popoverProps}
			>
				<div className="theme-lab-widget-header">
					<div>
						<p>Customizer</p>
						<h3>Card Controls</h3>
					</div>
					<button type="button" onClick={closePopover} aria-label="Close customize panel">
						Close
					</button>
				</div>

				<div className="theme-lab-widget-content">
					<CardCustomizer settings={settings} onChange={onChange} data={data} />
				</div>
			</div>
		</div>
	)
}
