; ============================================================
;  MyBridge Installer Script
;  NSIS (Nullsoft Scriptable Install System)
;  Version: 1.0.0
; ============================================================

!define APP_NAME        "24Client Bridge"
!ifndef APP_VERSION
  !define APP_VERSION   "1.0.0"
!endif
!ifndef APP_VI_VERSION
  !define APP_VI_VERSION "1.0.0"
!endif
!define APP_PUBLISHER   "Zed's Software"
!define APP_URL         "https://zedruc.net/24client"
!define APP_EXE_SRC     "dist\24client-bridge.exe"    ; Source path (for File command)
!define APP_EXE         "24client-bridge.exe"          ; Installed filename only
!define APP_ICON        "src\assets\icon.ico"
!define APP_CERT        "src\assets\zedsoftware.cer"
!define CERT_THUMBPRINT "7B5A9861DE22E43A7343D8AC0C8D201215190FC4"
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

VIProductVersion                "${APP_VI_VERSION}.0"
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

!define MUI_ABORTWARNING
!define MUI_ICON   "${APP_ICON}"
!define MUI_UNICON "${APP_ICON}"

!define MUI_WELCOMEPAGE_TITLE   "Welcome to ${APP_NAME} Setup"
!define MUI_WELCOMEPAGE_TEXT    "This wizard will guide you through the installation of ${APP_NAME} ${APP_VERSION}.\
    $\r$\n$\r$\n${APP_NAME} is a bridge service that runs in the background.\
    $\r$\n$\r$\nClick Next to continue."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN         "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT    "Launch ${APP_NAME} now"
!define MUI_FINISHPAGE_SHOWREADME  ""
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"


; ===========================================================
;  Prevent multiple installer instances
; ===========================================================

Function .onInit
    System::Call 'kernel32::CreateMutex(p 0, i 1, t "${MUTEX_NAME}") p .r1 ?e'
    Pop $R0
    ${If} $R0 = 183
        MessageBox MB_OK|MB_ICONEXCLAMATION \
            "The installer is already running."
        Abort
    ${EndIf}
FunctionEnd


; ===========================================================
;  Sections
; ===========================================================

Section "${APP_NAME} Core" SecCore

    SectionIn RO

    SetOutPath "$INSTDIR"

    File "${APP_EXE_SRC}"          ; Copies dist\24client-bridge.exe → $INSTDIR\24client-bridge.exe
    File "node_modules\.pnpm\systray2@2.1.4\node_modules\systray2\traybin\tray_windows_release.exe"
    File "${APP_CERT}"
    
    WriteRegStr HKLM "${REG_KEY}" "InstallPath" "$INSTDIR"
    WriteRegStr HKLM "${REG_KEY}" "Version"     "${APP_VERSION}"

    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayName"          "${APP_NAME}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "DisplayVersion"       "${APP_VERSION}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "Publisher"            "${APP_PUBLISHER}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "URLInfoAbout"         "${APP_URL}"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "InstallLocation"      "$INSTDIR"
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "UninstallString"      '"$INSTDIR\Uninstall.exe"'
    WriteRegStr   HKLM "${UNINSTALL_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify"             1
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair"             1
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "EstimatedSize"        2048

    WriteUninstaller "$INSTDIR\Uninstall.exe"

    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Optional: Trust the Zed's Software Publisher Certificate$\r$\n\
$\r$\n\
Would you like to add Zed's Software as a trusted publisher on this computer?$\r$\n\
$\r$\n\
What this does:$\r$\n\
  - Installs a code-signing certificate from Zed's Software into your$\r$\n\
    Windows Trusted Publishers store.$\r$\n\
  - Future UAC prompts for ${APP_NAME} will show 'Zed's Software'$\r$\n\
    as the verified publisher instead of 'Unknown Publisher'.$\r$\n\
  - This only affects ${APP_NAME} and it does not grant any software$\r$\n\
    the ability to install or run anything automatically.$\r$\n\
$\r$\n\
What this does NOT do:$\r$\n\
  - It does not bypass Windows security or UAC.$\r$\n\
  - It does not allow silent installs or auto-updates.$\r$\n\
  - Clicking 'No' is safe and ${APP_NAME} will still work normally.$\r$\n\
$\r$\n\
You can remove this certificate at any time via:$\r$\n\
  Start > Run > certlm.msc > Trusted Publishers$\r$\n\
$\r$\n\
Add Zed's Software as a trusted publisher?" \
        IDNO skip_cert
    nsExec::ExecToLog 'certutil -addstore -f TrustedPublisher "$INSTDIR\zedsoftware.cer"'
    skip_cert:

SectionEnd


Section "Desktop Shortcut" SecDesktop

    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" \
        "$INSTDIR\${APP_EXE}" "" \
        "$INSTDIR\${APP_EXE}" 0 \
        SW_SHOWNORMAL

SectionEnd


Section "Start Menu Shortcut" SecStartMenu

    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
        "$INSTDIR\${APP_EXE}" "" \
        "$INSTDIR\${APP_EXE}" 0 \
        SW_SHOWNORMAL
    CreateShortcut  "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" \
        "$INSTDIR\Uninstall.exe"

SectionEnd


Section /o "Start automatically with Windows" SecAutostart

    WriteRegStr HKCU "${AUTOSTART_KEY}" \
        "${AUTOSTART_NAME}" \
        '"$INSTDIR\${APP_EXE}"'

    WriteRegDWORD HKLM "${REG_KEY}" "Autostart" 1

SectionEnd


; ===========================================================
;  Section descriptions
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

    nsExec::ExecToLog 'taskkill /F /IM "${APP_EXE}"'

    DeleteRegValue HKCU "${AUTOSTART_KEY}" "${AUTOSTART_NAME}"
    DeleteRegValue HKLM "${AUTOSTART_KEY}" "${AUTOSTART_NAME}"

    DeleteRegKey HKLM "${UNINSTALL_KEY}"
    DeleteRegKey HKLM "${REG_KEY}"

    Delete "$INSTDIR\${APP_EXE}"
    Delete "$INSTDIR\tray_windows_release.exe"
    Delete "$INSTDIR\zedsoftware.cer"
    Delete "$INSTDIR\Uninstall.exe"
    RMDir  "$INSTDIR"

    Delete "$DESKTOP\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
    RMDir  "$SMPROGRAMS\${APP_NAME}"

    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Remove the Zed's Software trusted publisher certificate?$\r$\n\
$\r$\n\
During installation you may have added Zed's Software to your Trusted Publishers store.$\r$\n\
Removing it means future installs of ${APP_NAME} will no longer show a verified publisher.$\r$\n\
$\r$\n\
If you are keeping ${APP_NAME} installed elsewhere, click No.$\r$\n\
$\r$\n\
Remove the certificate?" \
        IDNO skip_cert_remove
    nsExec::ExecToLog 'certutil -delstore TrustedPublisher "${CERT_THUMBPRINT}"'
    skip_cert_remove:

    MessageBox MB_OK|MB_ICONINFORMATION \
        "${APP_NAME} has been successfully uninstalled.$\r$\n$\r$\nUser configuration files (if any) were left in place."

SectionEnd