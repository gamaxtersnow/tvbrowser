import assert from "node:assert/strict";
import {
  createWokwiBridgeState,
  reduceWokwiBridgeLine,
} from "../tools/wokwi_audio_bridge.mjs";

let state = createWokwiBridgeState();

let result = reduceWokwiBridgeLine(state, "[BTN] station 2");
assert.equal(result.state.selectedStation, 1);
assert.equal(result.action, null);

state = result.state;
result = reduceWokwiBridgeLine(state, "[AUDIO] play Econ Radio");
assert.equal(result.state.playing, true);
assert.deepEqual(result.action, { type: "play", stationIndex: 1 });

state = result.state;
result = reduceWokwiBridgeLine(state, "[ENC] station 3");
assert.equal(result.state.selectedStation, 2);
assert.deepEqual(result.action, { type: "play", stationIndex: 2 });

state = result.state;
result = reduceWokwiBridgeLine(state, "[MODE] NET -> BT");
assert.equal(result.state.playing, false);
assert.deepEqual(result.action, { type: "stop" });

console.log("wokwi audio bridge tests passed");
