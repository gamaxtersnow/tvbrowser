#include "radio_controller.h"

namespace {
constexpr int kMinVolume = 0;
constexpr int kMaxVolume = 21;
constexpr unsigned long kLongPressMs = 900;
}

int wrapStationIndex(int selectedStation, int delta, int stationCount) {
  if (stationCount <= 0) {
    return 0;
  }

  int next = (selectedStation + delta) % stationCount;
  if (next < 0) {
    next += stationCount;
  }
  return next;
}

int clampRadioVolume(int volume) {
  if (volume < kMinVolume) {
    return kMinVolume;
  }
  if (volume > kMaxVolume) {
    return kMaxVolume;
  }
  return volume;
}

bool isLongPress(unsigned long pressDurationMs) {
  return pressDurationMs >= kLongPressMs;
}

bool shouldRestartPlaybackAfterStationChange(RadioMode mode, bool isPlaying) {
  return mode == RadioMode::InternetRadio && isPlaying;
}

void rotateRadioController(RadioController& controller, int delta, int stationCount) {
  if (controller.mode == RadioMode::BluetoothSpeaker) {
    controller.volume = clampRadioVolume(controller.volume + delta);
    return;
  }

  controller.selectedStation = wrapStationIndex(controller.selectedStation, delta, stationCount);
}

RadioMode toggleRadioMode(RadioController& controller) {
  controller.mode = controller.mode == RadioMode::InternetRadio
                        ? RadioMode::BluetoothSpeaker
                        : RadioMode::InternetRadio;
  return controller.mode;
}
