# Radio.cn ESP32 Firmware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first PlatformIO firmware skeleton for an ESP32-WROVER network radio that fetches radio.cn station streams, shows state on OLED, reads an EC11 encoder, and plays HLS/AAC over I2S.

**Architecture:** Keep radio.cn stream selection in a small portable C++ core with host tests. Keep ESP32-specific Wi-Fi, HTTP, OLED, encoder, and I2S audio code in `firmware/src/main.cpp` so hardware integration stays obvious while the error-prone source-selection rules remain testable.

**Tech Stack:** PlatformIO, Arduino framework for ESP32, ESP32-audioI2S, ArduinoJson, U8g2, RotaryEncoder, g++ host tests.

---

### Task 1: Portable radio.cn stream rules

**Files:**
- Create: `firmware/include/radio_cn_core.h`
- Create: `firmware/src/radio_cn_core.cpp`
- Test: `tests/radio_cn_core_test.cpp`

- [x] **Step 1: Write the failing test**

```cpp
#include <cassert>
#include <iostream>
#include "radio_cn_core.h"

int main() {
  RadioCnStation station;
  station.playUrlLow = "http://low.example/live.m3u8";
  station.mp3PlayUrlLow = "http://mp3-low.example/live.m3u8";
  station.mp3PlayUrlHigh = "http://mp3-high.example/live.m3u8";
  station.playUrlMulti = "http://multi.example/live.m3u8";

  assert(chooseRadioCnStream(station) == "https://multi.example/live.m3u8");

  station.playUrlMulti = "";
  assert(chooseRadioCnStream(station) == "https://mp3-low.example/live.m3u8");

  station.mp3PlayUrlLow = "";
  assert(chooseRadioCnStream(station) == "https://mp3-high.example/live.m3u8");

  station.mp3PlayUrlHigh = "";
  assert(chooseRadioCnStream(station) == "https://low.example/live.m3u8");

  station.playUrlLow = "";
  assert(chooseRadioCnStream(station).empty());

  assert(normalizeRadioCnStreamUrl("http://ytcast.radio.cn:8555/110/live.m3u8") ==
         "https://ytcast.radio.cn:8556/110/live.m3u8");

  std::cout << "radio_cn_core tests passed\n";
}
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
g++ -std=c++17 -Ifirmware/include tests/radio_cn_core_test.cpp firmware/src/radio_cn_core.cpp -o /tmp/radio_cn_core_test && /tmp/radio_cn_core_test
```

Expected: FAIL because `radio_cn_core.h` and functions do not exist yet.

- [x] **Step 3: Write minimal implementation**

Create `RadioCnStation`, `normalizeRadioCnStreamUrl`, and `chooseRadioCnStream`.

- [x] **Step 4: Run test to verify it passes**

Run the same `g++` command.

Expected: PASS and prints `radio_cn_core tests passed`.

### Task 2: PlatformIO firmware skeleton

**Files:**
- Create: `platformio.ini`
- Create: `firmware/src/main.cpp`
- Create: `firmware/include/secrets.example.h`

- [x] **Step 1: Add PlatformIO environment**

Use `esp32dev` with PSRAM build flags and library dependencies:

```ini
[env:esp32-wrover-radio]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
build_src_filter = +<*> -<../test/*>
build_flags =
  -DBOARD_HAS_PSRAM
  -mfix-esp32-psram-cache-issue
lib_deps =
  https://github.com/schreibfaul1/ESP32-audioI2S.git
  bblanchon/ArduinoJson
  olikraus/U8g2
  mathertel/RotaryEncoder
```

- [x] **Step 2: Add credentials example**

Create `firmware/include/secrets.example.h` with `WIFI_SSID` and `WIFI_PASSWORD`.

- [x] **Step 3: Add firmware main**

Implement:

- Wi-Fi connect
- HTTP GET `https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0`
- ArduinoJson parse into a fixed-size station array
- OLED status rendering
- encoder rotation for station index
- press to play selected station
- ESP32-audioI2S configured for BCLK 27, LRC 26, DIN 25

### Task 3: Verification

**Files:**
- Read: `docs/radio-cn-live-source-analysis.md`
- Read: `platformio.ini`
- Read: `firmware/src/main.cpp`

- [x] **Step 1: Run host test**

```bash
g++ -std=c++17 -Ifirmware/include tests/radio_cn_core_test.cpp firmware/src/radio_cn_core.cpp -o /tmp/radio_cn_core_test && /tmp/radio_cn_core_test
```

Expected: PASS.

- [x] **Step 2: Check firmware syntax if PlatformIO is installed**

```bash
pio run -e esp32-wrover-radio
```

Expected: PASS when PlatformIO and ESP32 packages are installed.

- [x] **Step 3: If PlatformIO is missing**

Report that host tests passed but firmware compile was not run locally because `pio` is not installed.

Resolved by installing PlatformIO into a temporary venv at `/tmp/xxqg-pio-venv`
and running the firmware build from there.

### Follow-up completed: Bluetooth speaker mode

**Files:**
- Create: `firmware/include/radio_controller.h`
- Create: `firmware/src/radio_controller.cpp`
- Test: `tests/radio_controller_test.cpp`
- Update: `firmware/src/main.cpp`
- Update: `platformio.ini`
- Update: `firmware/README.md`

- [x] Add portable mode/encoder state rules with host tests.
- [x] Add `ESP32-A2DP` sink dependency.
- [x] Use `I2S_NUM_0` for network radio and `I2S_NUM_1` for Bluetooth sink so the two audio stacks do not fight over one I2S driver.
- [x] Long press encoder switches between network radio and Bluetooth speaker mode.
- [x] Short press starts selected network station.
- [x] Rotate in network mode selects station; rotate in Bluetooth mode changes Bluetooth volume.
- [x] Switch to `huge_app.csv` partition because network HLS/AAC plus Bluetooth A2DP exceeds the default app partition.
