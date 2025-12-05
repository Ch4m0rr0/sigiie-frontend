# Issue: IdRolResponsable no se guarda ni devuelve correctamente

## Problema

Cuando se crea un `ActividadResponsable` con un `IdRolResponsable` (ej: 2 para "Coordinador"), el backend no está guardando ni devolviendo correctamente este valor.

## Payload que envía el Frontend

```json
{
  "IdActividad": 48,
  "IdTipoResponsable": 1,
  "IdUsuario": 2,
  "IdRolResponsable": 2,  // ✅ Se envía correctamente
  "RolResponsable": "Coordinador",  // ✅ Se envía correctamente
  "FechaAsignacion": "2025-12-05"
}
```

## Respuesta actual del Backend (INCORRECTA)

```json
{
  "idActividadResponsable": 82,
  "idActividad": 48,
  "idUsuario": 2,
  "nombreUsuario": "Arturo Rodríguez",
  "cargo": "Director General del CUR-Carazo",
  "idRolResponsable": null,  // ❌ Debería ser 2
  "nombreRolResponsable": "Responsable",  // ❌ Debería ser "Coordinador"
  "rolResponsable": "Responsable"  // ❌ Debería ser "Coordinador"
}
```

## Respuesta esperada del Backend (CORRECTA)

```json
{
  "idActividadResponsable": 82,
  "idActividad": 48,
  "idUsuario": 2,
  "nombreUsuario": "Arturo Rodríguez",
  "cargo": "Director General del CUR-Carazo",
  "idRolResponsable": 2,  // ✅ ID del catálogo de roles responsables
  "nombreRolResponsable": "Coordinador",  // ✅ Nombre del rol del catálogo
  "rolResponsable": "Coordinador"  // ✅ Mismo que nombreRolResponsable
}
```

## Endpoints afectados

1. **POST `/api/actividad-responsable`** - Crear responsable
   - Recibe: `IdRolResponsable` y `RolResponsable` en el payload
   - Debe: Guardar el `IdRolResponsable` en la base de datos
   - Debe: Devolver el `idRolResponsable` y `nombreRolResponsable` correctos

2. **GET `/api/actividad-responsable/actividad/{idActividad}`** - Obtener responsables
   - Debe: Devolver `idRolResponsable`, `nombreRolResponsable` y `rolResponsable` correctos
   - Actualmente devuelve `null` para `idRolResponsable` y "Responsable" por defecto

## Campos del modelo que deben revisarse

- `IdRolResponsable` (int?) - Debe guardarse cuando se envía en el Create
- `NombreRolResponsable` (string) - Debe obtenerse del catálogo usando `IdRolResponsable`
- `RolResponsable` (string) - Debe ser igual a `NombreRolResponsable`

## Verificaciones necesarias en el Backend

1. ✅ Verificar que el DTO de `ActividadResponsableCreate` acepta `IdRolResponsable`
2. ✅ Verificar que el método `CreateAsync` guarda el `IdRolResponsable` en la base de datos
3. ✅ Verificar que el método `GetByActividadAsync` incluye el `IdRolResponsable` en la consulta
4. ✅ Verificar que se hace JOIN con la tabla de catálogo de roles responsables para obtener `NombreRolResponsable`
5. ✅ Verificar que no hay un valor por defecto "Responsable" que esté sobrescribiendo el valor real

## Ejemplo de consulta esperada

```sql
SELECT 
    ar.IdActividadResponsable,
    ar.IdActividad,
    ar.IdUsuario,
    u.NombreCompleto AS NombreUsuario,
    r.IdRolResponsable,  -- ✅ Debe incluirse
    r.Nombre AS NombreRolResponsable,  -- ✅ Debe obtenerse del catálogo
    r.Nombre AS RolResponsable,  -- ✅ Mismo que NombreRolResponsable
    -- ... otros campos
FROM ActividadResponsable ar
LEFT JOIN Usuario u ON ar.IdUsuario = u.IdUsuario
LEFT JOIN RolResponsable r ON ar.IdRolResponsable = r.IdRolResponsable  -- ✅ JOIN necesario
WHERE ar.IdActividad = @idActividad
```

## Notas adicionales

- El frontend está enviando correctamente `IdRolResponsable: 2` cuando el usuario selecciona "Coordinador"
- El problema está en que el backend no está guardando o no está devolviendo este valor
- Si el backend tiene un valor por defecto "Responsable", debe eliminarse o solo usarse cuando `IdRolResponsable` es `null`

