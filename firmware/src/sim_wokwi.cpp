#include <Arduino.h>
#include <RotaryEncoder.h>
#include <U8g2lib.h>
#include <Wire.h>

#include "radio_controller.h"

namespace {
constexpr int kOledSdaPin = 21;
constexpr int kOledSclPin = 22;
constexpr int kEncoderAPin = 32;
constexpr int kEncoderBPin = 33;
constexpr int kEncoderSwitchPin = 13;
constexpr int kPrevButtonPin = 25;
constexpr int kNextButtonPin = 26;
constexpr int kPlayButtonPin = 27;
constexpr int kModeButtonPin = 14;
constexpr int kNetLedPin = 18;
constexpr int kBtLedPin = 19;
constexpr int kPlayLedPin = 23;
constexpr int kStationCount = 6;

struct SimStation {
  const char* title;
  const char* subtitle;
};

const SimStation stations[kStationCount] = {
    {"China Voice", "News live"},
    {"Econ Radio", "Finance"},
    {"Music Radio", "Pop live"},
    {"Classic FM", "Night vinyl"},
    {"CRI News", "World info"},
    {"Traffic FM", "Road live"},
};

U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);
RotaryEncoder encoder(kEncoderAPin, kEncoderBPin, RotaryEncoder::LatchMode::FOUR3);
RadioController controller;

int lastEncoderPosition = 0;
bool playing = false;
bool btConnected = false;
String statusLine = "List ready";

const char* modeLabel() {
  return controller.mode == RadioMode::InternetRadio ? "NET" : "BT";
}

bool scanForOled() {
  bool found = false;
  Serial.println("[I2C] scan start");
  for (uint8_t address = 1; address < 127; ++address) {
    Wire.beginTransmission(address);
    const uint8_t error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("[I2C] device at 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
      if (address == 0x3C || address == 0x3D) {
        found = true;
      }
    }
  }
  Serial.println(found ? "[I2C] OLED found" : "[I2C] OLED missing");
  return found;
}

void drawSplash() {
  display.clearBuffer();
  display.drawFrame(0, 0, 128, 64);
  display.setFont(u8g2_font_7x14B_tf);
  display.drawStr(10, 19, "PUNK RADIO");
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(10, 36, "OLED + buttons OK");
  display.drawStr(10, 52, "N/P/M/Space");
  display.sendBuffer();
}

void drawStatus() {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(0, 10, "PUNK RADIO SIM");

  display.setCursor(0, 25);
  display.print("MODE:");
  display.print(modeLabel());
  display.setCursor(74, 25);
  display.print("VOL:");
  display.print(controller.volume);

  display.setCursor(0, 42);
  if (controller.mode == RadioMode::BluetoothSpeaker) {
    display.print("Pair PunkRadio-BT");
  } else {
    display.print(controller.selectedStation + 1);
    display.print("/");
    display.print(kStationCount);
    display.print(" ");
    display.print(stations[controller.selectedStation].title);
  }

  display.setCursor(0, 56);
  if (controller.mode == RadioMode::BluetoothSpeaker) {
    display.print(btConnected ? "BT connected" : "BT pairing");
  } else if (playing) {
    display.print("Playing ");
    display.print(stations[controller.selectedStation].subtitle);
  } else {
    display.print(statusLine);
  }

  display.sendBuffer();
}

void updateIndicators() {
  digitalWrite(kNetLedPin, controller.mode == RadioMode::InternetRadio ? HIGH : LOW);
  digitalWrite(kBtLedPin, controller.mode == RadioMode::BluetoothSpeaker ? HIGH : LOW);
  digitalWrite(kPlayLedPin, (playing || btConnected) ? HIGH : LOW);
}

void switchMode() {
  toggleRadioMode(controller);
  playing = false;
  if (controller.mode == RadioMode::BluetoothSpeaker) {
    statusLine = "BT pairing";
    Serial.println("[MODE] NET -> BT");
    Serial.println("[BT] advertise PunkRadio-BT");
  } else {
    btConnected = false;
    statusLine = "Net mode";
    Serial.println("[MODE] BT -> NET");
  }
  drawStatus();
  updateIndicators();
}

void shortPress() {
  if (controller.mode == RadioMode::BluetoothSpeaker) {
    btConnected = !btConnected;
    Serial.println(btConnected ? "[BT] connected" : "[BT] disconnected");
  } else {
    playing = true;
    Serial.print("[AUDIO] play ");
    Serial.println(stations[controller.selectedStation].title);
  }
  drawStatus();
  updateIndicators();
}

void applyRotationDelta(int delta, const char* sourceLabel) {
  const bool restartPlayback =
      shouldRestartPlaybackAfterStationChange(controller.mode, playing);
  rotateRadioController(controller, delta, kStationCount);
  Serial.print(sourceLabel);
  if (controller.mode == RadioMode::BluetoothSpeaker) {
    Serial.print("volume ");
    Serial.println(controller.volume);
  } else {
    Serial.print("station ");
    Serial.println(controller.selectedStation + 1);
    if (restartPlayback) {
      playing = true;
      Serial.print("[AUDIO] play ");
      Serial.println(stations[controller.selectedStation].title);
    } else {
      playing = false;
      statusLine = "Select station";
    }
  }
  drawStatus();
  updateIndicators();
}

void rotateBy(int delta) {
  applyRotationDelta(delta, "[BTN] ");
}

bool buttonPressedOnce(int pin) {
  struct ButtonState {
    int pin;
    bool lastPressed;
  };

  static ButtonState states[] = {
      {kPrevButtonPin, false},
      {kNextButtonPin, false},
      {kPlayButtonPin, false},
      {kModeButtonPin, false},
  };

  for (auto& state : states) {
    if (state.pin != pin) {
      continue;
    }

    const bool pressed = digitalRead(pin) == LOW;
    const bool fired = pressed && !state.lastPressed;
    state.lastPressed = pressed;
    return fired;
  }
  return false;
}

void handleButtons() {
  if (buttonPressedOnce(kPrevButtonPin)) {
    rotateBy(-1);
  }
  if (buttonPressedOnce(kNextButtonPin)) {
    rotateBy(1);
  }
  if (buttonPressedOnce(kPlayButtonPin)) {
    shortPress();
  }
  if (buttonPressedOnce(kModeButtonPin)) {
    switchMode();
  }
}

void handleEncoder() {
  encoder.tick();
  const int position = encoder.getPosition();
  if (position != lastEncoderPosition) {
    const int delta = position - lastEncoderPosition;
    lastEncoderPosition = position;
    applyRotationDelta(delta, "[ENC] ");
  }

  static bool lastPressed = false;
  static unsigned long pressedAt = 0;
  const bool pressed = digitalRead(kEncoderSwitchPin) == LOW;
  if (pressed && !lastPressed) {
    pressedAt = millis();
  }
  if (!pressed && lastPressed) {
    const unsigned long duration = millis() - pressedAt;
    if (isLongPress(duration)) {
      switchMode();
    } else {
      shortPress();
    }
  }
  lastPressed = pressed;
}

void handleSerialCommands() {
  while (Serial.available() > 0) {
    const char command = static_cast<char>(Serial.read());
    switch (command) {
      case 'n':
      case 'N':
        Serial.println("[SERIAL] next");
        rotateBy(1);
        break;
      case 'p':
      case 'P':
        Serial.println("[SERIAL] prev");
        rotateBy(-1);
        break;
      case 'm':
      case 'M':
        Serial.println("[SERIAL] mode");
        switchMode();
        break;
      case ' ':
      case '\r':
      case '\n':
        Serial.println("[SERIAL] play");
        shortPress();
        break;
      default:
        break;
    }
  }
}
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("[BOOT] Wokwi ESP32 radio simulator");
  Serial.println("[BOOT] init pins");
  pinMode(kEncoderAPin, INPUT_PULLUP);
  pinMode(kEncoderBPin, INPUT_PULLUP);
  pinMode(kEncoderSwitchPin, INPUT_PULLUP);
  pinMode(kPrevButtonPin, INPUT_PULLUP);
  pinMode(kNextButtonPin, INPUT_PULLUP);
  pinMode(kPlayButtonPin, INPUT_PULLUP);
  pinMode(kModeButtonPin, INPUT_PULLUP);
  pinMode(kNetLedPin, OUTPUT);
  pinMode(kBtLedPin, OUTPUT);
  pinMode(kPlayLedPin, OUTPUT);
  Wire.begin(kOledSdaPin, kOledSclPin);
  Serial.println("[BOOT] init OLED 0x3c on SDA=21 SCL=22");
  scanForOled();
  display.begin();
  drawSplash();
  delay(900);
  drawStatus();
  updateIndicators();
  Serial.println("[BOOT] screen ready");
  Serial.println("[KEYS] N next, P prev, Space play, M mode");
}

void loop() {
  handleSerialCommands();
  handleButtons();
  handleEncoder();
  delay(2);
}
