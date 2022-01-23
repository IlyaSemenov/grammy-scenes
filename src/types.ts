import { Context, SessionFlavor } from "grammy"

import { ScenesManager } from "."

/** Flavor to grammy session */
export interface ScenesSessionFlavor {
	scenes?: {
		stack: SceneStackFrame[]
	}
}

export interface SceneStackFrame {
	scene: string
	pos: number
	context?: any
	token?: string
}

/** Flavor to grammy context */
export type ScenesFlavor = {
	readonly scenes: ScenesManager
}

/** Grammy context, flavored with scenes */
export type ScenesFlavoredContext<C extends Context = Context> = C &
	SessionFlavor<ScenesSessionFlavor> &
	ScenesFlavor
