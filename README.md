# 24Client Bridge

A bridge application that connects the 24Client web client to Discord RPC, enabling dynamic flight status display in Discord and voice channel switching through RPC commands.

## Features

- **Dynamic Flight Status Display**: Automatically updates your Discord activity with real-time flight information including altitude, heading, callsign, and aircraft type
- **Voice Channel Switching**: Programmatically switch Discord voice channels based on flight frequencies
- **System Tray Integration**: Runs as a background service with system tray controls
- **Status Monitoring**: Visual indicators for Discord connection status and current voice channel
- **REST API**: Exposes endpoints for controlling Discord RPC functionality

## Requirements

### Windows
- Windows 10 or later
- Discord must be running with RPC enabled

### Linux
- Node.js 18+ or Bun runtime
- pnpm or npm package manager
- Discord RPC support on your system

## Installation

### Windows (Pre-compiled Installer)

1. Download the latest installer from: https://zedruc.net/downloads/24Client%20Bridge_Setup_latest.exe
2. Run the installer and follow the installation wizard
3. The application will be installed to your Program Files directory
4. A shortcut will be created in your Start Menu
5. Run the application from the Start Menu or use the system tray icon

### Linux (Self-Compile)

1. **Clone or download the repository**
   ```bash
   git clone https://github.com/zed24software/pilot-client-bridge.git
   cd pilot-client-bridge
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the application**
   ```bash
   pnpm run build
   ```
   
   This will compile the TypeScript source code and create an executable in `dist/24client-bridge`

4. **Run the application**
   ```bash
   ./dist/24client-bridge
   ```

   Or run in development mode with auto-reload:
   ```bash
   pnpm run dev
   ```

## Configuration

The application uses two main configuration files located in the `src/` directory  
Changing these settings is not recommended nor needed and is likely to break functionality.

### `rpc-config.json`

Configure Discord RPC connection settings:
- `client_id`: Discord application ID (default: 1507887570154162385)
- `auth_server`: Local authentication server address (default: http://localhost)
- `activity_enabled`: Enable/disable automatic activity updates (default: true)

### `channels.json`

Define voice channel mappings between radio frequencies and Discord channels:
```json
{
  "position": "IRCC",
  "frequency": "124.850",
  "channelId": "1409259489580023898"
}
```

Each entry maps:
- `position`: Position name (e.g., IRCC, IRFD_TWR)
- `frequency`: Radio frequency identifier
- `channelId`: Discord voice channel ID

## Usage

Once running, the application:

1. Connects to Discord RPC on startup
2. Displays status in the system tray
3. Listens for commands from the 24Client web client on `http://127.0.0.1:57330`
4. Updates Discord activity every 10 seconds with current flight data

### API Endpoints

#### `GET /`
Health check endpoint
```
Response: { status: 200, message: "API online", v: "1.0.0", timeOnlineSeconds: number }
```

#### `POST /rpc/select-voice-channel`
Switch to a Discord voice channel based on frequency
```json
{
  "frequency": "124.850",
  "navigate": true,
  "timeout": 5000
}
```

#### `GET /rpc/voice-connection-status`
Get current voice connection status
```
Response: { status: 200, data: any }
```

#### `POST /rpc/set-activity`
Manually set Discord activity status
```json
{
  "pid": 1234,
  "activity": {
    "details": "ALT 35000ft | HDG 090°",
    "state": "N123AB · Boeing 777"
  }
}
```

## System Requirements

Electricity

## Troubleshooting

### Discord Connection Failed
- Ensure Discord is running
- Check that Discord has RPC enabled in settings
- Verify the `client_id` in `rpc-config.json` is correct

### Voice Channel Switching Not Working
- Verify the frequency exists in `channels.json`
- Check that the Discord channel ID is correct
- Ensure you're in the ATC24 Discord server

### Application Won't Start (Linux)
- Verify Node.js/Bun is installed: `node --version` or `bun --version`
- Run `pnpm install` again to ensure all dependencies are installed
- Check the console output for specific error messages

## Building from Source

### Prerequisites
- Bun runtime (recommended) or Node.js 18+
- pnpm package manager
- NSIS (for Windows installer only): https://nsis.sourceforge.io/

### Build Steps

1. **Development build with watch mode**
   ```bash
   pnpm run dev
   ```

2. **Production build**
   ```bash
   pnpm run build
   ```

3. **Build Windows installer** (Windows only)
   ```bash
   pnpm run build-installer
   ```

4. **Complete build with installer**
   ```bash
   pnpm run serve
   ```

## Support

For issues, feature requests, or contributions, please refer to the Zed Software Discord.

## License

This project is licensed under the GNU General Public License v3.0.

## Credits

Created by Zedruc and Awdev for 24Client flight simulation integration.
