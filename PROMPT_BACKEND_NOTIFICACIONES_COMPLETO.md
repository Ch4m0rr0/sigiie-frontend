# Prompt para Implementar Backend de Notificaciones Automáticas

## Contexto

El frontend Angular ya tiene implementado un sistema completo de notificaciones con:
- Servicio de notificaciones (`notificaciones.service.ts`)
- Componente de dropdown de notificaciones (`notificaciones.component.ts`)
- Componente de toast/notificaciones emergentes tipo WhatsApp (`toast.component.ts`)
- Servicio de notificaciones automáticas que verifica condiciones periódicamente

El frontend espera los siguientes endpoints en `/api/notificaciones`:
- `GET /api/notificaciones` - Obtener todas las notificaciones del usuario actual
- `PUT /api/notificaciones/{id}/leida` - Marcar una notificación como leída
- `PUT /api/notificaciones/marcar-todas-leidas` - Marcar todas las notificaciones como leídas
- `DELETE /api/notificaciones/{id}` - Eliminar una notificación
- `POST /api/notificaciones` - Crear una nueva notificación (opcional, para uso futuro)

## Reglas de Negocio para Notificaciones Automáticas

El sistema debe generar automáticamente las siguientes notificaciones:

### 1. Actividades que inician en 1 día
- **Condición**: Actividades cuya `FechaInicio` sea exactamente mañana (próximas 24 horas)
- **Tipo**: `info`
- **Título**: "Actividad próxima a iniciar"
- **Mensaje**: "La actividad '{NombreActividad}' inicia mañana"
- **URL**: `/actividades/{IdActividad}`
- **Cuándo generar**: Diariamente, en un job programado que se ejecute una vez al día (recomendado: 8:00 AM)

### 2. Actividades ya terminadas
- **Condición**: Actividades cuya `FechaFin` ya pasó (en los últimos 7 días)
- **Tipo**: `success`
- **Título**: "Actividad finalizada"
- **Mensaje**: "La actividad '{NombreActividad}' finalizó hace X día(s)"
- **URL**: `/actividades/{IdActividad}`
- **Cuándo generar**: Diariamente, para actividades que finalizaron en los últimos 7 días

### 3. Actividades terminadas sin participación
- **Condición**: Actividades cuya `FechaFin` ya pasó Y que NO tienen ninguna participación registrada
- **Tipo**: `warning`
- **Título**: "Actividad sin participación"
- **Mensaje**: "La actividad '{NombreActividad}' finalizó pero no tiene participaciones registradas"
- **URL**: `/actividades/{IdActividad}/participaciones`
- **Cuándo generar**: Diariamente, para actividades terminadas en los últimos 30 días sin participaciones

### 4. Actividades terminadas sin evidencia
- **Condición**: Actividades cuya `FechaFin` ya pasó Y que NO tienen ninguna evidencia registrada
- **Tipo**: `warning`
- **Título**: "Actividad sin evidencia"
- **Mensaje**: "La actividad '{NombreActividad}' finalizó pero no tiene evidencias registradas"
- **URL**: `/actividades/{IdActividad}/evidencias`
- **Cuándo generar**: Diariamente, para actividades terminadas en los últimos 30 días sin evidencias

### 5. Nueva actividad creada
- **Condición**: Cuando se crea una nueva actividad
- **Tipo**: `info`
- **Título**: "Nueva actividad creada"
- **Mensaje**: "Se creó una nueva actividad: '{NombreActividad}' por {NombreCreador}" (si hay roles implementados)
- **URL**: `/actividades/{IdActividad}`
- **Cuándo generar**: Inmediatamente cuando se crea una actividad
- **Destinatarios**: 
  - Todos los usuarios del departamento responsable (si hay roles implementados)
  - O todos los usuarios del sistema (si no hay roles aún)

## Estructura de Datos

### Entidad Notificacion

```csharp
public class Notificacion
{
    public int Id { get; set; }
    public int UsuarioId { get; set; } // Usuario que recibe la notificación
    public string Titulo { get; set; }
    public string Mensaje { get; set; }
    public string Tipo { get; set; } // "info", "success", "warning", "error"
    public DateTime Fecha { get; set; }
    public bool Leida { get; set; }
    public string? Url { get; set; } // Opcional - URL para navegar cuando se hace clic
    public DateTime FechaCreacion { get; set; }
    public string? CodigoNotificacion { get; set; } // Para evitar duplicados (ej: "inicio-123", "sin-participacion-456")
    
    // Relación con Usuario
    public Usuario? Usuario { get; set; }
}
```

### DTOs

```csharp
// DTO para respuesta
public class NotificacionDto
{
    public int Id { get; set; }
    public string Titulo { get; set; }
    public string Mensaje { get; set; }
    public string Tipo { get; set; }
    public DateTime Fecha { get; set; }
    public bool Leida { get; set; }
    public string? Url { get; set; }
}

// DTO para crear notificación
public class CrearNotificacionDto
{
    public int UsuarioId { get; set; }
    public string Titulo { get; set; }
    public string Mensaje { get; set; }
    public string Tipo { get; set; }
    public string? Url { get; set; }
    public string? CodigoNotificacion { get; set; } // Para evitar duplicados
}

// DTO para crear notificación masiva (para múltiples usuarios)
public class CrearNotificacionMasivaDto
{
    public List<int> UsuarioIds { get; set; } = new();
    public string Titulo { get; set; }
    public string Mensaje { get; set; }
    public string Tipo { get; set; }
    public string? Url { get; set; }
    public string? CodigoNotificacion { get; set; }
}
```

## Implementación Paso a Paso

### Paso 1: Crear la Entidad y Migración

1. Crear la entidad `Notificacion` con todos los campos mencionados
2. Agregar `DbSet<Notificacion>` al `DbContext`
3. Crear y ejecutar migración:
   ```bash
   dotnet ef migrations add AgregarNotificaciones
   dotnet ef database update
   ```

4. Configurar índices en `OnModelCreating`:
   ```csharp
   modelBuilder.Entity<Notificacion>()
       .HasIndex(n => new { n.UsuarioId, n.Leida })
       .HasDatabaseName("IX_Notificaciones_UsuarioId_Leida");
       
   modelBuilder.Entity<Notificacion>()
       .HasIndex(n => n.Fecha)
       .HasDatabaseName("IX_Notificaciones_Fecha");
       
   modelBuilder.Entity<Notificacion>()
       .HasIndex(n => n.CodigoNotificacion)
       .HasDatabaseName("IX_Notificaciones_CodigoNotificacion");
   ```

### Paso 2: Crear el Servicio de Notificaciones

```csharp
public interface INotificacionesService
{
    Task<IEnumerable<NotificacionDto>> ObtenerNotificacionesPorUsuarioAsync(int usuarioId);
    Task<NotificacionDto?> ObtenerNotificacionPorIdAsync(int id, int usuarioId);
    Task<bool> MarcarComoLeidaAsync(int id, int usuarioId);
    Task<bool> MarcarTodasComoLeidasAsync(int usuarioId);
    Task<bool> EliminarNotificacionAsync(int id, int usuarioId);
    Task<NotificacionDto> CrearNotificacionAsync(CrearNotificacionDto dto);
    Task<int> ObtenerContadorNoLeidasAsync(int usuarioId);
    Task CrearNotificacionMasivaAsync(CrearNotificacionMasivaDto dto);
    Task<bool> ExisteNotificacionPorCodigoAsync(string codigoNotificacion, int usuarioId);
}
```

**Implementación del servicio:**

```csharp
public class NotificacionesService : INotificacionesService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NotificacionesService> _logger;

    public NotificacionesService(ApplicationDbContext context, ILogger<NotificacionesService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<NotificacionDto>> ObtenerNotificacionesPorUsuarioAsync(int usuarioId)
    {
        var notificaciones = await _context.Notificaciones
            .Where(n => n.UsuarioId == usuarioId)
            .OrderByDescending(n => n.Fecha)
            .Select(n => new NotificacionDto
            {
                Id = n.Id,
                Titulo = n.Titulo,
                Mensaje = n.Mensaje,
                Tipo = n.Tipo,
                Fecha = n.Fecha,
                Leida = n.Leida,
                Url = n.Url
            })
            .ToListAsync();

        return notificaciones;
    }

    public async Task<NotificacionDto?> ObtenerNotificacionPorIdAsync(int id, int usuarioId)
    {
        var notificacion = await _context.Notificaciones
            .Where(n => n.Id == id && n.UsuarioId == usuarioId)
            .Select(n => new NotificacionDto
            {
                Id = n.Id,
                Titulo = n.Titulo,
                Mensaje = n.Mensaje,
                Tipo = n.Tipo,
                Fecha = n.Fecha,
                Leida = n.Leida,
                Url = n.Url
            })
            .FirstOrDefaultAsync();

        return notificacion;
    }

    public async Task<bool> MarcarComoLeidaAsync(int id, int usuarioId)
    {
        var notificacion = await _context.Notificaciones
            .FirstOrDefaultAsync(n => n.Id == id && n.UsuarioId == usuarioId);

        if (notificacion == null)
        {
            return false;
        }

        notificacion.Leida = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarcarTodasComoLeidasAsync(int usuarioId)
    {
        var notificaciones = await _context.Notificaciones
            .Where(n => n.UsuarioId == usuarioId && !n.Leida)
            .ToListAsync();

        foreach (var notificacion in notificaciones)
        {
            notificacion.Leida = true;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarNotificacionAsync(int id, int usuarioId)
    {
        var notificacion = await _context.Notificaciones
            .FirstOrDefaultAsync(n => n.Id == id && n.UsuarioId == usuarioId);

        if (notificacion == null)
        {
            return false;
        }

        _context.Notificaciones.Remove(notificacion);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<NotificacionDto> CrearNotificacionAsync(CrearNotificacionDto dto)
    {
        var notificacion = new Notificacion
        {
            UsuarioId = dto.UsuarioId,
            Titulo = dto.Titulo,
            Mensaje = dto.Mensaje,
            Tipo = dto.Tipo,
            Fecha = DateTime.UtcNow,
            Leida = false,
            Url = dto.Url,
            CodigoNotificacion = dto.CodigoNotificacion,
            FechaCreacion = DateTime.UtcNow
        };

        _context.Notificaciones.Add(notificacion);
        await _context.SaveChangesAsync();

        return new NotificacionDto
        {
            Id = notificacion.Id,
            Titulo = notificacion.Titulo,
            Mensaje = notificacion.Mensaje,
            Tipo = notificacion.Tipo,
            Fecha = notificacion.Fecha,
            Leida = notificacion.Leida,
            Url = notificacion.Url
        };
    }

    public async Task<int> ObtenerContadorNoLeidasAsync(int usuarioId)
    {
        return await _context.Notificaciones
            .CountAsync(n => n.UsuarioId == usuarioId && !n.Leida);
    }

    public async Task CrearNotificacionMasivaAsync(CrearNotificacionMasivaDto dto)
    {
        var notificaciones = dto.UsuarioIds.Select(usuarioId => new Notificacion
        {
            UsuarioId = usuarioId,
            Titulo = dto.Titulo,
            Mensaje = dto.Mensaje,
            Tipo = dto.Tipo,
            Fecha = DateTime.UtcNow,
            Leida = false,
            Url = dto.Url,
            CodigoNotificacion = dto.CodigoNotificacion,
            FechaCreacion = DateTime.UtcNow
        }).ToList();

        _context.Notificaciones.AddRange(notificaciones);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExisteNotificacionPorCodigoAsync(string codigoNotificacion, int usuarioId)
    {
        return await _context.Notificaciones
            .AnyAsync(n => n.CodigoNotificacion == codigoNotificacion && n.UsuarioId == usuarioId);
    }
}
```

**Registrar el servicio:**
```csharp
builder.Services.AddScoped<INotificacionesService, NotificacionesService>();
```

### Paso 3: Crear el Controlador

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificacionesController : ControllerBase
{
    private readonly INotificacionesService _notificacionesService;
    private readonly ILogger<NotificacionesController> _logger;

    public NotificacionesController(
        INotificacionesService notificacionesService,
        ILogger<NotificacionesController> logger)
    {
        _notificacionesService = notificacionesService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificacionDto>>> GetNotificaciones()
    {
        try
        {
            var usuarioId = ObtenerUsuarioId();
            if (usuarioId == null)
            {
                return Unauthorized("Usuario no autenticado");
            }

            var notificaciones = await _notificacionesService
                .ObtenerNotificacionesPorUsuarioAsync(usuarioId.Value);

            return Ok(new { data = notificaciones });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener notificaciones");
            return StatusCode(500, new { message = "Error al obtener notificaciones" });
        }
    }

    [HttpPut("{id}/leida")]
    public async Task<ActionResult> MarcarComoLeida(int id)
    {
        try
        {
            var usuarioId = ObtenerUsuarioId();
            if (usuarioId == null)
            {
                return Unauthorized("Usuario no autenticado");
            }

            var resultado = await _notificacionesService.MarcarComoLeidaAsync(id, usuarioId.Value);
            if (!resultado)
            {
                return NotFound(new { message = "Notificación no encontrada" });
            }

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al marcar notificación como leída");
            return StatusCode(500, new { message = "Error al marcar notificación como leída" });
        }
    }

    [HttpPut("marcar-todas-leidas")]
    public async Task<ActionResult> MarcarTodasComoLeidas()
    {
        try
        {
            var usuarioId = ObtenerUsuarioId();
            if (usuarioId == null)
            {
                return Unauthorized("Usuario no autenticado");
            }

            await _notificacionesService.MarcarTodasComoLeidasAsync(usuarioId.Value);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al marcar todas las notificaciones como leídas");
            return StatusCode(500, new { message = "Error al marcar todas las notificaciones como leídas" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> EliminarNotificacion(int id)
    {
        try
        {
            var usuarioId = ObtenerUsuarioId();
            if (usuarioId == null)
            {
                return Unauthorized("Usuario no autenticado");
            }

            var resultado = await _notificacionesService.EliminarNotificacionAsync(id, usuarioId.Value);
            if (!resultado)
            {
                return NotFound(new { message = "Notificación no encontrada" });
            }

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al eliminar notificación");
            return StatusCode(500, new { message = "Error al eliminar notificación" });
        }
    }

    [HttpGet("contador-no-leidas")]
    public async Task<ActionResult<int>> GetContadorNoLeidas()
    {
        try
        {
            var usuarioId = ObtenerUsuarioId();
            if (usuarioId == null)
            {
                return Unauthorized("Usuario no autenticado");
            }

            var contador = await _notificacionesService.ObtenerContadorNoLeidasAsync(usuarioId.Value);
            return Ok(new { count = contador });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener contador de notificaciones no leídas");
            return StatusCode(500, new { message = "Error al obtener contador" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<NotificacionDto>> CrearNotificacion(CrearNotificacionDto dto)
    {
        try
        {
            var notificacion = await _notificacionesService.CrearNotificacionAsync(dto);
            return CreatedAtAction(nameof(GetNotificaciones), new { id = notificacion.Id }, notificacion);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear notificación");
            return StatusCode(500, new { message = "Error al crear notificación" });
        }
    }

    private int? ObtenerUsuarioId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
            ?? User.FindFirst("sub")?.Value 
            ?? User.FindFirst("userId")?.Value;

        if (int.TryParse(userIdClaim, out int userId))
        {
            return userId;
        }

        return null;
    }
}
```

### Paso 4: Crear el Servicio de Notificaciones Automáticas (Background Service)

```csharp
public interface INotificacionesAutomaticasService
{
    Task GenerarNotificacionesActividadesQueInicianAsync();
    Task GenerarNotificacionesActividadesTerminadasAsync();
    Task GenerarNotificacionesActividadesSinParticipacionAsync();
    Task GenerarNotificacionesActividadesSinEvidenciaAsync();
    Task NotificarNuevaActividadAsync(int actividadId, int? creadorId = null);
}

public class NotificacionesAutomaticasService : INotificacionesAutomaticasService
{
    private readonly INotificacionesService _notificacionesService;
    private readonly IActividadesService _actividadesService;
    private readonly IParticipacionesService _participacionesService;
    private readonly IEvidenciasService _evidenciasService;
    private readonly IUsuariosService _usuariosService; // Para obtener usuarios del departamento
    private readonly ILogger<NotificacionesAutomaticasService> _logger;

    public NotificacionesAutomaticasService(
        INotificacionesService notificacionesService,
        IActividadesService actividadesService,
        IParticipacionesService participacionesService,
        IEvidenciasService evidenciasService,
        IUsuariosService usuariosService,
        ILogger<NotificacionesAutomaticasService> logger)
    {
        _notificacionesService = notificacionesService;
        _actividadesService = actividadesService;
        _participacionesService = participacionesService;
        _evidenciasService = evidenciasService;
        _usuariosService = usuariosService;
        _logger = logger;
    }

    public async Task GenerarNotificacionesActividadesQueInicianAsync()
    {
        try
        {
            var ahora = DateTime.UtcNow;
            var mañana = ahora.AddDays(1).Date;

            // Obtener actividades que inician mañana
            var actividades = await _actividadesService.ObtenerActividadesPorFechaInicioAsync(mañana, mañana.AddDays(1).AddTicks(-1));

            foreach (var actividad in actividades)
            {
                // Obtener usuarios del departamento responsable
                var usuariosIds = await ObtenerUsuariosParaNotificarAsync(actividad);

                foreach (var usuarioId in usuariosIds)
                {
                    var codigoNotificacion = $"inicio-{actividad.Id}-{usuarioId}";
                    
                    // Verificar si ya existe esta notificación
                    if (await _notificacionesService.ExisteNotificacionPorCodigoAsync(codigoNotificacion, usuarioId))
                    {
                        continue;
                    }

                    var dto = new CrearNotificacionDto
                    {
                        UsuarioId = usuarioId,
                        Titulo = "Actividad próxima a iniciar",
                        Mensaje = $"La actividad \"{actividad.NombreActividad}\" inicia mañana",
                        Tipo = "info",
                        Url = $"/actividades/{actividad.Id}",
                        CodigoNotificacion = codigoNotificacion
                    };

                    await _notificacionesService.CrearNotificacionAsync(dto);
                }
            }

            _logger.LogInformation($"Generadas notificaciones para {actividades.Count} actividades que inician mañana");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generando notificaciones de actividades que inician");
        }
    }

    public async Task GenerarNotificacionesActividadesTerminadasAsync()
    {
        try
        {
            var ahora = DateTime.UtcNow;
            var hace7Dias = ahora.AddDays(-7);

            // Obtener actividades terminadas en los últimos 7 días
            var actividades = await _actividadesService.ObtenerActividadesTerminadasAsync(hace7Dias, ahora);

            foreach (var actividad in actividades)
            {
                var fechaFin = actividad.FechaFin ?? actividad.FechaEvento;
                if (fechaFin == null) continue;

                var diasTranscurridos = (int)(ahora - fechaFin.Value).TotalDays;

                var usuariosIds = await ObtenerUsuariosParaNotificarAsync(actividad);

                foreach (var usuarioId in usuariosIds)
                {
                    var codigoNotificacion = $"terminada-{actividad.Id}-{usuarioId}";
                    
                    if (await _notificacionesService.ExisteNotificacionPorCodigoAsync(codigoNotificacion, usuarioId))
                    {
                        continue;
                    }

                    var dto = new CrearNotificacionDto
                    {
                        UsuarioId = usuarioId,
                        Titulo = "Actividad finalizada",
                        Mensaje = $"La actividad \"{actividad.NombreActividad}\" finalizó hace {diasTranscurridos} día{(diasTranscurridos > 1 ? "s" : "")}",
                        Tipo = "success",
                        Url = $"/actividades/{actividad.Id}",
                        CodigoNotificacion = codigoNotificacion
                    };

                    await _notificacionesService.CrearNotificacionAsync(dto);
                }
            }

            _logger.LogInformation($"Generadas notificaciones para {actividades.Count} actividades terminadas");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generando notificaciones de actividades terminadas");
        }
    }

    public async Task GenerarNotificacionesActividadesSinParticipacionAsync()
    {
        try
        {
            var ahora = DateTime.UtcNow;
            var hace30Dias = ahora.AddDays(-30);

            // Obtener actividades terminadas en los últimos 30 días
            var actividades = await _actividadesService.ObtenerActividadesTerminadasAsync(hace30Dias, ahora);

            foreach (var actividad in actividades)
            {
                // Verificar si tiene participaciones
                var participaciones = await _participacionesService.ObtenerPorActividadAsync(actividad.Id);
                
                if (participaciones.Any()) continue;

                var usuariosIds = await ObtenerUsuariosParaNotificarAsync(actividad);

                foreach (var usuarioId in usuariosIds)
                {
                    var codigoNotificacion = $"sin-participacion-{actividad.Id}-{usuarioId}";
                    
                    if (await _notificacionesService.ExisteNotificacionPorCodigoAsync(codigoNotificacion, usuarioId))
                    {
                        continue;
                    }

                    var dto = new CrearNotificacionDto
                    {
                        UsuarioId = usuarioId,
                        Titulo = "Actividad sin participación",
                        Mensaje = $"La actividad \"{actividad.NombreActividad}\" finalizó pero no tiene participaciones registradas",
                        Tipo = "warning",
                        Url = $"/actividades/{actividad.Id}/participaciones",
                        CodigoNotificacion = codigoNotificacion
                    };

                    await _notificacionesService.CrearNotificacionAsync(dto);
                }
            }

            _logger.LogInformation("Generadas notificaciones de actividades sin participación");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generando notificaciones de actividades sin participación");
        }
    }

    public async Task GenerarNotificacionesActividadesSinEvidenciaAsync()
    {
        try
        {
            var ahora = DateTime.UtcNow;
            var hace30Dias = ahora.AddDays(-30);

            var actividades = await _actividadesService.ObtenerActividadesTerminadasAsync(hace30Dias, ahora);

            foreach (var actividad in actividades)
            {
                // Verificar si tiene evidencias
                var evidencias = await _evidenciasService.ObtenerPorActividadAsync(actividad.Id);
                
                if (evidencias.Any()) continue;

                var usuariosIds = await ObtenerUsuariosParaNotificarAsync(actividad);

                foreach (var usuarioId in usuariosIds)
                {
                    var codigoNotificacion = $"sin-evidencia-{actividad.Id}-{usuarioId}";
                    
                    if (await _notificacionesService.ExisteNotificacionPorCodigoAsync(codigoNotificacion, usuarioId))
                    {
                        continue;
                    }

                    var dto = new CrearNotificacionDto
                    {
                        UsuarioId = usuarioId,
                        Titulo = "Actividad sin evidencia",
                        Mensaje = $"La actividad \"{actividad.NombreActividad}\" finalizó pero no tiene evidencias registradas",
                        Tipo = "warning",
                        Url = $"/actividades/{actividad.Id}/evidencias",
                        CodigoNotificacion = codigoNotificacion
                    };

                    await _notificacionesService.CrearNotificacionAsync(dto);
                }
            }

            _logger.LogInformation("Generadas notificaciones de actividades sin evidencia");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generando notificaciones de actividades sin evidencia");
        }
    }

    public async Task NotificarNuevaActividadAsync(int actividadId, int? creadorId = null)
    {
        try
        {
            var actividad = await _actividadesService.ObtenerPorIdAsync(actividadId);
            if (actividad == null) return;

            string nombreCreador = null;
            if (creadorId.HasValue)
            {
                var creador = await _usuariosService.ObtenerPorIdAsync(creadorId.Value);
                nombreCreador = creador?.NombreCompleto;
            }

            var mensaje = nombreCreador != null
                ? $"Se creó una nueva actividad: \"{actividad.NombreActividad}\" por {nombreCreador}"
                : $"Se creó una nueva actividad: \"{actividad.NombreActividad}\"";

            // Obtener usuarios a notificar (departamento responsable o todos)
            var usuariosIds = await ObtenerUsuariosParaNotificarAsync(actividad);

            var dto = new CrearNotificacionMasivaDto
            {
                UsuarioIds = usuariosIds,
                Titulo = "Nueva actividad creada",
                Mensaje = mensaje,
                Tipo = "info",
                Url = $"/actividades/{actividadId}",
                CodigoNotificacion = $"nueva-actividad-{actividadId}"
            };

            await _notificacionesService.CrearNotificacionMasivaAsync(dto);

            _logger.LogInformation($"Notificada nueva actividad {actividadId} a {usuariosIds.Count} usuarios");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error notificando nueva actividad {actividadId}");
        }
    }

    private async Task<List<int>> ObtenerUsuariosParaNotificarAsync(Actividad actividad)
    {
        // Si hay departamento responsable, notificar a usuarios de ese departamento
        if (actividad.DepartamentoResponsableId.HasValue)
        {
            return await _usuariosService.ObtenerIdsPorDepartamentoAsync(actividad.DepartamentoResponsableId.Value);
        }

        // Si no, notificar a todos los usuarios activos (ajustar según tu lógica de negocio)
        return await _usuariosService.ObtenerTodosIdsActivosAsync();
    }
}
```

**Registrar el servicio:**
```csharp
builder.Services.AddScoped<INotificacionesAutomaticasService, NotificacionesAutomaticasService>();
```

### Paso 5: Crear Background Service (Hangfire/Quartz/IHostedService)

**Opción A: Usando IHostedService (recomendado para empezar)**

```csharp
public class NotificacionesBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NotificacionesBackgroundService> _logger;
    private readonly TimeSpan _periodo = TimeSpan.FromHours(24); // Ejecutar cada 24 horas

    public NotificacionesBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<NotificacionesBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var notificacionesAutomaticas = scope.ServiceProvider
                    .GetRequiredService<INotificacionesAutomaticasService>();

                _logger.LogInformation("Iniciando generación de notificaciones automáticas");

                // Ejecutar todas las verificaciones
                await notificacionesAutomaticas.GenerarNotificacionesActividadesQueInicianAsync();
                await notificacionesAutomaticas.GenerarNotificacionesActividadesTerminadasAsync();
                await notificacionesAutomaticas.GenerarNotificacionesActividadesSinParticipacionAsync();
                await notificacionesAutomaticas.GenerarNotificacionesActividadesSinEvidenciaAsync();

                _logger.LogInformation("Generación de notificaciones automáticas completada");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en el servicio de notificaciones automáticas");
            }

            // Esperar hasta la próxima ejecución (24 horas)
            await Task.Delay(_periodo, stoppingToken);
        }
    }
}
```

**Registrar el background service:**
```csharp
builder.Services.AddHostedService<NotificacionesBackgroundService>();
```

**Opción B: Usando Hangfire (más robusto para producción)**

```csharp
// En Program.cs o Startup.cs
builder.Services.AddHangfire(config => config
    .UseSqlServerStorage(connectionString));

builder.Services.AddHangfireServer();

// Configurar jobs recurrentes
app.UseHangfireDashboard();

RecurringJob.AddOrUpdate(
    "notificaciones-actividades-que-inician",
    () => GenerarNotificacionesActividadesQueInician(),
    Cron.Daily(8)); // Ejecutar diariamente a las 8 AM

RecurringJob.AddOrUpdate(
    "notificaciones-actividades-terminadas",
    () => GenerarNotificacionesActividadesTerminadas(),
    Cron.Daily(8));

RecurringJob.AddOrUpdate(
    "notificaciones-sin-participacion",
    () => GenerarNotificacionesActividadesSinParticipacion(),
    Cron.Daily(8));

RecurringJob.AddOrUpdate(
    "notificaciones-sin-evidencia",
    () => GenerarNotificacionesActividadesSinEvidencia(),
    Cron.Daily(8));
```

### Paso 6: Integrar con el Servicio de Actividades

Cuando se crea una nueva actividad, llamar al servicio de notificaciones automáticas:

```csharp
// En ActividadesController o ActividadesService
public async Task<ActionResult<ActividadDto>> CrearActividad(CrearActividadDto dto)
{
    // ... lógica de creación ...
    
    var actividad = await _actividadesService.CrearAsync(dto);
    
    // Notificar a los usuarios
    var usuarioId = ObtenerUsuarioId(); // Obtener del contexto actual
    await _notificacionesAutomaticas.NotificarNuevaActividadAsync(actividad.Id, usuarioId);
    
    return CreatedAtAction(nameof(GetActividad), new { id = actividad.Id }, actividad);
}
```

## Checklist de Implementación

- [ ] Crear entidad `Notificacion` con campo `CodigoNotificacion`
- [ ] Agregar `DbSet<Notificacion>` al `DbContext`
- [ ] Crear y ejecutar migración con índices
- [ ] Crear DTOs (`NotificacionDto`, `CrearNotificacionDto`, `CrearNotificacionMasivaDto`)
- [ ] Crear interfaz `INotificacionesService`
- [ ] Implementar `NotificacionesService` con método `ExisteNotificacionPorCodigoAsync`
- [ ] Crear interfaz `INotificacionesAutomaticasService`
- [ ] Implementar `NotificacionesAutomaticasService` con todos los métodos
- [ ] Crear `NotificacionesController` con todos los endpoints
- [ ] Crear `NotificacionesBackgroundService` (IHostedService) o configurar Hangfire
- [ ] Integrar notificación de nueva actividad en el servicio de actividades
- [ ] Implementar método `ObtenerUsuariosParaNotificarAsync` según tu lógica de roles/departamentos
- [ ] Probar todos los endpoints
- [ ] Verificar que las notificaciones se generan correctamente
- [ ] Verificar que no se duplican notificaciones (usando `CodigoNotificacion`)

## Notas Importantes

1. **Evitar duplicados**: El campo `CodigoNotificacion` previene notificaciones duplicadas. Usa formato: `"tipo-{actividadId}-{usuarioId}"`

2. **Performance**: Para muchos usuarios, considera procesar las notificaciones masivas en lotes

3. **Zona horaria**: Usa `DateTime.UtcNow` para consistencia

4. **Limpieza**: Considera un job que elimine notificaciones antiguas (ej: mayores a 90 días)

5. **Roles y permisos**: Ajusta `ObtenerUsuariosParaNotificarAsync` según tu sistema de roles cuando esté implementado

6. **Notificaciones en tiempo real**: Para el futuro, considera SignalR para notificaciones push en tiempo real

---

**Una vez completado, el frontend se conectará automáticamente y las notificaciones se generarán según las reglas de negocio definidas.**

