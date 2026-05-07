export const stations = [
  { id: "639", title: "中国之声", subtitle: "新闻进行时", stream: "playUrlMulti · HLS/AAC" },
  { id: "641", title: "经济之声", subtitle: "天下财经", stream: "mp3PlayUrlLow · HLS/AAC" },
  { id: "4424", title: "音乐之声", subtitle: "流行现场", stream: "playUrlMulti · HLS/AAC" },
  { id: "4425", title: "经典音乐广播", subtitle: "夜间黑胶", stream: "mp3PlayUrlHigh · HLS/AAC" },
  { id: "6399", title: "CRI 环球资讯", subtitle: "整点播报", stream: "playUrlLow · HLS/AAC" },
  { id: "4851", title: "北京交通广播", subtitle: "路况直播", stream: "playUrlMulti · HLS/AAC" },
];

const longPressMs = 900;
const minVolume = 0;
const maxVolume = 21;

export function createState() {
  return {
    mode: "NET",
    selectedStation: 0,
    volume: 8,
    wifi: "connected",
    playing: false,
    btConnected: false,
    status: "List ready",
    log: [
      "[BOOT] ESP32-WROVER ready",
      "[WiFi] connected",
      "[radio.cn] fetched 24 stations, showing 6 in simulator",
    ],
  };
}

export function clampVolume(volume) {
  return Math.max(minVolume, Math.min(maxVolume, volume));
}

export function wrapStation(index, delta, count = stations.length) {
  if (count <= 0) return 0;
  const next = (index + delta) % count;
  return next < 0 ? next + count : next;
}

export function rotate(state, delta) {
  const next = { ...state, log: [...state.log] };
  if (next.mode === "BT") {
    next.volume = clampVolume(next.volume + delta);
    next.status = "BT volume";
    next.log.push(`[BT] volume ${toBluetoothVolume(next.volume)}/127`);
  } else {
    next.selectedStation = wrapStation(next.selectedStation, delta);
    next.status = "Select station";
    next.log.push(`[ENC] station ${next.selectedStation + 1}/${stations.length}`);
  }
  return trimLog(next);
}

export function shortPress(state) {
  const next = { ...state, log: [...state.log] };
  if (next.mode === "BT") {
    next.btConnected = !next.btConnected;
    next.status = next.btConnected ? "BT connected" : "BT pairing";
    next.log.push(next.btConnected ? "[BT] phone connected" : "[BT] phone disconnected");
  } else {
    const station = stations[next.selectedStation];
    next.playing = true;
    next.status = "Playing";
    next.log.push(`[AUDIO] ${station.title} -> ${station.stream}`);
  }
  return trimLog(next);
}

export function longPress(state) {
  const next = { ...state, log: [...state.log] };
  if (next.mode === "NET") {
    next.mode = "BT";
    next.playing = false;
    next.status = "BT pairing";
    next.log.push("[MODE] NET -> BT, stop network stream");
    next.log.push("[BT] advertise PunkRadio-BT");
  } else {
    next.mode = "NET";
    next.btConnected = false;
    next.status = "Net mode";
    next.log.push("[MODE] BT -> NET, stop A2DP sink");
  }
  return trimLog(next);
}

export function pressFor(state, durationMs) {
  return durationMs >= longPressMs ? longPress(state) : shortPress(state);
}

export function toBluetoothVolume(volume) {
  return Math.round((clampVolume(volume) * 127) / maxVolume);
}

export function currentStation(state) {
  return stations[state.selectedStation] ?? stations[0];
}

function trimLog(state) {
  if (state.log.length <= 8) return state;
  return { ...state, log: state.log.slice(-8) };
}
