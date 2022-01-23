import { assert, SafeDictionary } from "ts-essentials"

import { Scene, SceneManager, ScenesFlavoredContext, SceneStackFrame } from "."

/** injected as ctx.scenes */
export class ScenesManager<
	// This is a public type, so we provide defaults.
	C extends ScenesFlavoredContext = ScenesFlavoredContext
> {
	constructor(
		public readonly ctx: C,
		public readonly scenes: SafeDictionary<Scene<C, any>>
	) {}

	/** Enter top-level scene */
	async enter(sceneId: string, arg?: unknown) {
		const scene = this.scenes[sceneId]
		assert(scene, `Scene ${sceneId} not found.`)
		await this._run_stack([{ scene: sceneId, pos: 0 }], { arg })
	}

	/** Resume scene if it's still on the same step */
	async resume(token: string, arg?: unknown) {
		const stack = this.ctx.session.scenes?.stack
		if (stack && token && stack[0]?.token === token) {
			await this._run_stack(stack, { arg, resume: true })
		}
	}

	async _run_stack(stack: SceneStackFrame[], opts?: SceneRunOpts) {
		while (stack[0]) {
			const frame = stack[0]
			const scene = this.scenes[frame.scene]
			assert(scene)
			const handler = scene.steps[frame.pos]?.middleware()
			let finished: boolean
			if (handler) {
				const inner_ctx = this.ctx as any
				const scene_manager = new SceneManager<C, any>(inner_ctx, frame, opts)
				opts = undefined
				inner_ctx.scene = scene_manager
				try {
					finished = false
					await handler(inner_ctx, async () => {
						finished = true
					})
				} finally {
					delete inner_ctx.scene
				}
				if (scene_manager._label) {
					const label = scene_manager._label
					const pos = scene.pos_by_label[label]
					assert(
						pos !== undefined,
						`Scene ${scene.id} doesn't have label ${label}.`
					)
					frame.pos = pos
					continue
				}
				if (scene_manager._call_request) {
					const { scene_id, arg } = scene_manager._call_request
					frame.pos++
					stack.unshift({ scene: scene_id, pos: 0 })
					opts = { arg }
					continue
				}
				if (scene_manager._must_resume) {
					if (scene_manager._resume_request) {
						frame.pos++
						delete this.ctx.session.scenes
						continue
					} else {
						// wait handler didn't ask to resume
						return
					}
				}
				if (scene_manager._wait_request) {
					frame.pos++
					this.ctx.session.scenes = { stack }
					return
				}
				frame.pos++
				continue
			} else {
				finished = true
			}
			if (finished) {
				stack.shift()
			} else {
				// Middleware never reached wait, call, or end of flow; stop execution.
				return
			}
		}
	}
}

export interface SceneRunOpts {
	arg?: any
	resume?: boolean
}
