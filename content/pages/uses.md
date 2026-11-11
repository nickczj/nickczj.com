---
title: Uses
description: Hardware, OS, terminal, editor, and the rest of my working setup.
updated: 2026-11-11
---

A running list of the hardware and software I actually use day to day. Updated when something changes, not on a schedule. Inspired by [uses.tech](https://uses.tech/).

## Hardware

- **Primary machine:** Mac mini (M4 Pro, 14-core CPU, 64 GB unified memory, 1 TB SSD). Small, quiet, and enough headroom for Docker, editors, and too many browser tabs.
- **Display:** LG ultrawide, 3440 × 1440 at 60 Hz.
- **Keyboard and pointer:** Apple Magic Keyboard and Magic Trackpad 2.
- **Headphones:** AirPods Pro for calls and focus; AirPods Max when I want to disappear.
- **Homelab:** a UGREEN NAS runs the heavier Docker services, a Raspberry Pi 5 handles the lighter ones, and a Home Assistant Yellow runs the smart home. Details in [the homelab write-up](/projects/homelab).

## OS and shell

- **OS:** macOS 27.0.1.
- **Terminal:** iTerm2.
- **Shell:** zsh with Oh My Zsh and the `sonicradish` theme.
- **Node versions:** nvm, loaded from `~/.zshrc`.

## Editor

- **Primary:** VS Code. Extensions for Go, Vue/Volar, PlatformIO, remote SSH, and Claude Code do most of the work.
- **Secondary:** none, really. Quick edits happen in VS Code or the terminal.

## Languages and runtimes

- **Node:** managed with nvm; currently 24.15.0.
- **Bun:** 1.4.4, used for this site and newer JS/TS tooling.
- **Go:** 1.26.0 from the official installer.
- **Python:** uv for project environments.
- **Package managers:** Homebrew for system tools, pnpm and npm for JavaScript, and Docker for self-hosted services and Rust builds.

## Dotfiles

My dotfiles live at [github.com/nickczj/dotfiles](https://github.com/nickczj/dotfiles) — zsh, git, and tool configuration.
