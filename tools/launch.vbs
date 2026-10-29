' Runs tools\launch.mjs with no console window and passes the arguments on.
' Used by the OpenDash shortcuts. Uses the app's own runtime\node.exe when it
' has one (the Windows installer), else the Node.js on the PATH.
Option Explicit
Dim sh, fso, here, root, node, cmd, i
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(here)
node = root & "\runtime\node.exe"
If Not fso.FileExists(node) Then node = "node"
cmd = """" & node & """ """ & here & "\launch.mjs"""
For i = 0 To WScript.Arguments.Count - 1
  cmd = cmd & " """ & WScript.Arguments(i) & """"
Next
sh.Run cmd, 0, False
