# ESP32 Punk Radio Firmware

First firmware skeleton for the OLED + encoder + stereo MAX98357A radio.

## Pins

| Function | ESP32 GPIO |
| --- | ---: |
| OLED SDA | 21 |
| OLED SCL | 22 |
| I2S BCLK | 27 |
| I2S LRC / WS | 26 |
| I2S DIN | 25 |
| Encoder A | 32 |
| Encoder B | 33 |
| Encoder SW | 13 |

## Wi-Fi

Create `firmware/include/secrets.h`:

```cpp
#pragma once

#define WIFI_SSID "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"
```

## Build

```bash
pio run -e esp32-wrover-radio
```

Upload and monitor:

```bash
pio run -e esp32-wrover-radio -t upload
pio device monitor -b 115200
```

## Wokwi Simulation

The Wokwi target is closer to firmware simulation than the browser mock: it runs
ESP32 Arduino code with a simulated SSD1306 OLED and KY-040 rotary encoder.

```bash
pio run -e esp32-wokwi-sim
```

VS Code steps:

1. Open `/Users/ikuai/xxqg` as the workspace folder.
2. Build the simulation firmware:
   `pio run -e esp32-wokwi-sim`
3. Open `diagram.json`.
4. Run `Wokwi: Start Simulator` from the Command Palette, or click the Wokwi
   play button if it appears.
5. In the simulated KY-040 encoder, rotate to change station/volume. Press the
   encoder button briefly to play/toggle BT connection. Hold it for about one
   second to switch NET/BT mode.

This target intentionally stubs radio.cn networking, Bluetooth A2DP, and I2S
audio. It validates the OLED and encoder interaction loop, not real HTTPS/HLS or
Bluetooth audio behavior.

The project pins `ESP32-audioI2S` to tag `3.0.0` because newer 3.4.x releases
need newer ESP32 Arduino/C++ headers than the current PlatformIO ESP32 Arduino
2.x toolchain provides.

The app uses the `huge_app.csv` partition table. A 4MB ESP32-WROVER module is
enough for this build, but OTA space is traded away for the larger firmware
image.

## Behavior

- Fetches radio.cn stations from `https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0`
- Chooses stream URL using the same priority as the radio.cn page:
  `playUrlMulti`, `mp3PlayUrlLow`, `mp3PlayUrlHigh`, `playUrlLow`
- Converts `http:` streams to `https:`
- Net mode: rotating the encoder selects a station
- Bluetooth mode: rotating the encoder changes Bluetooth sink volume
- Short-pressing the encoder starts the selected radio station
- Long-pressing the encoder switches between network radio and Bluetooth speaker mode
- Bluetooth device name: `PunkRadio-BT`
- Network radio uses I2S port 0; Bluetooth sink uses I2S port 1. Both are wired
  to the same MAX98357A pins, but only one mode is active at a time.

## Current Limits

- The first version keeps station parsing simple and fetches the full JSON response into memory.
- Most radio.cn streams are HLS `m3u8` with AAC in TS segments, so playback depends on the audio library handling that combination on your ESP32 build.
