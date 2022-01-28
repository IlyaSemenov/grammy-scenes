# grammy-scenes

`grammy-scenes` is a plugin for [grammY](https://grammy.dev/) that adds support for [scenes](https://github.com/grammyjs/grammY/issues/136).

## Install

```
yarn add grammy-scenes
```

## Use

```ts
import { Bot, Context, session, SessionFlavor } from "grammy"
import { SceneSessionFlavor, ScenesFlavor } from "grammy-scenes"

import { scenes } from "./scenes"

type SessionData = SceneSessionFlavor & {
  // Your own global session interface, could be empty as well.
}

export type BotContext = Context & SessionFlavor<SessionData> & ScenesFlavor

const bot = new Bot<BotContext>(process.env.BOT_TOKEN)

bot.use(
  session({
    initial: () => ({}),
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

// Scene extends Composer, so you may use all methods such as .use() .on() etc.
mainScene.use((ctx, next) => {
  console.log("Entering main scene...")
  return next()
})

// Simply put, do() is a use() which automatically calls next()
mainScene.do(async (ctx) => {
  await ctx.reply(`Enter your name:`)
})

// As the flow comes to wait() middleware, the execution will stop and next Telegram updates will be passed to the inner middleware.
// The inner middleware should call ctx.scene.resume() to proceed to the next scene step.
mainScene.wait().on("message:text", async (ctx) => {
  const name = ctx.message.text
  if (name.toLowerCase() === "john") {
    await ctx.reply(`Welcome, ${name}!`)
    // Proceed to the next step.
    ctx.scene.resume()
  } else {
    // Keep the execution in the current wait() block.
    await ctx.reply(`${name}, your are not welcome here.`)
  }
})

// Mark position in the scene to be able to jump to it (see below).
mainScene.label("start")

// A scene may unconditionally call a nested scene.
// See sample captcha implementation below.
mainScene.call("captcha")

mainScene.do(async (ctx) => {
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

mainScene.wait().on("callback_query:data", async (ctx) => {
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
    // Abort scene execution, don't call next middleware.
    ctx.scene.abort()
  }
})

mainScene.do((ctx) => ctx.reply(`Main scene finished`))
```

### Scene argument

```ts
bot.command("start", (ctx) =>
  ctx.scenes.enter(
    "main",
    // Pass any data (not necessarily serializable).
    // The payload will be accessible as ctx.scene.arg in the first scene middleware, and then discarded.
    { title: "mylord" }
  )
)

mainScene.do(async (ctx) => {
  await ctx.reply(`Enter your name, ${ctx.scene.arg?.title || "mortal"}:`)
})
```

### Scene session context

A scene may use context-local session data.
The session data is persisted during nested scenes calls, and is automatically discarded when the scene completes or aborts.

```ts
import { Scene } from "grammy-scenes"
import { generateCaptcha } from "some-captcha-module"

import { BotContext } from "../bot"

const captchaScene = new Scene<BotContext, { secret: string }>("captcha")
captchaScene.do(async (ctx) => {
  const { secret, image } = await generateCaptcha()
  ctx.scene.session = { secret }
  await ctx.reply(`Enter the letters you see below:`)
  await ctx.replyWithPhoto(image)
})
captchaScene.wait().setup((scene) => {
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
jobScene.do(async (ctx) => {
  await ctx.reply(`Starting job...`)
  const resume_token = ctx.scene.createResumeToken()
  startJob({ chat_id: ctx.chat!.id, resume_token })
})
jobScene.wait().setup((scene) => {
  // Register middleware for future ctx.scenes.resume() call.
  scene.resume(async (ctx) => {
    await ctx.reply(`Job completed with result: ${ctx.scene.arg}`)
    ctx.scene.resume()
  })
  scene.on("message:text", async (ctx) => {
    await ctx.reply(`Please wait until the job is complete.`)
  })
})
```

To resume the scene, call `ctx.scenes.resume()` when the job completes:

```ts
onJobComplete(async ({ resumeToken, jobResult }) => {
  await ctx.scenes.resume(resumeToken)
  // or:
  await ctx.scenes.resume(resumeToken, jobResult)
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

onSomeExternalEvent(({ chat_id, resume_token, payload }) => {
  bot.handlePseudoUpdate({ chat_id }, async (ctx) => {
    // This code will be executed by the executor installed above.
    await ctx.scenes.resume(resume_token, payload)
  })
})

bot.start()
```
