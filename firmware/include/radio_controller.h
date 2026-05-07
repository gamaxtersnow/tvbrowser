#pragma once

enum class RadioMode {
  InternetRadio,
  BluetoothSpeaker,
};

struct RadioController {
  RadioMode mode = RadioMode::InternetRadio;
  int selectedStation = 0;
  int volume = 8;
};

int wrapStationIndex(int selectedStation, int delta, int stationCount);
int clampRadioVolume(int volume);
bool isLongPress(unsigned long pressDurationMs);
bool shouldRestartPlaybackAfterStationChange(RadioMode mode, bool isPlaying);
void rotateRadioController(RadioController& controller, int delta, int stationCount);
RadioMode toggleRadioMode(RadioController& controller);
