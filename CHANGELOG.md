# Changelog

All notable changes to the 24Client Bridge project will be documented in this file.

## [1.0.6] - 2026-07-20

### Added
- **macOS support**: The bridge now builds and ships for both Apple Silicon and Intel Macs (`bun-darwin-arm64` / `bun-darwin-x64`), with the systray helper binary embedded for both platforms via `scripts/embed-tray-bin.mjs`
- **Cross-platform app data paths**: New `paths.ts` resolves the correct config directory per OS (`%APPDATA%` on Windows, `~/Library/Application Support` on macOS), used by `voice-creds.ts` and `token-cache.ts`
- **Windows publisher certificate**: Installer now bundles the Zed's Software code-signing certificate and offers to install it as a Trusted Publisher
- **CI**: Release workflow now signs the Windows installer with `signtool` and builds/uploads signed macOS zip artifacts via a dedicated Blacksmith macOS runner

### Fixed
- Discord RPC IPC socket path resolution now follows Discord's documented lookup order, improving connection reliability
- macOS builds reported "damaged file" in Gatekeeper — caused by a Bun 1.3.12 regression that truncates ad-hoc code signatures on larger binaries; builds now skip Bun's built-in signing and are explicitly ad-hoc signed with `codesign`

### Changed
- Windows executable now compiled against the x64 baseline target for compatibility with older CPUs
- Installer versioning and NSIS packaging fixes so the installer version is derived correctly from the release tag
- README simplified and reorganized, now covers macOS installation alongside Windows
- Release workflow no longer relies on static tokens for authentication

### Dependencies
- Bumped **axios** to `^1.18.1`
- Bumped **@types/node** to `^25.9.4`

Full Changelog: [`v1.0.5-beta...v1.0.6`](../../compare/v1.0.5-beta...v1.0.6)

---

## [1.0.5] - 2026-05-29

### Added
- **Local OAuth flow**: New local auth server (`127.0.0.1:57331`) handles Discord OAuth2 callback directly, eliminating dependency on the external `auth_server` config field
- **Voice credentials persistence**: New `voice-creds.ts` stores voice channel credentials to `%APPDATA%/pilot-client-bridge/voice-creds.json`, surviving restarts
- **Per-scope token caching**: Token cache now keyed by scope (`token-activity.json`, `token-voice.json`, etc.) so activity and voice tokens no longer overwrite each other
- **Callsign tray display**: System tray now shows current callsign via `updateCallsign()`
- **Systray binary bundling**: Systray executable embedded at build time via `scripts/embed-tray-bin.mjs` and bundled in the NSIS installer

### Fixed
- Voice channel switching broken when Discord's RPC `AUTHENTICATE` command returned errors under certain account configurations — now works around the limitation with a local OAuth exchange
- Token refresh would silently fail after expiry due to stale cached token file being shared between scopes
- Installer created shortcut pointing to wrong path
- CJS import error on startup in certain environments
- Update checker failed to compare versions correctly in some cases
- Systray icon not loading when binary path differed between dev and production builds

### Changed
- `auth_server` field removed from `rpc-config.json` — auth is now handled locally
- Token cache file renamed from `token.json` to `token-<key>.json` to support multiple scopes (manual deletion of old `token.json` may be needed on upgrade)
- Contributing guidelines added to README

### Dependencies
- Added **axios** (^1.16.1) for OAuth token exchange HTTP requests
- Added **node-notifier** (^10.0.1) and **open** (^11.0.0)

---

## [1.0.0-beta.1] - 2026-05-24

### Added - Initial Beta Release

#### Core Features
- **Discord RPC Integration**: Full integration with Discord Rich Presence API for seamless status updates
- **Dynamic Flight Status Display**: Real-time Discord activity updates showing:
  - Current altitude
  - Heading information
  - Aircraft callsign and type
  - Automatic status clearing when not in flight
- **Voice Channel Switching**: Programmatic Discord voice channel switching based on radio frequencies
- **REST API**: Full-featured REST API for interacting with Discord RPC functionality
- **System Tray Integration**: Background service with system tray icon for quick status monitoring and control
- **Multi-platform Support**: Windows with pre-compiled installer and Linux with self-compile option

#### API Endpoints
- `GET /` - Health check endpoint
- `POST /rpc/select-voice-channel` - Switch voice channels by frequency
- `GET /rpc/voice-connection-status` - Get current voice connection status
- `POST /rpc/set-activity` - Manually set Discord activity status
- `GET /rpc/get-channels` - Retrieve available voice channels
- `POST /rpc/set-user-voice-settings` - Configure voice settings

#### Configuration
- `rpc-config.json` - Discord RPC client configuration
- `channels.json` - Radio frequency to Discord channel mappings for Italian airspace (20+ airports supported)

#### Development Features
- TypeScript support with strict type checking
- Development mode with hot-reload (`pnpm run dev`)
- Production build system using Bun
- Windows installer generation with NSIS
- Comprehensive error handling and logging

#### Platform Support
- **Windows**: Pre-compiled executable installer with automatic installation to Program Files
- **Linux**: Full source compilation support with clear build instructions

### Installation

#### Windows
- Pre-compiled installer available at: https://zedruc.net/downloads/24Client%20Bridge_Setup_latest.exe
- One-click installation with automatic shortcuts and system tray integration

#### Linux
- Self-compile from source using `pnpm run build`
- Requires Node.js 18+ or Bun runtime

### Known Limitations (Beta)

- Activity updates occur every 10 seconds (not real-time)
- System tray integration Windows-only in this release
- OAuth token caching may require manual refresh in certain scenarios

### Technical Details

- **Runtime**: Bun/Node.js
- **Framework**: Express.js for REST API
- **IPC Protocol**: Custom Discord RPC handshake implementation
- **API Port**: 127.0.0.1:57330
- **CORS Origins**: https://zedruc.net, http://localhost:5174

### Testing Notes

This is a beta release intended for testing and feedback. Please report any issues or unexpected behavior through the project's issue tracker.

### System Requirements

Electricity

### Breaking Changes

None - initial release.

### Deprecations

None - initial release.

### Security Notes

- API server binds to 127.0.0.1 only (no external network access)
- Discord IPC authentication required for all operations
- Discord token cached locally for session persistence
- CORS restricted to specific origins

---

For more information, see [README.md](README.md).
