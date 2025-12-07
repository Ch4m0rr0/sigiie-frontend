# Prompt para Backend: Implementación del Endpoint de Descarga de Reportes

## 🚨 PROBLEMA CRÍTICO - ENDPOINT FALTANTE

### Error que recibe el usuario:
```
El reporte se generó exitosamente (ID: 3) pero el endpoint de descarga no está disponible.
```

### 🔴 Diagnóstico

El endpoint `GET /api/Reportes/descargar/{id}` **NO EXISTE** en el backend (devuelve 404 Not Found).

**Flujo actual:**
1. ✅ `POST /api/Reportes/generar/excel` - **FUNCIONA** - Genera el reporte y devuelve JSON con ID
2. ❌ `GET /api/Reportes/descargar/{id}` - **NO EXISTE** - Devuelve 404 Not Found

### ⚠️ Lo que falta:

**IMPLEMENTAR el endpoint `GET /api/Reportes/descargar/{id}` en el controlador `ReportesController`**

Este endpoint es **REQUERIDO** para que el frontend pueda descargar los reportes generados.

---

## 🔴 Problema Actual (Detalles Técnicos)

El endpoint `GET /api/Reportes/descargar/{id}` está devolviendo **404 Not Found** porque no está implementado en el backend.

**Respuesta actual (incorrecta):**
```
Reporte: Reporte Actividad 2025-12-05
Tipo: excel
Fecha: 05/12/2025 17:30:20
Ruta: reportes/actividad-1764955814906.xlsx
```

**Respuesta esperada:**
- Archivo binario Excel (.xlsx)
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Headers HTTP correctos para descarga de archivo

---

## ✅ Solución Requerida

### ⚠️ URGENTE: Implementar el Endpoint `GET /api/Reportes/descargar/{id}`

**Este endpoint NO EXISTE y es necesario para que funcione la descarga de reportes.**

### Endpoint: `GET /api/Reportes/descargar/{id}`

Este endpoint debe:

1. **Buscar el reporte** en la base de datos por ID
2. **Leer el archivo Excel** desde la ruta almacenada (`RutaArchivo`)
3. **Devolver el archivo binario** con los headers HTTP correctos
4. **NO devolver texto plano** con información del reporte
5. **NO devolver JSON** con metadatos del reporte

### Alternativa: Modificar POST para devolver el archivo directamente

Si prefieres no implementar el endpoint de descarga, puedes modificar `POST /api/Reportes/generar/excel` para que devuelva el archivo Excel directamente en lugar de solo el ID. Sin embargo, la solución recomendada es implementar el endpoint de descarga separado.

---

## 📝 Implementación en ASP.NET Core (C#)

### ⚠️ IMPORTANTE: Agregar el Endpoint al Controlador

Asegúrate de que el método `DescargarReporte` esté en el controlador `ReportesController` y que la ruta esté correctamente configurada.

### Opción 1: Usando IWebHostEnvironment (Recomendado)

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;

[ApiController]
[Route("api/[controller]")]
public class ReportesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly ILogger<ReportesController> _logger;

    public ReportesController(
        ApplicationDbContext context, 
        IWebHostEnvironment webHostEnvironment,
        ILogger<ReportesController> logger)
    {
        _context = context;
        _webHostEnvironment = webHostEnvironment;
        _logger = logger;
    }

    /// <summary>
    /// Descarga un reporte generado por su ID
    /// GET /api/Reportes/descargar/{id}
    /// 
    /// ⚠️ ESTE ENDPOINT ES REQUERIDO Y ACTUALMENTE NO EXISTE
    /// El frontend llama a este endpoint después de generar un reporte exitosamente
    /// </summary>
    [HttpGet("descargar/{id}")]
    [ProducesResponseType(typeof(FileResult), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<IActionResult> DescargarReporte(int id)
    {
        try
        {
            // 1. Buscar el reporte en la base de datos
            var reporte = await _context.ReportesGenerados
                .FirstOrDefaultAsync(r => r.IdReporte == id);

            if (reporte == null)
            {
                _logger.LogWarning($"Reporte con ID {id} no encontrado");
                return NotFound(new { message = $"Reporte con ID {id} no encontrado" });
            }

            // 2. Validar que el reporte tenga una ruta de archivo
            if (string.IsNullOrWhiteSpace(reporte.RutaArchivo))
            {
                _logger.LogError($"Reporte {id} no tiene ruta de archivo asignada");
                return BadRequest(new { message = "El reporte no tiene un archivo asociado" });
            }

            // 3. Construir la ruta completa del archivo
            // Asumiendo que los archivos están en wwwroot/reportes/ o en una carpeta específica
            string filePath;
            
            // Opción A: Si los archivos están en wwwroot
            if (reporte.RutaArchivo.StartsWith("reportes/") || reporte.RutaArchivo.StartsWith("/reportes/"))
            {
                filePath = Path.Combine(_webHostEnvironment.WebRootPath, reporte.RutaArchivo.TrimStart('/'));
            }
            // Opción B: Si la ruta es absoluta o relativa a una carpeta específica
            else if (Path.IsPathRooted(reporte.RutaArchivo))
            {
                filePath = reporte.RutaArchivo;
            }
            // Opción C: Si la ruta es relativa, asumir que está en una carpeta de reportes
            else
            {
                var reportesFolder = Path.Combine(_webHostEnvironment.WebRootPath, "reportes");
                filePath = Path.Combine(reportesFolder, reporte.RutaArchivo);
            }

            // 4. Verificar que el archivo existe
            if (!System.IO.File.Exists(filePath))
            {
                _logger.LogError($"Archivo no encontrado en la ruta: {filePath}");
                return NotFound(new { 
                    message = "El archivo del reporte no existe en el servidor",
                    ruta = reporte.RutaArchivo 
                });
            }

            // 5. Leer el archivo como bytes
            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            
            if (fileBytes == null || fileBytes.Length == 0)
            {
                _logger.LogError($"El archivo está vacío: {filePath}");
                return BadRequest(new { message = "El archivo del reporte está vacío" });
            }

            // 6. Determinar el nombre del archivo para la descarga
            var fileName = !string.IsNullOrWhiteSpace(reporte.Nombre) 
                ? $"{reporte.Nombre}.xlsx"
                : $"reporte-{id}.xlsx";

            // 7. Devolver el archivo con el Content-Type correcto
            _logger.LogInformation($"Descargando reporte {id}: {fileName} ({fileBytes.Length} bytes)");
            
            return File(
                fileBytes, 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                fileName
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error al descargar reporte {id}");
            return StatusCode(500, new { 
                message = "Error interno al descargar el reporte",
                error = ex.Message 
            });
        }
    }
}
```

### Opción 2: Usando IHostEnvironment (si no tienes wwwroot)

```csharp
private readonly IHostEnvironment _hostEnvironment;

public ReportesController(
    ApplicationDbContext context, 
    IHostEnvironment hostEnvironment)
{
    _context = context;
    _hostEnvironment = hostEnvironment;
}

// En el método DescargarReporte, usar:
var reportesFolder = Path.Combine(_hostEnvironment.ContentRootPath, "Reportes");
var filePath = Path.Combine(reportesFolder, reporte.RutaArchivo);
```

### Opción 3: Si los archivos están en una carpeta fuera de wwwroot

```csharp
// Configurar en appsettings.json
// "ReportesPath": "C:\\Reportes\\" o "D:\\Aplicacion\\Reportes\\"

private readonly string _reportesPath;

public ReportesController(
    ApplicationDbContext context, 
    IConfiguration configuration)
{
    _context = context;
    _reportesPath = configuration["ReportesPath"] 
        ?? Path.Combine(Directory.GetCurrentDirectory(), "Reportes");
}

// En el método DescargarReporte:
var filePath = Path.Combine(_reportesPath, reporte.RutaArchivo);
```

---

## 🔧 Configuración Adicional

### 1. Asegurar que la carpeta de reportes existe

```csharp
// En Program.cs o Startup.cs, al iniciar la aplicación:
var reportesPath = Path.Combine(webHostEnvironment.WebRootPath, "reportes");
if (!Directory.Exists(reportesPath))
{
    Directory.CreateDirectory(reportesPath);
}
```

### 2. Configurar CORS si es necesario

```csharp
// En Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // URL del frontend
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// En el middleware
app.UseCors("AllowFrontend");
```

### 3. Validar tamaño máximo de archivo (opcional)

```csharp
// En Program.cs
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104857600; // 100 MB
});
```

---

## 📋 Estructura de la Tabla ReportesGenerados

Asegúrate de que la tabla tenga estos campos:

```sql
CREATE TABLE ReportesGenerados (
    IdReporte INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(255) NOT NULL,
    TipoReporte NVARCHAR(100),
    FechaGeneracion DATETIME2 NOT NULL,
    Formato NVARCHAR(50), -- 'excel', 'pdf', etc.
    RutaArchivo NVARCHAR(500) NOT NULL, -- Ruta relativa o absoluta del archivo
    TipoArchivo NVARCHAR(50),
    Estado NVARCHAR(50) -- 'generando', 'completado', 'error'
);
```

---

## ✅ Checklist de Verificación

**⚠️ CRÍTICO - Verificar estos puntos:**

- [ ] **El endpoint `GET /api/Reportes/descargar/{id}` EXISTE en el controlador** (actualmente NO existe)
- [ ] **La ruta está correctamente configurada:** `[HttpGet("descargar/{id}")]`
- [ ] **El endpoint está en el controlador correcto:** `ReportesController`
- [ ] El endpoint busca el reporte en la base de datos por ID
- [ ] El endpoint lee el archivo desde la ruta almacenada
- [ ] El endpoint devuelve `File()` con el Content-Type correcto
- [ ] El Content-Type es: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- [ ] El nombre del archivo se incluye en el header `Content-Disposition`
- [ ] Se manejan los casos de error (reporte no encontrado, archivo no existe, etc.)
- [ ] Se registran logs para debugging
- [ ] La carpeta de reportes existe y tiene permisos de lectura

### 🔍 Cómo Verificar que el Endpoint Existe

1. **Revisar el controlador `ReportesController`:**
   ```csharp
   // Buscar si existe este método:
   [HttpGet("descargar/{id}")]
   public async Task<IActionResult> DescargarReporte(int id)
   ```

2. **Probar el endpoint manualmente:**
   ```http
   GET http://tu-servidor/api/Reportes/descargar/3
   Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   ```
   
   **Si devuelve 404:** El endpoint no existe, necesitas implementarlo
   **Si devuelve 200 con archivo:** El endpoint funciona correctamente

---

## 🧪 Pruebas

### ⚠️ Prueba 0: Verificar que el endpoint existe
```http
GET /api/Reportes/descargar/3
Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

**Si devuelve 404:** El endpoint NO EXISTE - necesitas implementarlo
**Si devuelve 200:** El endpoint existe, verifica las otras pruebas

### Prueba 1: Descargar reporte existente
```http
GET /api/Reportes/descargar/1
Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

**Respuesta esperada:**
- Status: 200 OK
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="reporte-1.xlsx"`
- Body: Archivo binario Excel

### Prueba 2: Reporte no encontrado
```http
GET /api/Reportes/descargar/999
```

**Respuesta esperada:**
- Status: 404 Not Found
- Body: JSON con mensaje de error

### Prueba 3: Archivo no existe en el servidor
```http
GET /api/Reportes/descargar/2
```

**Respuesta esperada:**
- Status: 404 Not Found
- Body: JSON indicando que el archivo no existe

---

## ⚠️ Notas Importantes

1. **NO devolver texto plano**: El endpoint debe devolver el archivo binario, no información sobre el reporte.

2. **Content-Type correcto**: Es crucial usar el Content-Type correcto para que el navegador reconozca el archivo como Excel.

3. **Rutas de archivo**: Asegúrate de que las rutas almacenadas en la base de datos sean correctas y accesibles desde el servidor.

4. **Seguridad**: Considera validar que el usuario tenga permisos para descargar el reporte antes de devolver el archivo.

5. **Limpieza**: Considera implementar un job que elimine reportes antiguos después de cierto tiempo.

---

## 🔍 Debugging

Si el endpoint sigue sin funcionar, verifica:

1. **Logs del servidor**: Revisa los logs para ver si hay errores al leer el archivo.
2. **Ruta del archivo**: Verifica que la ruta almacenada en la BD sea correcta.
3. **Permisos**: Asegúrate de que la aplicación tenga permisos de lectura en la carpeta de reportes.
4. **Headers**: Usa herramientas como Postman o Fiddler para verificar los headers de respuesta.
5. **Tamaño del archivo**: Verifica que el archivo no esté vacío o corrupto.

---

## 📞 Soporte

Si después de implementar estos cambios el problema persiste, proporciona:

1. Código del endpoint implementado
2. Logs del servidor al intentar descargar
3. Headers de respuesta HTTP (usando herramientas como Postman)
4. Estructura de la carpeta de reportes en el servidor
5. Ejemplo de registro en la tabla ReportesGenerados

