# radio.cn 直播源分析

分析时间：2026-05-07

入口页：

- `https://www.radio.cn/pc-portal/erji/radioStation.html`

## 结论

radio.cn 的直播源不是写死在页面里，而是由页面调用接口动态返回。
固件不要硬编码某个 `m3u8` URL，因为返回的播放地址带 `key` 和 `time` 参数，`time` 是接口调用时的 Unix 秒时间，说明播放地址是动态签名地址。

固件应在开机、换台、播放失败时重新请求电台列表接口，取最新的播放 URL。

## 核心接口

电台列表：

```text
GET https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0
```

常用筛选：

```text
GET https://ytmsout.radio.cn/web/appProvince/list/all
GET https://ytmsout.radio.cn/web/appCategory/list/all
GET https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=<categoryId>&provinceCode=<provinceCode>
```

页面 JS 里虽然定义了签名头，但实测 `appBroadcast/list` 不带签名也能返回数据。为了更接近网页客户端，固件可以先不做签名；如果后续接口变严，再补签名。

## 返回字段

`/web/appBroadcast/list` 返回：

```json
{
  "code": 0,
  "message": "SUCCESS",
  "data": [
    {
      "contentId": "639",
      "title": "中国之声",
      "subtitle": "正在直播：新闻进行时 ",
      "image": "...",
      "playUrlLow": "...m3u8?...",
      "mp3PlayUrlLow": "...m3u8?...",
      "mp3PlayUrlHigh": "...m3u8?...",
      "playUrlMulti": "...m3u8?..."
    }
  ]
}
```

页面选源优先级：

```text
playUrlMulti
mp3PlayUrlLow
mp3PlayUrlHigh
playUrlLow
```

页面播放前会把 `http:` 改成 `https:`。固件也建议这样做。

## 已验证样例

示例接口返回的“中国之声”：

```text
contentId: 639
title: 中国之声
source: https://ytcast2.radio.cn/110/radios/40639/index_40639.m3u8?... 
```

`m3u8` 内容形态：

```text
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:...
#EXTINF:10.008778,
segment20260507031203-00003738.ts
```

分片格式：

```text
container: MPEG-TS
audio: AAC LC
sample_rate: 44100
channels: stereo
bitrate: about 196 kbps
```

## 固件实现建议

1. 用 HTTPS GET 请求 `https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=0`。
2. 解析 JSON 的 `data` 数组。
3. 每个电台保存：
   - `contentId`
   - `title`
   - `subtitle`
   - `playUrlMulti` 或 fallback URL
4. 播放前把 URL 的 `http:` 替换成 `https:`。
5. 把 URL 交给音频库播放。
6. 播放失败或切台时重新拉接口，避免签名 URL 过期。

## ESP32 注意点

这些源大多是 HLS `m3u8`，分片是 AAC in TS，不是简单裸 MP3 流。

固件库选择要确认支持：

- HTTPS
- HLS / m3u8
- AAC
- MPEG-TS 分片

如果所选库不稳定，备选方案是：

- 优先试 `playUrlMulti`
- 再试 `mp3PlayUrlHigh`
- 再试 `mp3PlayUrlLow`
- 最后试 `playUrlLow`

## 网页端依据

页面引用：

- `/pc-portal/js/api.js?062`
- `/pc-portal/js/bofang.js?0612`

关键逻辑：

- `api.js` 定义 `getRadioList -> /web/appBroadcast/list`
- `radioStation.html` 中 `getRadioList()` 使用 `playUrlMulti || mp3PlayUrlLow || mp3PlayUrlHigh || playUrlLow`
- `bofang.js` 中 `handleUrl()` 把 `http:` 转为 `https:`
