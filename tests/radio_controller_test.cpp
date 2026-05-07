#include <cassert>
#include <iostream>

#include "radio_controller.h"

int main() {
  assert(wrapStationIndex(0, -1, 4) == 3);
  assert(wrapStationIndex(3, 1, 4) == 0);
  assert(wrapStationIndex(2, 0, 0) == 0);

  assert(clampRadioVolume(-1) == 0);
  assert(clampRadioVolume(8) == 8);
  assert(clampRadioVolume(22) == 21);

  assert(!isLongPress(899));
  assert(isLongPress(900));
  assert(shouldRestartPlaybackAfterStationChange(RadioMode::InternetRadio, true));
  assert(!shouldRestartPlaybackAfterStationChange(RadioMode::InternetRadio, false));
  assert(!shouldRestartPlaybackAfterStationChange(RadioMode::BluetoothSpeaker, true));

  RadioController controller;
  controller.selectedStation = 1;
  rotateRadioController(controller, 1, 3);
  assert(controller.selectedStation == 2);
  assert(controller.volume == 8);

  toggleRadioMode(controller);
  assert(controller.mode == RadioMode::BluetoothSpeaker);
  rotateRadioController(controller, 4, 3);
  assert(controller.selectedStation == 2);
  assert(controller.volume == 12);

  toggleRadioMode(controller);
  assert(controller.mode == RadioMode::InternetRadio);

  std::cout << "radio_controller tests passed\n";
}
