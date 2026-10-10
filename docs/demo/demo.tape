Output docs/images/cli-demo.gif
Require bun
Set Shell "powershell"
Set Width 1000
Set Height 650
Set FontSize 20
Set TypingSpeed 35ms
Set Framerate 10
Hide
Type "$work = & ./docs/demo/prepare.ps1; Set-Location $work; function prompt { 'demo> ' }; Clear-Host"
Enter
Sleep 1s
Show
Type "bun run index.ts"
Enter
Sleep 1s
Type "Tab Notes"
Enter
Sleep 500ms
Type "Save notes for the current tab."
Enter
Sleep 500ms
Down
Enter
Sleep 500ms
Space
Enter
Sleep 500ms
Right
Enter
Sleep 500ms
Down 2
Space
Enter
Sleep 500ms
Enter
Sleep 500ms
Right
Enter
Sleep 500ms
Down 6
Space
Enter
Sleep 500ms
Enter
Sleep 2s
Type "Get-ChildItem 'Tab Notes' | Select-Object Name"
Enter
Sleep 3s
