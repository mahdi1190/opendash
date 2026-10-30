; Freeflo Windows installer (called OpenDash before 2.23; Inno Setup 6). The data folder, the install folder, the Run value name
; and the output file name keep the old name on purpose, so an update installs over the old one and nothing is lost.
; Built by installer\build-installer.ps1 (CI), which passes:
;   /DAppVersion=2.19.7  /DSourceDir=<extracted release zip>  /DRuntimeDir=<folder with node.exe + LICENSE>
; Per-user, no administrator prompt. The data folder is outside the app folder
; (%LOCALAPPDATA%\OpenDash\data), so updating, reinstalling or uninstalling the
; app never touches it unless you choose to delete it at uninstall.
; Nothing else is downloaded or installed: Node.js is bundled in runtime\node.exe.
#ifndef AppVersion
  #error AppVersion is not defined (use build-installer.ps1)
#endif

[Setup]
AppId={{B7C1E2F4-5A3D-4E8B-9C21-6D0F7A1E4B93}
AppName=Freeflo
AppVersion={#AppVersion}
AppPublisher=Freeflo
AppPublisherURL=https://github.com/mahdi1190/opendash
DefaultDirName={localappdata}\Programs\OpenDash
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputBaseFilename=OpenDash-Setup-{#AppVersion}
SetupIconFile={#SourceDir}\assets\brand\favicon.ico
UninstallDisplayIcon={app}\assets\brand\favicon.ico
LicenseFile={#SourceDir}\LICENSE
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=no

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; Flags: unchecked
Name: "startup"; Description: "Start Freeflo when I &sign in"; Flags: unchecked

[Dirs]
Name: "{localappdata}\OpenDash\data"; Flags: uninsneveruninstall

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Excludes: "data\*,state\*,secrets\*,.git\*"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#RuntimeDir}\node.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "{#RuntimeDir}\LICENSE"; DestDir: "{app}\runtime"; DestName: "LICENSE-node.txt"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Freeflo"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\tools\launch.vbs"" --data-dir ""{localappdata}\OpenDash\data"""; WorkingDir: "{app}"; IconFilename: "{app}\assets\brand\favicon.ico"
Name: "{autoprograms}\Stop Freeflo"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\tools\launch.vbs"" --stop"; WorkingDir: "{app}"; IconFilename: "{app}\assets\brand\favicon.ico"
Name: "{userdesktop}\Freeflo"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\tools\launch.vbs"" --data-dir ""{localappdata}\OpenDash\data"""; WorkingDir: "{app}"; IconFilename: "{app}\assets\brand\favicon.ico"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "OpenDash"; ValueData: """{sys}\wscript.exe"" ""{app}\tools\launch.vbs"" --background --data-dir ""{localappdata}\OpenDash\data"""; Tasks: startup; Flags: uninsdeletevalue

[Run]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\tools\launch.vbs"" --data-dir ""{localappdata}\OpenDash\data"""; WorkingDir: "{app}"; Description: "Open Freeflo now"; Flags: nowait postinstall skipifsilent

; The shortcuts an install before 2.23 made carry the old name: replace them rather than leave two.
[InstallDelete]
Type: files; Name: "{autoprograms}\OpenDash.lnk"
Type: files; Name: "{autoprograms}\Stop OpenDash.lnk"
Type: files; Name: "{userdesktop}\OpenDash.lnk"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
var
  DeleteMyData: Boolean;

// A running server holds runtime\node.exe open: ask the copy in this app folder to stop.
procedure StopServer(AppDir: String);
var
  Code: Integer;
begin
  if FileExists(AppDir + '\runtime\node.exe') then
    Exec(AppDir + '\runtime\node.exe', '"' + AppDir + '\tools\launch.mjs" --stop', AppDir, SW_HIDE, ewWaitUntilTerminated, Code);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  StopServer(WizardDirValue);
  Result := '';
end;

function InitializeUninstall(): Boolean;
begin
  StopServer(ExpandConstant('{app}'));
  DeleteMyData := False;
  if not UninstallSilent then
    DeleteMyData := MsgBox('Also delete my data?' + #13#10#13#10 +
      'Your tasks, notes and settings are kept in ' + ExpandConstant('{localappdata}\OpenDash\data') + '.' + #13#10 +
      'Choose No (the default) to keep them for a later reinstall. Choose Yes to delete them for good.',
      mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES;
  Result := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if (CurUninstallStep = usPostUninstall) and DeleteMyData then
  begin
    DelTree(ExpandConstant('{localappdata}\OpenDash\data'), True, True, True);
    RemoveDir(ExpandConstant('{localappdata}\OpenDash'));
  end;
end;
