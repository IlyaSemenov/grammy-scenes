import { Context, SessionFlavor } from "grammy"

import { ScenesManager } from "./manager"

/** Flavor to grammy session */
export interface SceneSessionFlavor {
	_scene?: {
		path: string
		continue_token?: string
	}
}

/** Flavor to grammy context */
export type ScenesFlavor = {
	readonly scenes: ScenesManager
}

/** Grammy context, flavored with scenes */
export type ScenesFlavoredContext<C extends BaseContext = BaseContext> = C &
	ScenesFlavor

/** The most generic grammy context that grammy-scenes can work with */
type BaseContext = Context & SessionFlavor<SceneSessionFlavor>
