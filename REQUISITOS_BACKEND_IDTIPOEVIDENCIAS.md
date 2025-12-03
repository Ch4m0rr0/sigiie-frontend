# Requisitos del Backend para `IdTipoEvidencias`

## Problema Actual

El dropdown de "Tipo de Evidencia" en el formulario de evidencias (cuando se abre desde una actividad) está mostrando **todos los tipos de evidencia disponibles** en lugar de solo los tipos que fueron seleccionados al crear la actividad.

## Causa del Problema

El campo `IdTipoEvidencias` (o `idTipoEvidencias`) **NO está siendo devuelto** en la respuesta del endpoint que lista las actividades (GET `/api/actividades` o similar).

Solo está disponible cuando se obtiene una actividad individual con GET `/api/actividades/{id}`.

## Solución Requerida del Backend

### 1. Endpoint GET de Lista de Actividades

**Endpoint:** `GET /api/actividades` (o el endpoint que uses para listar actividades)

**Requisito:** Incluir el campo `IdTipoEvidencias` en cada objeto de actividad de la respuesta.

**Formato esperado:**
```json
{
  "data": [
    {
      "IdActividad": 1,
      "NombreActividad": "Actividad de ejemplo",
      "IdTipoEvidencias": [2, 4],  // ← ESTE CAMPO ES CRÍTICO
      // ... otros campos
    }
  ]
}
```

**O alternativamente:**
```json
{
  "data": [
    {
      "IdActividad": 1,
      "NombreActividad": "Actividad de ejemplo",
      "IdTipoEvidencias": "[2,4]",  // Como string JSON (se parseará automáticamente)
      // ... otros campos
    }
  ]
}
```

**O si viene como objetos relacionados:**
```json
{
  "data": [
    {
      "IdActividad": 1,
      "NombreActividad": "Actividad de ejemplo",
      "TiposEvidencia": [  // Array de objetos
        { "IdTipoEvidencia": 2, "Nombre": "Fotografía" },
        { "IdTipoEvidencia": 4, "Nombre": "Informe" }
      ],
      // ... otros campos
    }
  ]
}
```

### 2. Formato del Campo

El frontend acepta cualquiera de estos formatos:

- **Array de números:** `[2, 4]`
- **String JSON:** `"[2,4]"`
- **Array de objetos:** `[{IdTipoEvidencia: 2}, {IdTipoEvidencia: 4}]`
- **Campo en PascalCase:** `IdTipoEvidencias`
- **Campo en camelCase:** `idTipoEvidencias`

### 3. Verificación

Para verificar que el backend está devolviendo el campo correctamente:

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network" (Red)
3. Busca la petición GET que lista las actividades
4. Revisa la respuesta JSON
5. Verifica que cada objeto de actividad tenga el campo `IdTipoEvidencias` o `idTipoEvidencias`

### 4. Logs del Frontend

El frontend tiene logs detallados que mostrarán:

- `✅ IdTipoEvidencias encontrado como array (PascalCase):` - Si encuentra el campo como array
- `✅ idTipoEvidencias encontrado como array (camelCase):` - Si encuentra el campo en camelCase
- `✅ IdTipoEvidencias parseado desde string (PascalCase):` - Si lo parsea desde string
- `✅ TiposEvidencia encontrado como objeto, extrayendo IDs:` - Si viene como objetos relacionados

Si no aparece ninguno de estos logs, significa que el campo **NO está en la respuesta del backend**.

## Ejemplo de Respuesta Correcta

```json
{
  "data": [
    {
      "IdActividad": 1,
      "NombreActividad": "Taller de Programación",
      "IdTipoEvidencias": [2, 4],  // ← Fotografía (2) e Informe (4)
      "IdEstadoActividad": 1,
      "FechaInicio": "2024-01-15",
      // ... otros campos
    },
    {
      "IdActividad": 2,
      "NombreActividad": "Conferencia de Matemáticas",
      "IdTipoEvidencias": [1, 2, 3],  // ← Listado (1), Fotografía (2), Proyecto (3)
      "IdEstadoActividad": 2,
      "FechaInicio": "2024-02-20",
      // ... otros campos
    }
  ]
}
```

## Notas Importantes

1. **El campo es opcional:** Si una actividad no tiene tipos de evidencia asignados, puede venir como `null` o `[]` (array vacío).

2. **Consistencia:** El mismo formato que se usa en el endpoint GETById debe usarse en el endpoint GET de lista.

3. **Performance:** Si incluir este campo afecta el rendimiento, considera hacerlo opcional con un query parameter como `?includeTiposEvidencia=true`.

## Contacto

Si necesitas más información sobre cómo el frontend procesa este campo, revisa:
- `src/app/core/services/actividades.service.ts` - Líneas 1195-1244 (función `mapActividad`)
- `src/app/features/actividades/actividades.component.ts` - Líneas 194-233 (signal computado `tiposEvidenciaDeActividad`)

