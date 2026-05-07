#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";

export const RADIO_CN_LIST_URL =
  "https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0";

export function normalizeRadioCnStreamUrl(url) {
  let normalized = String(url ?? "").trim();
  normalized = normalized.replace(".radio.cn:8555", ".radio.cn:8556");
  if (normalized.startsWith("http:")) {
    normalized = `https:${normalized.slice(5)}`;
  }
  return normalized;
}

export function chooseRadioCnStream(station) {
  return normalizeRadioCnStreamUrl(
    station?.playUrlMulti ||
      station?.mp3PlayUrlLow ||
      station?.mp3PlayUrlHigh ||
      station?.playUrlLow ||
      "",
  );
}

export function stationLabel(station, index) {
  const id = station?.contentId ? ` [${station.contentId}]` : "";
  return `${index + 1}. ${station?.title ?? "Unknown"}${id}`;
}

export function buildFfplayArgs(streamUrl, options = {}) {
  const args = ["-hide_banner", "-loglevel", "warning", "-nodisp", "-autoexit"];

  if (options.seconds > 0) {
    args.push("-t", String(options.seconds));
  }

  if (Number.isFinite(options.volume)) {
    args.push("-volume", String(options.volume));
  }

  args.push(streamUrl);
  return args;
}

const DEFAULT_STATE_PATH = path.join(os.tmpdir(), "radio-cn-live-player.json");

function createDefaultProcessController() {
  return {
    readState: async () => {
      try {
        const raw = await fs.readFile(DEFAULT_STATE_PATH, "utf8");
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    writeState: async (state) => {
      await fs.writeFile(DEFAULT_STATE_PATH, JSON.stringify(state), "utf8");
    },
    removeState: async () => {
      try {
        await fs.unlink(DEFAULT_STATE_PATH);
      } catch {
        // ignore
      }
    },
    killProcess: async (pid, signal = "SIGTERM") => {
      try {
        process.kill(pid, signal);
      } catch {
        // ignore stale pid
      }
    },
    spawnImpl: (command, args, options) => spawn(command, args, options),
    schedule: (fn, delayMs) => setTimeout(fn, delayMs),
    cancel: (timerId) => clearTimeout(timerId),
  };
}

export function createRadioCnPlayer(processController = createDefaultProcessController()) {
  let currentTimer = null;
  let currentChild = null;
  let currentState = null;

  async function stopCurrent() {
    const previousState = currentState ?? (await processController.readState());

    if (currentTimer !== null) {
      processController.cancel(currentTimer);
      currentTimer = null;
    }
    if (previousState?.pid) {
      await processController.killProcess(previousState.pid, "SIGTERM");
    }
    if (currentChild) {
      try {
        currentChild.kill("SIGTERM");
      } catch {
        // ignore
      }
      currentChild = null;
    }
    currentState = null;
    await processController.removeState();
  }

  async function start(streamUrl, options = {}) {
    await stopCurrent();

    const child = processController.spawnImpl("ffplay", buildFfplayArgs(streamUrl, options), {
      stdio: "inherit",
    });
    currentChild = child;
    currentState = { pid: child.pid ?? null, streamUrl };
    await processController.writeState(currentState);

    if (options.seconds > 0) {
      currentTimer = processController.schedule(() => {
        if (currentChild) {
          try {
            currentChild.kill("SIGTERM");
          } catch {
            // ignore
          }
        }
      }, options.seconds * 1000);
    }

    child.on?.("exit", () => {
      if (currentChild === child) {
        currentChild = null;
      }
      if (currentTimer !== null) {
        processController.cancel(currentTimer);
        currentTimer = null;
      }
    });

    return {
      stop: stopCurrent,
    };
  }

  return { start, stop: stopCurrent };
}

export async function fetchRadioCnStations(fetchImpl = fetch) {
  const response = await fetchImpl(RADIO_CN_LIST_URL, {
    headers: {
      "user-agent": "Mozilla/5.0 ESP32-Punk-Radio-Test/1.0",
      accept: "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`radio.cn HTTP ${response.status}`);
  }

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];
  return data.filter((station) => chooseRadioCnStream(station));
}

export function selectStation(stations, selector) {
  if (stations.length === 0) {
    throw new Error("radio.cn returned no playable stations");
  }

  if (!selector) {
    return stations[0];
  }

  const byId = stations.find((station) => station.contentId === selector);
  if (byId) {
    return byId;
  }

  const number = Number(selector);
  if (Number.isInteger(number) && number >= 1 && number <= stations.length) {
    return stations[number - 1];
  }

  const keyword = selector.toLowerCase();
  const byName = stations.find((station) => String(station.title ?? "").toLowerCase().includes(keyword));
  if (byName) {
    return byName;
  }

  throw new Error(`station not found: ${selector}`);
}

function parseArgs(argv) {
  const options = {
    seconds: 0,
    volume: 70,
    list: false,
    printUrl: false,
    selector: "",
  };

  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i];
    if (arg === "--list") {
      options.list = true;
    } else if (arg === "--url") {
      options.printUrl = true;
    } else if (arg === "--station") {
      options.selector = argv[++i] ?? "";
    } else if (arg === "--seconds") {
      options.seconds = Number(argv[++i] ?? 0);
    } else if (arg === "--volume") {
      options.volume = Number(argv[++i] ?? 70);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (!options.selector) {
      options.selector = arg;
    }
  }

  return options;
}

function printHelp() {
  console.log(`radio.cn live source tester

Usage:
  node tools/radio_cn_live.mjs --list
  node tools/radio_cn_live.mjs --station 1 --seconds 20
  node tools/radio_cn_live.mjs --station 639 --url

Options:
  --list             Show playable stations from radio.cn
  --station VALUE    Station number, contentId, or title keyword
  --seconds N        Stop playback after N seconds. 0 means keep playing
  --volume N         ffplay volume, default 70
  --url              Print the selected m3u8 URL and do not play
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const stations = await fetchRadioCnStations();

  if (options.list) {
    stations.slice(0, 40).forEach((station, index) => {
      console.log(`${stationLabel(station, index)} -> ${chooseRadioCnStream(station)}`);
    });
    return;
  }

  const selected = selectStation(stations, options.selector);
  const streamUrl = chooseRadioCnStream(selected);
  console.log(`Selected: ${selected.title} [${selected.contentId}]`);
  console.log(streamUrl);

  if (options.printUrl) {
    return;
  }

  const player = createRadioCnPlayer();
  const session = await player.start(streamUrl, options);

  process.once("SIGINT", async () => {
    await session.stop();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
