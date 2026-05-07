#!/usr/bin/env node

import net from "node:net";
import process from "node:process";

import {
  chooseRadioCnStream,
  createRadioCnPlayer,
  fetchRadioCnStations,
  stationLabel,
} from "./radio_cn_live.mjs";

export function createWokwiBridgeState() {
  return {
    mode: "NET",
    playing: false,
    selectedStation: 0,
  };
}

export function reduceWokwiBridgeLine(state, line) {
  const next = { ...state };
  const stationMatch = line.match(/\[(?:BTN|ENC)\] station (\d+)/);
  if (stationMatch) {
    next.selectedStation = Math.max(0, Number(stationMatch[1]) - 1);
    return {
      state: next,
      action: next.playing ? { type: "play", stationIndex: next.selectedStation } : null,
    };
  }

  if (line.includes("[AUDIO] play") || line.startsWith("Playing ")) {
    next.mode = "NET";
    next.playing = true;
    return { state: next, action: { type: "play", stationIndex: next.selectedStation } };
  }

  if (line.includes("[AUDIO] pause") || line.includes("[MODE] NET -> BT")) {
    next.playing = false;
    if (line.includes("[MODE] NET -> BT")) {
      next.mode = "BT";
    }
    return { state: next, action: { type: "stop" } };
  }

  if (line.includes("[MODE] BT -> NET")) {
    next.mode = "NET";
    next.playing = false;
    return { state: next, action: null };
  }

  return { state: next, action: null };
}

function parseArgs(argv) {
  const options = {
    host: "127.0.0.1",
    port: 4000,
    volume: 80,
  };

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i];
    if (arg === "--host") {
      options.host = argv[++i] ?? options.host;
    } else if (arg === "--port") {
      options.port = Number(argv[++i] ?? options.port);
    } else if (arg === "--volume") {
      options.volume = Number(argv[++i] ?? options.volume);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Wokwi radio audio bridge

Usage:
  node tools/wokwi_audio_bridge.mjs --volume 80

Options:
  --host HOST     Wokwi RFC2217 host, default 127.0.0.1
  --port PORT     Wokwi RFC2217 port, default 4000
  --volume N      ffplay volume, default 80
`);
}

function cleanSerialText(chunk) {
  return chunk.toString("utf8").replace(/[^\t\n\r\x20-\x7e]/g, "");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const stations = await fetchRadioCnStations();
  const player = createRadioCnPlayer();
  let state = createWokwiBridgeState();
  let buffer = "";
  let queue = Promise.resolve();

  console.log(`Loaded ${stations.length} radio.cn stations`);
  console.log(`Listening to Wokwi serial on ${options.host}:${options.port}`);
  console.log("Use Wokwi buttons/encoder: PLAY starts audio, NEXT/PREV switches it.");

  const socket = net.createConnection({ host: options.host, port: options.port });

  async function handleAction(action) {
    if (!action) {
      return;
    }

    if (action.type === "stop") {
      await player.stop();
      console.log("Audio stopped");
      return;
    }

    if (action.type === "play") {
      const station = stations[action.stationIndex % stations.length];
      const streamUrl = chooseRadioCnStream(station);
      console.log(`Audio -> ${stationLabel(station, action.stationIndex)}`);
      await player.start(streamUrl, { volume: options.volume });
    }
  }

  function enqueueLine(line) {
    queue = queue.then(async () => {
      const result = reduceWokwiBridgeLine(state, line);
      state = result.state;
      await handleAction(result.action);
    });
    queue.catch((error) => console.error(error.message));
  }

  socket.on("data", (chunk) => {
    buffer += cleanSerialText(chunk);
    let newlineIndex = buffer.search(/\r?\n/);
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        enqueueLine(line);
      }
      newlineIndex = buffer.search(/\r?\n/);
    }
  });

  socket.on("connect", () => console.log("Bridge connected"));
  socket.on("error", (error) => console.error(`Bridge error: ${error.message}`));

  process.once("SIGINT", async () => {
    socket.destroy();
    await player.stop();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
