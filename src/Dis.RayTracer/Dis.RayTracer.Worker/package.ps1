Add-Type -Assembly System.IO.Compression.FileSystem
$src_folder = "."
$destfile = "..\worker.zip"
$compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal
$includebasedir = $false
[System.IO.Compression.ZipFile]::CreateFromDirectory($src_folder, $destfile, $compressionLevel, $includebasedir)