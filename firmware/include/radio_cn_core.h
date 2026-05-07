#pragma once

#include <string>

struct RadioCnStation {
  std::string contentId;
  std::string title;
  std::string subtitle;
  std::string playUrlLow;
  std::string mp3PlayUrlLow;
  std::string mp3PlayUrlHigh;
  std::string playUrlMulti;
};

std::string normalizeRadioCnStreamUrl(std::string url);
std::string chooseRadioCnStream(const RadioCnStation& station);
