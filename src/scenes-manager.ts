import Debug from "debug"
import { Composer } from "grammy"
import { assert } from "ts-essentials"

import {
	SceneFlavoredContext,
	SceneManager,
	ScenesComposer,
	ScenesFlavoredContext,
	SceneStackFrame,
} from "."

const debug = Debug("grammy-scenes")

/** injected as ctx.scenes */
export class ScenesManager<
	// This is a public type, so we provide defaults.
	C extends ScenesFlavoredContext = ScenesFlavoredContext
> {
	constructor(
		public readonly ctx: C,
		public readonly composer: ScenesComposer<C>
	) {}

	// Compatibility API
	get scenes() {
		return this.composer.scenes
	}

	/** Enter top-level scene */
	async enter(sceneId: string, arg?: unknown) {
		const scene = this.composer.scenes[sceneId]
		assert(scene, `Scene ${sceneId} not found.`)
		await this._run_stack([{ scene: sceneId, pos: 0 }], { arg })
	}

	/** Abort scenes execution */
	async abort() {
		const session = await this.ctx.session
		session.scenes = undefined
	}

	/** Notify waiting scene */
	async notify(token: string, arg?: any) {
		const session = await this.ctx.session
		const stack = session.scenes?.stack
		if (stack && token && stack[0]?.token === token) {
			await this._run_stack(stack, { arg, _notify: true })
		}
	}

	async _run_stack(stack: SceneStackFrame[], opts?: SceneRunOpts) {
		// Delete the stack from the session.
		// Re-save it explicitly if ctx.scene._wait() was called.
		const session = await this.ctx.session
		session.scenes = undefined

		while (stack[0]) {
			const frame = stack.shift()!
			const scene = this.composer.scenes[frame.scene]
			if (!scene) {
				// Invalid session data - abort.
				return
			}

			const debug_scene = debug.extend(`scene=${scene.id}`)

			const frame_pos =
				frame.pos ?? (frame.step ? scene._pos_by_label[frame.step] : undefined)
			if (frame_pos === undefined) {
				// Invalid session data - abort.
				return
			}
			let pos = frame_pos
			let is_first_step = true
			let scene_session = frame.context
			let notify_token = frame.token

			while (true) {
				const debug_step = debug_scene.extend(`pos=${pos}`)
				debug_step("")

				const step = scene._steps[pos]
				if (!step) {
					break
				}
				const composer = new Composer<SceneFlavoredContext<C, any>>()
				if (is_first_step && scene._always) {
					composer.use(scene._always)
				}
				composer.use(step)
				const step_mw = composer.middleware()

				const scene_manager = new SceneManager({
					session: scene_session,
					arg: opts?.arg,
					_notify: opts?._notify,
				})
				opts = undefined

				const inner_ctx = this.ctx as any
				inner_ctx.scene = scene_manager
				try {
					await step_mw(inner_ctx, async () => undefined)
				} finally {
					delete inner_ctx.scene
				}
				scene_session = scene_manager.session
				if (scene_manager._notify_token) {
					notify_token = scene_manager._notify_token
				}

				const get_stack_frame = (): SceneStackFrame => {
					const label = scene._label_by_pos[pos]
					return {
						scene: scene.id,
						pos: label === undefined ? pos : undefined,
						step: label,
						context: scene_session,
						token: notify_token,
					}
				}

				const save_stack = () => {
					const full_stack = [get_stack_frame(), ...stack]
					for (const frame of full_stack) {
						if (frame.pos !== undefined) {
							console.warn(
								`Saving scenes stack with unlabeled steps is discouraged! Please add .label() for step ${frame.pos} in scene ${frame.scene}.`
							)
						}
					}
					if (session.scenes) {
						console.warn(
							"Scenes stack has already been saved, probably by calling await ctx.scenes.enter(). Please use ctx.scene.enter() instead."
						)
					}
					session.scenes ??= { stack: full_stack }
				}

				if (scene_manager._want_enter) {
					// Replace stack with new scene.
					const { scene_id, arg } = scene_manager._want_enter
					debug_step(`enter scene ${scene_id}`)
					stack = [{ scene: scene_id, pos: 0 }]
					opts = { arg }
					break
				} else if (scene_manager._want_exit) {
					// Exit current scene.
					debug_step(`exit scene`)
					const { arg } = scene_manager._want_exit
					opts = { arg }
					break
				} else if (scene_manager._want_goto) {
					// Goto step inside current scene.
					const { label, arg } = scene_manager._want_goto
					debug_step(`goto step ${label}`)
					const new_pos = scene._pos_by_label[label]
					assert(
						new_pos !== undefined,
						`Scene ${scene.id} doesn't have label ${label}.`
					)
					pos = new_pos
					opts = { arg }
					is_first_step = false
					continue
				} else if (scene_manager._want_call) {
					// Call inner scene.
					const { scene_id, arg } = scene_manager._want_call
					debug_step(`call scene ${scene_id}`)
					pos++
					stack.unshift({ scene: scene_id, pos: 0 }, get_stack_frame())
					opts = { arg }
					break
				} else if (scene_manager._want_wait) {
					// wait() called - exit and save next step.
					debug_step(`wait`)
					pos++
					save_stack()
					return
				} else if (scene_manager._want_must_resume) {
					// Inside wait() handler.
					if (!scene_manager._want_resume) {
						// resume() not called - exit and save current step.
						debug_step(`still wait`)
						save_stack()
						return
					} else {
						// Invalidate notify token. It's supposed to only work for the nearest wait/notify/resume.
						notify_token = undefined
					}
				}
				pos++
				opts = { arg: scene_manager.next_arg }
				is_first_step = false
			}
		}
	}
}

export interface SceneRunOpts {
	readonly arg?: any
	readonly _notify?: boolean
}
