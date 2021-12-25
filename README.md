# grammy-scenes

`grammy-scenes` is a plugin for [grammY](https://grammy.dev/) that adds support for [scenes](https://github.com/grammyjs/grammY/issues/136).

## Install

```
yarn add grammy-scenes
```

## Use

```ts
import { Bot, Context, session, SessionFlavor } from "grammy"
import {
	scenes_control_middleware,
	SceneSessionFlavor,
	ScenesFlavor,
} from "grammy-scenes"

import { scenes } from "./scenes"

type SessionData = SceneSessionFlavor & {
	// Your own global session interface, could be empty as well.
}

export type MyBotContext = Context & SessionFlavor<SessionData> & ScenesFlavor

const tg_bot = new TgBot<MyBotContext>(process.env.BOT_TOKEN)

tg_bot.use(
	session({
		initial: () => ({}),
	})
)

// Inject ctx.scenes
tg_bot.use(scenes_control_middleware(scenes))

tg_bot.command("start", async (ctx) => {
	await ctx.reply(`Welcome here`)
	await ctx.scenes.enter("add_item")
})

// Actually run scenes
tg_bot.use(scenes)

tg_bot.start()
```

### Scenes

Typically, you will have a single root scene router:

```ts
import { SceneRouter } from "grammy-scenes"

import { MyBotContext } from "../bot"
import { add_item_scene } from "./add_item"

export const scenes = new SceneRouter<MyBotContext>()
scenes.use_scene(add_item_scene)
// Other scenes added similarly
```

and decompose each scene into its own module:

```ts
import { SessionFlavor } from "grammy"
import { Scene } from "grammy-scenes"

import { MyBotContext } from "../bot"

export const add_item_scene = new Scene<
	MyBotContext &
		SessionFlavor<{
			add_item: {
				item_name?: string
				item_price?: number
			}
		}>
>("add_item")

// "Enter" handler will be called once when a scene is entered.
add_item_scene.enter(async (ctx) => {
	ctx.session.add_item = {}
	// inner() moves to a subscene.
	await ctx.scenes.inner("enter_name")
})

add_item_scene.scene("enter_name", (scene) => {
	// Subscenes also have "enter" handlers.
	scene.enter(async (ctx) => {
		await ctx.reply(`Enter name`)
	})
	scene.on("message:text", async (ctx) => {
		ctx.session.add_item.name = ctx.message.text
		// move() moves to a sibling (sub)scene.
		await ctx.scene.move("enter_price")
	})
})

add_item_scene.scene("enter_price", (scene) => {
	scene.enter(async (ctx) => {
		await ctx.reply(`Enter price`)
	})
	scene.on("message:text", async (ctx) => {
		const price = Number(ctx.message.text)
		if (price > 0) {
			ctx.session.add_item.name = ctx.message.text
			await ctx.scene.move("complete")
		} else {
			await ctx.reply(`Enter valid price!`)
		}
	})
})

add_item_scene.scene("complete").enter(async (ctx) => {
	// Work with session data.
	await ItemModel.query().insert(ctx.session.add_item)
	await ctx.reply(`Item saved!`)
})
```

## API

### Scene registration

To setup a scene, either simply setup a `Scene` object:

```ts
const scene = new Scene("name")
scene.use(/* ... */)
router.use_scene(scene)
```

or use setup callback:

```ts
router.use_scene("name", (scene) => {
	scene.use(/* ... */)
})
```

or a shortcut:

```ts
router.use_scene("name").use(/* ... */)
```

### Entering scenes

To enter a top-level scene, use `ctx.scenes.enter(...)`, optionally passing a single argument:

```ts
await ctx.scenes.enter("scene_name")
// or
await ctx.scenes.enter("scene_name", { item_id: 123 })
```

if the scene has `enter` handler, it will be immediatelly called:

```ts
scene.enter(async (ctx, arg) => {
	// will be called on ctx.scenes.enter(...)
	// arg will be { item_id: 123 }
})
```

### Moving through scenes

To proceed to a sibling scene:

```ts
await ctx.scenes.move("sibling_scene")
// or
await ctx.scenes.move("sibling_scene", { item_id: 123 })
```

To enter a nested sub-scene:

```ts
await ctx.scenes.inner("subscene")
// or
await ctx.scenes.move("sibling_scene", { item_id: 123 })
```

Similarly, `enter` handlers for subscenes will be called if configured.

### "Continuing" scenes

`grammy-scenes` allows to "continue" a scene on an external event.

In the scenario above, let's say item data is processed by some kind of external library/remove API/whatever. That's how one will achieve that:

```ts
add_item_scene.scene("enter_price", (scene) => {
	// ...
	scene.on("message:text", async (ctx) => {
		// ...
		await ctx.scene.move("saving")
	})
})

add_item_scene.scene("saving", (scene) => {
	scene.enter(async (ctx) => {
		await ctx.reply(`Saving...`)
		// Run some kind of long job.
		process_item_data({
			data: ctx.session.add_item,
			token: ctx.scenes.create_continue_token(),
		})
	})
	scene.on("message:text", async (ctx) => {
		// If user messages us, report that we are busy.
		await ctx.reply(`Still saving...`)
	})
	scene.continue(async (ctx, arg) => {
		// See below when this is called.
		await ctx.scene.move("complete")
	})
})

add_item_scene.scene("complete").enter(async (ctx) => {
	await ctx.reply(`Item saved!`)
})
```

To "continue" in an external handler, use:

```ts
await ctx.scenes.continue(token)
// or
await ctx.scenes.continue(token, { result: 123 })
```

If the scene has moved on, this will be silently ignored.