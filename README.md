# 24Client Bridge

24Client Bridge is a small background app that connects 24Client to Discord. It shows your current flight as a Discord status and lets you automatically switch voice channels when you change frequencies.

---

## Installation

### Windows

1. Download the latest installer from the [Releases](../../releases) tab
2. Run the installer and follow the steps. You may select for the app to run on startup if you wish.
3. Launch the app from your Start Menu or Desktop shortcut (if selected)

That's it. The app runs in the background. You should look for its icon in your system tray.

### macOS

1. Download the latest `24Client Bridge_v*_macos-arm64.zip` (Apple Silicon) or `..._macos-x64.zip` (Intel) from the [Releases](../../releases) tab
2. Unzip it and move `24client-bridge-mac-arm64` (or `-x64`) somewhere convenient, e.g. `/Applications`
3. **IMPORTANT: As the binary isn't code signed (it costs $99 a year), the first launch you to follow [this](https://support.apple.com/en-us/guide/mac-help/mh40616/mac) guide from Apple to bypass macOS Gatekeeper's warning.**

4. Look for its icon in the menu bar

There is no installer for macOS as the app is a single executable you run directly. You may drag this into your applications folder for quick access.

---

## Setup

### Discord Status (Flight Activity)

This works automatically. Once the bridge is running and Discord is open, your flight info will appear in your Discord status.

### Voice Channel Switching

To enable automatic voice channel switching, you need to create a free Discord app and link it to the bridge. This is a one-time setup.

**Step 1 — Create a Discord application**

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) and log in
2. Click **New Application**, give it any name, and click **Create**
3. On the left sidebar, click **OAuth2**
4. Under **Redirects**, click **Add Redirect** and paste: `http://localhost:57331/callback`
5. Click **Save Changes**
6. Copy your **Client ID** and **Client Secret** from the same page

**Step 2 — Enter your credentials in 24Client**

Open 24Client and enter the Client ID and Client Secret in the bridge settings. The app saves these automatically — you only need to do this once.

**Step 3 — Authorize**

A Discord prompt will pop up asking you to allow voice permissions. Click **Authorize**. Voice channel switching is now active.

---

## The Publisher Certificate (Optional)

During installation on Windows, you may be asked if you want to trust the Zed's Software publisher certificate. This is completely optional and the app works fine without it.

If you accept, Windows will recognize Zed's Software as a verified publisher, so future UAC prompts will show the company name instead of "Unknown Publisher." You can remove it at any time through Windows Certificate Manager.

---

## Troubleshooting

**The app isn't showing my flight status on Discord**
- Make sure Discord is open and running
- Make sure 24Client Bridge is running (check your system tray)

**Voice channel switching isn't working**
- Double-check that you completed the Discord app setup above
- Make sure you're connected to the ATC24 Discord server

---

## Support

Need help? Join the [Zed Software Discord](https://discord.com/invite/EHxWfKEbrq).

---

## Contributing

Not currently accepting pull requests.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE)

## Credits

Created by Zedruc and awdev for 24Client flight simulation integration.
