import { v4 as uuid_v4 } from "uuid"

import { SceneRunOpts, ScenesFlavoredContext, SceneStackFrame } from "."

/** injected as ctx.scene */
export class SceneManager<S = unknown> {
	constructor(
		public readonly frame: SceneStackFrame,
		public readonly opts?: SceneRunOpts
	) {}

	get session() {
		return this.frame.context as S
	}

	set session(value: S) {
		this.frame.context = value
	}

	get arg() {
		return this.opts?.arg
	}

	_wait_request = false

	wait() {
		this._wait_request = true
	}

	waitWithToken() {
		const token = uuid_v4()
		this.frame.token = token
		this.wait()
		return token
	}

	_call_request?: { scene_id: string; arg?: any }

	call(sceneId: string, arg?: any) {
		this._call_request = { scene_id: sceneId, arg }
	}

	_must_resume = false
	_resume_request = false

	resume() {
		this._resume_request = true
	}

	_label?: string

	goto(label: string) {
		this._label = label
	}
}

export type SceneFlavoredContext<C extends ScenesFlavoredContext, S> = C & {
	readonly scene: SceneManager<S>
}
