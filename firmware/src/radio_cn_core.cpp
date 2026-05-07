#include "radio_cn_core.h"

namespace {
void replaceFirst(std::string& value, const std::string& from, const std::string& to) {
  const auto pos = value.find(from);
  if (pos != std::string::npos) {
    value.replace(pos, from.size(), to);
  }
}
}

std::string normalizeRadioCnStreamUrl(std::string url) {
  replaceFirst(url, ".radio.cn:8555", ".radio.cn:8556");

  if (url.rfind("http:", 0) == 0) {
    url.replace(0, 5, "https:");
  }

  return url;
}

std::string chooseRadioCnStream(const RadioCnStation& station) {
  if (!station.playUrlMulti.empty()) {
    return normalizeRadioCnStreamUrl(station.playUrlMulti);
  }
  if (!station.mp3PlayUrlLow.empty()) {
    return normalizeRadioCnStreamUrl(station.mp3PlayUrlLow);
  }
  if (!station.mp3PlayUrlHigh.empty()) {
    return normalizeRadioCnStreamUrl(station.mp3PlayUrlHigh);
  }
  if (!station.playUrlLow.empty()) {
    return normalizeRadioCnStreamUrl(station.playUrlLow);
  }

  return "";
}
