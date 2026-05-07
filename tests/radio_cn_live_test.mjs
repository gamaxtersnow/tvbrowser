import assert from "node:assert/strict";
import {
  buildFfplayArgs,
  chooseRadioCnStream,
  normalizeRadioCnStreamUrl,
  stationLabel,
} from "../tools/radio_cn_live.mjs";

const station = {
  contentId: "639",
  title: "中国之声",
  playUrlLow: "http://low.example/live.m3u8",
  mp3PlayUrlLow: "http://mp3-low.example/live.m3u8",
  mp3PlayUrlHigh: "http://mp3-high.example/live.m3u8",
  playUrlMulti: "http://multi.example/live.m3u8",
};

assert.equal(chooseRadioCnStream(station), "https://multi.example/live.m3u8");

assert.equal(
  chooseRadioCnStream({ ...station, playUrlMulti: "" }),
  "https://mp3-low.example/live.m3u8",
);

assert.equal(
  normalizeRadioCnStreamUrl("http://ytcast.radio.cn:8555/110/live.m3u8"),
  "https://ytcast.radio.cn:8556/110/live.m3u8",
);

assert.equal(stationLabel(station, 0), "1. 中国之声 [639]");

assert.deepEqual(buildFfplayArgs("https://example.test/live.m3u8", { seconds: 8, volume: 55 }), [
  "-hide_banner",
  "-loglevel",
  "warning",
  "-nodisp",
  "-autoexit",
  "-t",
  "8",
  "-volume",
  "55",
  "https://example.test/live.m3u8",
]);

console.log("radio_cn_live tests passed");
