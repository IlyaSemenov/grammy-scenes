import "grammy-pseudo-update"

import { MiddlewareFn } from "grammy"
import { ScenesFlavoredContext } from "grammy-scenes"

declare module "grammy-pseudo-update" {
	interface PseudoUpdatePayload {
		scenes?:
			| {
					_: "enter"
					scene: string
					arg?: any
			  }
			| {
					_: "continue"
					token: string
					arg?: any
			  }
	}
}

export const scenesPseudoUpdate: MiddlewareFn<ScenesFlavoredContext> = async (
	ctx,
	next
) => {
	const payload = ctx.pseudo?.scenes
	if (payload) {
		switch (payload._) {
			case "enter":
				await ctx.scenes.enter(payload.scene, payload.arg)
				break
			case "continue":
				await ctx.scenes.continue(payload.token, payload.arg)
				break
		}
		return
	}
	return next()
}
