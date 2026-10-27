Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$shell = New-Object -ComObject Shell.Application
$videoPath = "C:\Users\Kunal\OneDrive\Desktop\bhume vid.mp4"
$folder = $shell.NameSpace((Split-Path $videoPath))
$file = $folder.ParseName((Split-Path $videoPath -Leaf))

# Get video properties
$details = @{}
for ($i = 0; $i -lt 300; $i++) {
    $name = $folder.GetDetailsOf($null, $i)
    $value = $folder.GetDetailsOf($file, $i)
    if ($name -and $value) {
        $details[$name] = $value
    }
}
$details | Format-Table -AutoSize

# Get file size
$fi = Get-Item $videoPath
Write-Host "File size: $($fi.Length) bytes"
Write-Host "Extension: $($fi.Extension)"
