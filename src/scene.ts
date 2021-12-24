import { Context } from "grammy"
import { assert, AsyncOrSync } from "ts-essentials"

import { SceneRouter } from "./router"
import { ScenesFlavoredContext } from "./types"

type HandlerFn<C extends Context> = (ctx: C, arg?: any) => AsyncOrSync<void>

/** A single scene, which is also a router for sub-scenes */
export class Scene<C extends ScenesFlavoredContext> extends SceneRouter<C> {
	constructor(public readonly name: string) {
		super()
	}

	_enter_handler?: HandlerFn<C>
	_continue_handler?: HandlerFn<C>

	/** set scene enter handler */
	enter(handler: HandlerFn<C>) {
		assert(!this._enter_handler)
		this._enter_handler = handler
	}

	/** set scene continuation request handler */
	continue(handler: HandlerFn<C>) {
		assert(!this._continue_handler)
		this._continue_handler = handler
	}
}
