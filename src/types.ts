import { Context, LazySessionFlavor } from "grammy"

import { ScenesManager } from "."

/** grammy session data */
export interface ScenesSessionData {
	scenes?: {
		/** Execution stack (inner to outer) */
		stack: SceneStackFrame[]
	}
}

/** @deprecated use ScenesSessionData */
export type ScenesSessionFlavor = ScenesSessionData

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

/** Base grammy context flavored with scenes. */
export type ScenesFlavoredContext<C extends Context = Context> = C &
	LazySessionFlavor<ScenesSessionData> &
	ScenesFlavor
