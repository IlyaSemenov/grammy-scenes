import { Scene } from "grammy-scenes"
import tap from "tap"

tap.same(new Scene("foo").name, "foo")
