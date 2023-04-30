import { Context, SessionFlavor } from "grammy"

import { ScenesManager } from "."

/** Flavor to grammy session */
export interface ScenesSessionFlavor {
	scenes?: {
		/** Execution stack (inner to outer) */
		stack: SceneStackFrame[]
	}
}

/** Scene execution stack frame (stored in session) */
export interface SceneStackFrame {
	scene: string
	/** Should not be stored to session. */
	pos?: number
	step?: string
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
