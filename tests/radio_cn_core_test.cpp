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
