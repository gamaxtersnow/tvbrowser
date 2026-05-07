import assert from "node:assert/strict";
import { createRadioCnPlayer } from "../tools/radio_cn_live.mjs";

const events = [];
let timerCallback = null;
let writtenState = null;
let spawnedChild = null;

const player = createRadioCnPlayer({
  readState() {
    return { pid: 123, token: "old-token" };
  },
  writeState(state) {
    writtenState = state;
    events.push(["write", state.pid]);
  },
  removeState() {
    events.push(["remove"]);
  },
  killProcess(pid, signal) {
    events.push(["kill", pid, signal]);
  },
  spawnImpl(command, args) {
    events.push(["spawn", command, args]);
    spawnedChild = {
      pid: 456,
      on(event, handler) {
        if (event === "exit") {
          this.exitHandler = handler;
        }
      },
      kill(signal) {
        events.push(["childKill", signal]);
      },
    };
    return spawnedChild;
  },
  schedule(fn, delayMs) {
    events.push(["schedule", delayMs]);
    timerCallback = fn;
    return 99;
  },
  cancel() {
    events.push(["cancel"]);
  },
});

const session = await player.start("https://example.test/live.m3u8", { seconds: 5, volume: 80 });

assert.deepEqual(events[0], ["kill", 123, "SIGTERM"]);
assert.deepEqual(events[1], ["remove"]);
assert.equal(events[2][0], "spawn");
assert.deepEqual(events[3], ["write", 456]);
assert.deepEqual(events[4], ["schedule", 5000]);
assert.equal(writtenState.pid, 456);

timerCallback();
assert(events.some((event) => event[0] === "childKill"));

spawnedChild.exitHandler();
assert(events.some((event) => event[0] === "cancel"));

await session.stop();
assert(events.some((event) => event[0] === "remove"));

console.log("radio_cn_live player tests passed");
