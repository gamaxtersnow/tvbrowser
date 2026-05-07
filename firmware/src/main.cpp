#include <Arduino.h>
#include <ArduinoJson.h>
#include <BluetoothA2DPSink.h>
#include <HTTPClient.h>
#include <RotaryEncoder.h>
#include <U8g2lib.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "Audio.h"
#include "radio_controller.h"
#include "radio_cn_core.h"

#if __has_include("secrets.h")
#include "secrets.h"
#else
#define WIFI_SSID ""
#define WIFI_PASSWORD ""
#endif

namespace {
constexpr int kI2sBclkPin = 27;
constexpr int kI2sLrcPin = 26;
constexpr int kI2sDoutPin = 25;

constexpr int kEncoderAPin = 32;
constexpr int kEncoderBPin = 33;
constexpr int kEncoderSwitchPin = 13;

constexpr int kMaxStations = 24;
constexpr const char* kBluetoothName = "PunkRadio-BT";
constexpr const char* kRadioCnListUrl =
    "https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0";

Audio audio(false, 3, I2S_NUM_0);
BluetoothA2DPSink bluetoothSink;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);
RotaryEncoder encoder(kEncoderAPin, kEncoderBPin, RotaryEncoder::LatchMode::FOUR3);

RadioCnStation stations[kMaxStations];
RadioController controller;
int stationCount = 0;
int lastEncoderPosition = 0;
bool isPlaying = false;
bool bluetoothStarted = false;
String statusLine = "BOOT";

const char* modeLabel() {
  return controller.mode == RadioMode::InternetRadio ? "NET" : "BT";
}

uint8_t bluetoothVolume() {
  return static_cast<uint8_t>((controller.volume * 127 + 10) / 21);
}

void drawStatus() {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(0, 10, "PUNK RADIO");

  display.setCursor(0, 26);
  display.print("MODE:");
  display.print(modeLabel());

  display.setCursor(74, 26);
  display.print("VOL:");
  display.print(controller.volume);

  display.setCursor(0, 42);
  if (controller.mode == RadioMode::BluetoothSpeaker) {
    display.print("Pair ");
    display.print(kBluetoothName);
  } else if (stationCount > 0) {
    display.print(controller.selectedStation + 1);
    display.print("/");
    display.print(stationCount);
    display.print(" ");
    display.print(stations[controller.selectedStation].title.c_str());
  } else {
    display.print("No stations");
  }

  display.setCursor(0, 60);
  display.print(statusLine);
  display.sendBuffer();
}

void connectWiFi() {
  statusLine = "WiFi connecting";
  drawStatus();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(250);
    Serial.print(".");
    drawStatus();
  }

  statusLine = WiFi.status() == WL_CONNECTED ? "WiFi connected" : "WiFi failed";
  Serial.println();
  Serial.println(statusLine);
  drawStatus();
}

bool fetchStationList() {
  if (WiFi.status() != WL_CONNECTED) {
    statusLine = "No WiFi";
    return false;
  }

  statusLine = "Fetching list";
  drawStatus();

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, kRadioCnListUrl)) {
    statusLine = "HTTP begin fail";
    return false;
  }

  const int code = http.GET();
  if (code != HTTP_CODE_OK) {
    statusLine = "HTTP " + String(code);
    http.end();
    return false;
  }

  const String payload = http.getString();
  http.end();

  JsonDocument doc;
  const DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    statusLine = "JSON failed";
    Serial.println(error.c_str());
    return false;
  }

  JsonArray data = doc["data"].as<JsonArray>();
  stationCount = 0;
  for (JsonObject item : data) {
    if (stationCount >= kMaxStations) {
      break;
    }

    RadioCnStation& station = stations[stationCount];
    station.contentId = item["contentId"] | "";
    station.title = item["title"] | "";
    station.subtitle = item["subtitle"] | "";
    station.playUrlLow = item["playUrlLow"] | "";
    station.mp3PlayUrlLow = item["mp3PlayUrlLow"] | "";
    station.mp3PlayUrlHigh = item["mp3PlayUrlHigh"] | "";
    station.playUrlMulti = item["playUrlMulti"] | "";

    if (!chooseRadioCnStream(station).empty()) {
      stationCount++;
    }
  }

  if (controller.selectedStation >= stationCount) {
    controller.selectedStation = 0;
  }

  statusLine = stationCount > 0 ? "List ready" : "No streams";
  drawStatus();
  return stationCount > 0;
}

void playSelectedStation() {
  if (controller.mode != RadioMode::InternetRadio) {
    return;
  }

  if (stationCount == 0) {
    if (!fetchStationList()) {
      drawStatus();
      return;
    }
  }

  const std::string streamUrl = chooseRadioCnStream(stations[controller.selectedStation]);
  if (streamUrl.empty()) {
    statusLine = "No URL";
    drawStatus();
    return;
  }

  statusLine = "Playing";
  drawStatus();
  Serial.print("Playing ");
  Serial.print(stations[controller.selectedStation].title.c_str());
  Serial.print(": ");
  Serial.println(streamUrl.c_str());

  audio.stopSong();
  audio.connecttohost(streamUrl.c_str());
  isPlaying = true;
}

void startBluetoothMode() {
  audio.stopSong();
  isPlaying = false;

  if (!bluetoothStarted) {
    i2s_pin_config_t pinConfig = {
        .mck_io_num = I2S_PIN_NO_CHANGE,
        .bck_io_num = kI2sBclkPin,
        .ws_io_num = kI2sLrcPin,
        .data_out_num = kI2sDoutPin,
        .data_in_num = I2S_PIN_NO_CHANGE,
    };
    bluetoothSink.set_i2s_port(I2S_NUM_1);
    bluetoothSink.set_pin_config(pinConfig);
    bluetoothSink.set_auto_reconnect(true, 5);
    bluetoothSink.start(kBluetoothName);
    bluetoothStarted = true;
  }

  bluetoothSink.set_volume(bluetoothVolume());
  statusLine = "BT pairing";
  drawStatus();
}

void startInternetRadioMode() {
  if (bluetoothStarted) {
    bluetoothSink.end(false);
    bluetoothStarted = false;
  }

  audio.setPinout(kI2sBclkPin, kI2sLrcPin, kI2sDoutPin);
  audio.setVolume(controller.volume);
  statusLine = WiFi.isConnected() ? "Net mode" : "No WiFi";
  drawStatus();
}

void switchMode() {
  toggleRadioMode(controller);
  if (controller.mode == RadioMode::BluetoothSpeaker) {
    startBluetoothMode();
  } else {
    startInternetRadioMode();
  }
}

void handleEncoder() {
  encoder.tick();
  const int position = encoder.getPosition();
  if (position != lastEncoderPosition) {
    const int delta = position - lastEncoderPosition;
    lastEncoderPosition = position;

    const bool restartPlayback =
        shouldRestartPlaybackAfterStationChange(controller.mode, isPlaying);
    rotateRadioController(controller, delta, stationCount);
    if (controller.mode == RadioMode::BluetoothSpeaker) {
      if (bluetoothStarted) {
        bluetoothSink.set_volume(bluetoothVolume());
      }
      statusLine = "BT volume";
    } else if (restartPlayback) {
      audio.setVolume(controller.volume);
      playSelectedStation();
      return;
    } else {
      statusLine = "Select station";
    }
    audio.setVolume(controller.volume);
    drawStatus();
  }

  static bool lastPressed = false;
  static unsigned long pressedAt = 0;
  const bool pressed = digitalRead(kEncoderSwitchPin) == LOW;
  if (pressed && !lastPressed) {
    pressedAt = millis();
  }
  if (!pressed && lastPressed) {
    const unsigned long pressDuration = millis() - pressedAt;
    if (isLongPress(pressDuration)) {
      switchMode();
    } else {
      playSelectedStation();
    }
  }
  lastPressed = pressed;
}

}

void audio_info(const char* info) {
  Serial.print("audio: ");
  Serial.println(info);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(kEncoderSwitchPin, INPUT_PULLUP);

  display.begin();
  drawStatus();

  audio.setPinout(kI2sBclkPin, kI2sLrcPin, kI2sDoutPin);
  audio.setVolume(controller.volume);

  connectWiFi();
  fetchStationList();
}

void loop() {
  handleEncoder();
  audio.loop();
}
