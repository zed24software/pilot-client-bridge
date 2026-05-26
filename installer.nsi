; ============================================================
;  MyBridge Installer Script
;  NSIS (Nullsoft Scriptable Install System)
;  Version: 1.0.0
; ============================================================

!define APP_NAME        "24Client Bridge"
!define APP_VERSION     "1.0.0"
!define APP_PUBLISHER   "Zed's Software"
!define APP_URL         "https://zedruc.net/24client"
!define APP_EXE_SRC     "dist\24client-bridge.exe"    ; Source path (for File command)
!define APP_EXE         "24client-bridge.exe"          ; Installed filename only
!define APP_ICON        "src\assets\icon.ico"
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
    Delete "$INSTDIR\Uninstall.exe"
    RMDir  "$INSTDIR"

    Delete "$DESKTOP\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
    RMDir  "$SMPROGRAMS\${APP_NAME}"

    MessageBox MB_OK|MB_ICONINFORMATION \
        "${APP_NAME} has been successfully uninstalled.$\r$\n$\r$\nUser configuration files (if any) were left in place."

SectionEnd