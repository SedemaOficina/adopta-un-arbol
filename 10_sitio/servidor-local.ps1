# Servidor local de prueba para "Guardianes de árboles" (SEDEMA · SIA)
# Sirve la carpeta 10_sitio en http://localhost:8080/ y abre el navegador.
# No necesita Python ni instalar nada. Para detenerlo, cierra esta ventana.
$puerto = 8080
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$tipos = @{ ".html"="text/html; charset=utf-8"; ".js"="application/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8";
            ".json"="application/json"; ".txt"="text/plain; charset=utf-8"; ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml";
            ".woff2"="font/woff2"; ".md"="text/markdown; charset=utf-8" }
$http = New-Object System.Net.HttpListener
$http.Prefixes.Add("http://localhost:$puerto/")
try { $http.Start() } catch { Write-Host "No se pudo abrir el puerto $puerto. Cierra otra ventana del servidor e intenta de nuevo."; Read-Host "Enter para salir"; exit }
Write-Host "Guardianes de arboles: http://localhost:$puerto/  (cierra esta ventana para detenerlo)"
Start-Process "http://localhost:$puerto/index.html"
while ($http.IsListening) {
  $ctx = $http.GetContext()
  $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ($ruta -eq "") { $ruta = "index.html" }
  $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
  if ($archivo.StartsWith($raiz) -and (Test-Path $archivo -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($archivo)
    $ext = [IO.Path]::GetExtension($archivo).ToLower()
    $ctx.Response.ContentType = $(if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { "application/octet-stream" })
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
