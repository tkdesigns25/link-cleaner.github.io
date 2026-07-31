# Link-Cleanser

> Strip tracking parameters from URLs instantly. Built for privacy.

## About

Link-Cleanser removes invasive tracking identifiers from links before you share them.

We've all seen them — long URLs filled with `?fbclid=`, `?utm_source=`, and similar noise. These parameters track your activity across the web. Link-Cleanser surgically removes them while keeping the destination intact.

Inspired by the article *"You are sharing URLs with Tracking Links. Please stop"* by Ian Darwin.

## Features

- **Instant cleaning** — Paste a dirty link, get a clean one immediately
- **Privacy first** — Removes `fbclid`, `gclid`, `utm_*`, `si`, `igsh`, and other common trackers
- **Android share intent** — Share any link directly to Link-Cleanser from any app
- **Dark / Light mode** — Toggle to your preference, persisted across sessions
- **Lightweight** — No frameworks, pure HTML/CSS/JS

## Tracking parameters removed

| Source | Parameters |
|---|---|
| Google Analytics | `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` |
| Google Ads | `gclid`, `gclsrc`, `dclid` |
| Facebook | `fbclid` |
| YouTube | `si` |
| Instagram | `igsh` |
| Other | `pp` |

## Usage

1. Copy a link with tracking parameters (e.g. `example.com?fbclid=123xyz...`)
2. Paste it into the input box
3. Click **Clean Link**
4. Copy, Share or Open your clean URL

**Or on Android:** tap Share on any link → select Link-Cleanser → link auto-fills → clean it.

## Links

- [Web app](https://link-cleanser.vercel.app)
- [GitHub Pages](https://tkdesigns25.github.io/link-cleaner.github.io/)

## License

ISC
