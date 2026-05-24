; ============================================================
;  MyBridge Installer Script
;  NSIS (Nullsoft Scriptable Install System)
;  Version: 1.0.0
; ============================================================
;
;  HOW TO USE:
;    1. Install NSIS from https://nsis.sourceforge.io/
;    2. Replace placeholder values (marked with TODO) below
;    3. Place your .exe next to this script (or adjust APP_EXE path)
;    4. Right-click this .nsi file → "Compile NSIS Script"
;
; ============================================================

; ---- Compiler plugins required ---------------------------
;  MUI2   (included with NSIS)
;  nsExec (included with NSIS)
; ----------------------------------------------------------


; ===========================================================
;  Definitions
; ===========================================================

!define APP_NAME        "24Client Bridge"
!define APP_VERSION     "1.0.0"
!define APP_PUBLISHER   "Zed's Software"
!define APP_URL         "https://zedruc.net/24client"
!define APP_EXE         "dist\24client-bridge.exe"          ; Your .exe filename
!define APP_ICON        "src\assets\icon.ico"          ; TODO: provide a .ico file, or remove/comment icon lines
!define INSTALL_DIR     "$PROGRAMFILES64\${APP_NAME}"
!define REG_KEY         "Software\${APP_NAME}"
!define UNINSTALL_KEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
!define AUTOSTART_KEY   "Software\Microsoft\Windows\CurrentVersion\Run"
!define AUTOSTART_NAME  "${APP_NAME}"
!define MUTEX_NAME      "${APP_NAME}InstallerMutex"


; ===========================================================
;  General settings
; ===========================================================

Name                "${APP_NAME} ${APP_VERSION}"
OutFile             "dist\${APP_NAME}_Setup_v${APP_VERSION}.exe"
InstallDir          "${INSTALL_DIR}"
InstallDirRegKey    HKLM "${REG_KEY}" "InstallPath"
RequestExecutionLevel admin
SetCompressor       /SOLID lzma
ShowInstDetails     show
ShowUnInstDetails   show

; Installer version info (shows in file properties)
VIProductVersion                "${APP_VERSION}.0"
VIAddVersionKey "ProductName"   "${APP_NAME}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
VIAddVersionKey "CompanyName"   "${APP_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "© 2025 ${APP_PUBLISHER}"
VIAddVersionKey "FileDescription" "${APP_NAME} Installer"
VIAddVersionKey "FileVersion"   "${APP_VERSION}"


; ===========================================================
;  Modern UI 2 Interface
; ===========================================================

!include "MUI2.nsh"
!include "LogicLib.nsh"

; MUI Settings
!define MUI_ABORTWARNING
!define MUI_ICON   "${APP_ICON}"          ; TODO: comment out if no icon file
!define MUI_UNICON "${APP_ICON}"          ; TODO: comment out if no icon file

; Welcome page
!define MUI_WELCOMEPAGE_TITLE   "Welcome to ${APP_NAME} Setup"
!define MUI_WELCOMEPAGE_TEXT    "This wizard will guide you through the installation of ${APP_NAME} ${APP_VERSION}.\
    $\r$\n$\r$\n${APP_NAME} is a bridge service that runs in the background.\
    $\r$\n$\r$\nClick Next to continue."
!insertmacro MUI_PAGE_WELCOME

; License page (comment out if you have no license file)
; !define MUI_LICENSEPAGE_RADIOBUTTONS
; !insertmacro MUI_PAGE_LICENSE "LICENSE.txt"

; Components page (allows user to pick optional features)
!insertmacro MUI_PAGE_COMPONENTS

; Install directory page
!insertmacro MUI_PAGE_DIRECTORY

; Install progress page
!insertmacro MUI_PAGE_INSTFILES

; Finish page
!define MUI_FINISHPAGE_RUN         "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT    "Launch ${APP_NAME} now"
!define MUI_FINISHPAGE_SHOWREADME  ""
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages (add more as needed)
!insertmacro MUI_LANGUAGE "English"


; ===========================================================
;  Prevent multiple installer instances
; ===========================================================

Function .onInit
    System::Call 'kernel32::CreateMutex(p 0, i 1, t "${MUTEX_NAME}") p .r1 ?e'
    Pop $R0
    ${If} $R0 = 183        ; ERROR_ALREADY_EXISTS
        MessageBox MB_OK|MB_ICONEXCLAMATION \
            "The installer is already running."
        Abort
    ${EndIf}
FunctionEnd


; ===========================================================
;  Sections (Components)
; ===========================================================

; ---------- Main application (required) --------------------
Section "${APP_NAME} Core" SecCore

    SectionIn RO   ; Read-only — cannot be deselected

    SetOutPath "$INSTDIR"

    ; --- Copy files -----------------------------------------
    ; TODO: Add all files your application needs here
    File "${APP_EXE}"
    ; File "config.example.json"
    ; File /r "assets\*"

    ; --- Store install path in registry --------------------
    WriteRegStr HKLM "${REG_KEY}" "InstallPath" "$INSTDIR"
    WriteRegStr HKLM "${REG_KEY}" "Version"     "${APP_VERSION}"

    ; --- Add/Remove Programs entry -------------------------
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayName"      "${APP_NAME}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayVersion"   "${APP_VERSION}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "Publisher"        "${APP_PUBLISHER}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "URLInfoAbout"     "${APP_URL}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "InstallLocation"  "$INSTDIR"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "UninstallString"  '"$INSTDIR\Uninstall.exe"'
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify"         1
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair"         1

    ; Estimate installed size (adjust as needed, in KB)
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "EstimatedSize"    2048

    ; --- Write uninstaller ---------------------------------
    WriteUninstaller "$INSTDIR\Uninstall.exe"

SectionEnd


; ---------- Desktop shortcut (optional) --------------------
Section "Desktop Shortcut" SecDesktop

    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" \
        "$INSTDIR\${APP_EXE}" "" \
        "$INSTDIR\${APP_EXE}" 0 \
        SW_SHOWNORMAL

SectionEnd


; ---------- Start Menu shortcut (optional) -----------------
Section "Start Menu Shortcut" SecStartMenu

    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
        "$INSTDIR\${APP_EXE}" "" \
        "$INSTDIR\${APP_EXE}" 0 \
        SW_SHOWNORMAL
    CreateShortcut  "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" \
        "$INSTDIR\Uninstall.exe"

SectionEnd


; ---------- Autostart (optional) ---------------------------
Section /o "Start automatically with Windows" SecAutostart

    ; Write to HKCU so no elevation needed at runtime,
    ; and the setting applies only to the current user.
    ;
    ; To apply for ALL users, change HKCU → HKLM (requires admin,
    ; which this installer already requests).

    WriteRegStr HKCU "${AUTOSTART_KEY}" \
        "${AUTOSTART_NAME}" \
        '"$INSTDIR\${APP_EXE}"'

    ; Store the user's choice so the uninstaller can clean it up
    WriteRegDWORD HKLM "${REG_KEY}" "Autostart" 1

SectionEnd


; ===========================================================
;  Section descriptions (shown in components page tooltip)
; ===========================================================

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecCore}      \
        "Required core files for ${APP_NAME}. Cannot be deselected."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop}   \
        "Add a shortcut to the Desktop."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecStartMenu} \
        "Add shortcuts to the Start Menu."
    !insertmacro MUI_DESCRIPTION_TEXT ${SecAutostart} \
        "Launch ${APP_NAME} automatically when you log into Windows. \
        Recommended for bridge software that must always be running."
!insertmacro MUI_FUNCTION_DESCRIPTION_END


; ===========================================================
;  Uninstaller
; ===========================================================

Section "Uninstall"

    ; --- Stop the process if it is running -----------------
    nsExec::ExecToLog 'taskkill /F /IM "${APP_EXE}"'

    ; --- Remove autostart entry ----------------------------
    DeleteRegValue HKCU "${AUTOSTART_KEY}" "${AUTOSTART_NAME}"
    ; Also attempt HKLM in case it was installed machine-wide
    DeleteRegValue HKLM "${AUTOSTART_KEY}" "${AUTOSTART_NAME}"

    ; --- Remove registry keys ------------------------------
    DeleteRegKey HKLM "${UNINSTALL_KEY}"
    DeleteRegKey HKLM "${REG_KEY}"

    ; --- Remove files and directories ----------------------
    Delete "$INSTDIR\${APP_EXE}"
    Delete "$INSTDIR\Uninstall.exe"
    ; TODO: Add any other files you installed:
    ; Delete "$INSTDIR\config.example.json"
    ; RMDir  /r "$INSTDIR\assets"

    ; Remove install directory only if empty
    RMDir  "$INSTDIR"

    ; --- Remove shortcuts ----------------------------------
    Delete "$DESKTOP\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
    RMDir  "$SMPROGRAMS\${APP_NAME}"

    ; --- Confirmation --------------------------------------
    MessageBox MB_OK|MB_ICONINFORMATION \
        "${APP_NAME} has been successfully uninstalled.$\r$\n$\r$\nUser configuration files (if any) were left in place."

SectionEnd
