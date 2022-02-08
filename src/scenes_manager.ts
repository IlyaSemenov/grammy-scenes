import { Composer } from "grammy"
import { assert, SafeDictionary } from "ts-essentials"

import {
	Scene,
	SceneFlavoredContext,
	SceneManager,
	ScenesFlavoredContext,
	SceneStackFrame,
} from "."

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
		// By default, delete the stack from the session. Re-save it explicitly in two cases:
		//
		// 1) ctx.scene.wait()
		// 2) ctx.scene.mustResume() without ctx.scene.resume()
		//
		// Deleting the stack earlier rather than on demand allows to handle cases
		// such as entering a different scenes without finishing the first one.
		delete this.ctx.session.scenes

		while (stack[0]) {
			const frame = stack[0]
			const scene = this.scenes[frame.scene]
			assert(scene)
			const step_composer = scene.steps[frame.pos]
			let finished: boolean
			if (step_composer) {
				const composer = new Composer<SceneFlavoredContext<C, any>>()
				if (scene._always) {
					// TODO: don't run _always middleware for the next step of the same scene
					composer.use(scene._always)
				}
				composer.use(step_composer)
				const handler = composer.middleware()
				const inner_ctx = this.ctx as any
				const scene_manager = new SceneManager(frame, opts)
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

				if (scene_manager._want_enter) {
					const { scene_id, arg } = scene_manager._want_enter
					stack = [{ scene: scene_id, pos: 0 }]
					opts = { arg }
					continue
				} else if (scene_manager._want_exit) {
					const { arg } = scene_manager._want_exit
					opts = { arg }
					// Do nothing - this will shift stack and continue.
				} else if (scene_manager._want_goto) {
					const { label, arg } = scene_manager._want_goto
					const pos = scene.pos_by_label[label]
					assert(
						pos !== undefined,
						`Scene ${scene.id} doesn't have label ${label}.`
					)
					frame.pos = pos
					opts = { arg }
					continue
				} else if (scene_manager._want_call) {
					const { scene_id, arg } = scene_manager._want_call
					frame.pos++
					stack.unshift({ scene: scene_id, pos: 0 })
					opts = { arg }
					continue
				} else if (scene_manager._must_resume) {
					if (scene_manager._want_resume) {
						delete frame.token
						frame.pos++
						continue
					} else {
						// wait handler didn't ask to resume
						this.ctx.session.scenes ??= { stack }
						return
					}
				} else if (scene_manager._want_wait) {
					frame.pos++
					this.ctx.session.scenes ??= { stack }
					return
				} else if (finished) {
					frame.pos++
					opts = { arg: scene_manager.next_arg }
					continue
				} else {
					// Middleware didn't call next() and didn't ask to wait; stop execution.
					return
				}
			}
			stack.shift()
		}
	}
}

export interface SceneRunOpts {
	arg?: any
	resume?: boolean
}
