import assert from "node:assert/strict";
import {
  createState,
  currentStation,
  longPress,
  pressFor,
  rotate,
  shortPress,
  toBluetoothVolume,
} from "../simulator/radio-simulator-core.mjs";

let state = createState();
assert.equal(state.mode, "NET");
assert.equal(currentStation(state).title, "中国之声");

state = rotate(state, -1);
assert.equal(currentStation(state).title, "北京交通广播");
assert.equal(state.volume, 8);

state = shortPress(state);
assert.equal(state.playing, true);
assert.equal(state.status, "Playing");

state = longPress(state);
assert.equal(state.mode, "BT");
assert.equal(state.playing, false);
assert.equal(state.status, "BT pairing");

state = rotate(state, 4);
assert.equal(state.volume, 12);
assert.equal(toBluetoothVolume(state.volume), 73);

state = pressFor(state, 120);
assert.equal(state.btConnected, true);

state = pressFor(state, 1200);
assert.equal(state.mode, "NET");
assert.equal(state.btConnected, false);

console.log("radio simulator core tests passed");
