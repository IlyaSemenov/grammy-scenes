# grammy-scenes

`grammy-scenes` is a plugin for [grammY](https://grammy.dev/) that adds support for [scenes](https://github.com/grammyjs/grammY/issues/136).

## Install

```sh
npm i grammy-scenes
```

## Use

```ts
import { Bot, Context, session, SessionFlavor } from "grammy"
import { ScenesSessionData, ScenesFlavor } from "grammy-scenes"

import { scenes } from "./scenes"

type SessionData = ScenesSessionData & {
  // Your own global session interface, could be empty as well.
}

export type BotContext = Context & SessionFlavor<SessionData> & ScenesFlavor

const bot = new Bot<BotContext>(process.env.BOT_TOKEN)

bot.use(
  session({
    initial: () => ({}),
  })
)

// or:
bot.use(
  session({
    type: "multi",
    scenes: {},
  })
)

// Inject ctx.scenes
bot.use(scenes.manager())

bot.command("start", async (ctx) => {
  await ctx.reply(`Welcome here.`)
  await ctx.scenes.enter("main")
})

// Actually run scenes
bot.use(scenes)

bot.start()
```

### Scenes

Typically, you will want to have a single root scenes composer:

```ts
import { ScenesComposer } from "grammy-scenes"

import { BotContext } from "../bot"
import { mainScene } from "./main"
import { otherScene } from "./other"

export const scenes = new ScenesComposer<BotContext>()
scenes.scene(mainScene)
scenes.scene(otherScene)

// or:
export const scenes = new ScenesComposer<BotContext>(mainScene, otherScene)
```

and decompose each scene into its own module:

```ts
import { Scene } from "grammy-scenes"

import { BotContext } from "../bot"

export const mainScene = new Scene<BotContext>("main")

// Define scene flow with steps.
mainScene.step(async (ctx) => {
  await ctx.reply("Entering main scene...")
})

mainScene.step(async (ctx) => {
  await ctx.reply("Enter your name:")
})

// As the flow comes to wait(), the execution will stop.
// Next Telegram updates will be passed to the inner middleware.
// The inner middleware should call ctx.scene.resume() to proceed to the next scene step.
// Make sure to use unique label in each wait() block.
mainScene.wait("name").on("message:text", async (ctx) => {
  const name = ctx.message.text
  if (name.toLowerCase() === "john") {
    await ctx.reply(`Welcome, ${name}!`)
    // Proceed to the next step.
    ctx.scene.resume()
  } else {
    await ctx.reply(`${name}, your are not welcome here.`)
    // Keep the execution in the current wait() block.
  }
})

// Add more steps...
mainScene.step(async (ctx) => {
  await ctx.reply("Proceeding...")
})

// Mark position in the scene to be able to jump to it (see below).
mainScene.label("start")

// A scene may unconditionally call a nested scene.
// See sample captcha implementation below.
mainScene.call("captcha")

// Please add step label for the first step after call()
mainScene.label("after_captcha").step(async (ctx) => {
  await ctx.reply(`Please choose:`, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Start over", callback_data: "start" },
          { text: "Add item", callback_data: "add_item" },
          { text: "Exit", callback_data: "exit" },
        ],
      ],
    },
  })
})

mainScene.wait("menu").on("callback_query:data", async (ctx) => {
  await ctx.answerCallbackQuery()
  const choice = ctx.callbackQuery.data
  if (choice === "start") {
    // Jump to the label marked above.
    ctx.scene.goto("start")
  } else if (choice === "add_item") {
    // Conditionally call a nested scene.
    // Implies automatic resume after the nested scene completes.
    ctx.scene.call("add_item")
  } else if (choice === "exit") {
    // Exit scene, don't call next middleware.
    ctx.scene.exit()
  }
})

mainScene.step((ctx) => ctx.reply(`Main scene finished`))
```

### Scene/step argument

```ts
bot.command("start", (ctx) =>
  ctx.scenes.enter(
    "main",
    // Pass any data (not necessarily serializable).
    // The payload will be accessible as ctx.scene.arg in the first scene middleware, and then discarded.
    { title: "mylord" }
  )
)

mainScene.step(async (ctx) => {
  await ctx.reply(`Enter your name, ${ctx.scene.arg?.title || "mortal"}:`)
})
```

The following API methods allow passing argument:

- `scene.enter`
- `scene.call`
- `scene.goto`
- `scene.exit`
- `scene.arg`
- `ctx.scenes.enter`
- `ctx.scenes.notify`
- `ctx.scene.call`
- `ctx.scene.exit`
- `ctx.scene.goto`

You may also explicitly set argument for the next step with:

```ts
ctx.scene.next_arg = ...
```

Note that this value is transient. It is not saved to the session, and thus does not survive wait/notify cycle. Please use `ctx.scene.session` if you need that.

### Scene session context

A scene may use context-local session data.
The session data is persisted during nested scenes calls, and is automatically discarded when the scene completes or aborts.

```ts
import { Scene } from "grammy-scenes"
import { generateCaptcha } from "some-captcha-module"

import { BotContext } from "../bot"

const captchaScene = new Scene<BotContext, { secret: string }>("captcha")
captchaScene.step(async (ctx) => {
  const { secret, image } = await generateCaptcha()
  ctx.scene.session = { secret }
  await ctx.reply(`Enter the letters you see below:`)
  await ctx.replyWithPhoto(image)
})
captchaScene.wait("letters").setup((scene) => {
  // `setup` is a helper which simply runs the setup function against the current composer.
  // See https://github.com/grammyjs/grammY/issues/163
  scene.on("message:text", async (ctx) => {
    if (ctx.message.text === ctx.scene.session.secret) {
      ctx.scene.resume()
    } else {
      await ctx.reply(`Try again!`)
    }
  })
  scene.on("message:sticker", (ctx) => ctx.reply("No stickers please."))
})
```

### Resuming a paused scene

Let's say you have a scene where user enters some data which is then processed by an external service.
You will naturally want to resume the scene when the processing is complete, without having user to poll the bot by clicking some "Check Status" button.

Consider the following example:

```ts
import { Scene } from "grammy-scenes"

import { BotContext } from "../bot"

const jobScene = new Scene<BotContext>("job")
jobScene.step(async (ctx) => {
  await ctx.reply(`Starting job...`)
  const token = ctx.scene.createNotifyToken()
  startJob({ chat_id: ctx.chat!.id, token })
})
jobScene.wait("job").setup((scene) => {
  // Register middleware for future ctx.scenes.notify() call.
  scene.onNotify(async (ctx) => {
    await ctx.reply(`Job completed with result: ${ctx.scene.arg}`)
    ctx.scene.resume()
  })
  scene.on("message:text", async (ctx) => {
    await ctx.reply(`Please wait until the job is complete.`)
  })
})
```

To resume the scene, call `ctx.scenes.notify()` when the job completes:

```ts
onJobComplete(async ({ token, jobResult }) => {
  await ctx.scenes.notify(token)
  // or:
  await ctx.scenes.notify(token, jobResult)
})
```

#### Resuming a scene without having chat context

In the example above, the imaginary external event handler is supposed to somehow keep the reference to `ctx`.

In real world, that is not always possible. The continuation request could come from a message queue processor or a HTTP server, or the bot server could be restarted.

To resume a scene without having a chat context, you can use [grammy-pseudo-update](https://github.com/IlyaSemenov/grammy-pseudo-update):

```ts
import { pseudoUpdate } from "grammy-pseudo-update"

// ...

bot.use(session(/* ... */))
bot.use(scenes.manager())
bot.use(pseudoUpdate) // <---- install pseudo update executor

// ...

bot.use(scenes)

// ...

onSomeExternalEvent(({ chat_id, token, payload }) => {
  bot.handlePseudoUpdate({ chat_id }, async (ctx) => {
    // This code will be executed by the executor installed above.
    await ctx.scenes.notify(token, payload)
  })
})

bot.start()
```

### Abort scenes

If only part of your code uses scenes, you will possibly want to abort whatever scene is being executed on certain (or all) commands.

You can do this with:

```ts
bot.command("help", async (ctx) => {
  ctx.scenes.abort()
  await ctx.reply("Help text")
})
```

or you may do this universally for all commands:

```ts
bot.on("message:text", (ctx, next) => {
  if (ctx.message.text.startsWith("/")) {
    ctx.scenes.abort()
  }
  return next()
})
```

### Run middleware before each step

To run certain middleware before each step, use `scene.always()`:

```ts
import { Scene } from "grammy-scenes"

import { BotContext, FooModel } from "../bot"

const scene = new Scene<BotContext & { foo: FooModel }, { foo_id: number }>(
  "main"
)

scene.always().do(async (ctx) => {
  // Put foo into context from session
  const foo_id = ctx.scene.session?.foo_id
  if (foo_id) {
    ctx.foo = await FooModel.query().findById(foo_id)
  }
})

scene.step((ctx) => {
  ctx.scene.session = { foo_id: 123 } // Save ID to session
})

scene.wait("message").on("message", async (ctx) => {
  await ctx.reply(`ctx.foo: ${ctx.foo.name}`)
})
```

## Lazy (dynamic) scene manager

You can use different scenes based on context (e.g. for different users, or populated in runtime from the database).

```ts
// Inject ctx.scenes
bot.lazy((ctx) => {
  const scenes = new ScenesComposer<BotContext>()
  // Populate scenes in runtime with scenes.scene(...)
  return scenes.manager()
})

bot.command("start", async (ctx) => {
  // Assuming you will always have the main scene:
  await ctx.scenes.enter("main")
})

// Actually run scenes
bot.lazy((ctx) => ctx.scenes.composer)

bot.start()
```
