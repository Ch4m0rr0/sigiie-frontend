# Prompt para Backend: Generación Automática de Código para Subactividades

## Contexto

En el frontend, se ha eliminado la generación de código de subactividad. Ahora el frontend **NO envía** el campo `CodigoSubactividad` al crear una nueva subactividad, dejando que el backend lo genere automáticamente.

## Solicitud

Verificar y asegurar que el backend **genere automáticamente el código de subactividad** al crear una nueva subactividad, usando la **misma lógica** que se utiliza para generar el código de actividades.

### Comportamiento Esperado

1. **Al crear una nueva subactividad:**
   - Si el frontend **NO envía** `CodigoSubactividad` (o lo envía como `null`/`undefined`/vacío), el backend debe generar el código automáticamente.
   - El código debe generarse usando la misma lógica que se usa para actividades (derivado del nombre y demás datos de la subactividad).

2. **Al editar una subactividad existente:**
   - Si el frontend envía `CodigoSubactividad`, el backend debe respetar ese valor (permitir modificación manual del código).

### Endpoints Afectados

- `POST /api/subactividades` - Crear nueva subactividad
- `GET /api/subactividades` - Listar todas las subactividades
- `GET /api/subactividades/{id}` - Obtener una subactividad por ID
- `GET /api/subactividades/actividad/{idActividad}` - Obtener subactividades por actividad

### Verificación

Por favor, confirmar que:
- ✅ El backend genera automáticamente el código cuando `CodigoSubactividad` no se envía o está vacío.
- ✅ La lógica de generación de código es la misma que se usa para actividades.
- ✅ El código generado sigue el mismo formato/patrón que los códigos de actividades.

### Nota

El frontend ahora funciona de la siguiente manera:
- **Crear subactividad**: No envía `codigoSubactividad` → El backend debe generarlo.
- **Editar subactividad**: Solo envía `codigoSubactividad` si el usuario lo ha modificado manualmente.

## IMPORTANTE: Subactividades Existentes

**Problema detectado**: Las subactividades que ya existen en la base de datos no tienen código asignado. 

**Solicitud adicional**: 
- Generar códigos automáticamente para todas las subactividades existentes que no tienen código.
- Esto puede hacerse mediante:
  1. Un script de migración/actualización que recorra todas las subactividades sin código y les asigne uno.
  2. O generar el código "on-the-fly" cuando se consulta una subactividad que no tiene código (lazy generation).

**Recomendación**: Implementar la generación "on-the-fly" para que:
- Las subactividades existentes muestren su código automáticamente al ser consultadas.
- No sea necesario ejecutar un script de migración manual.
- El código se genere usando la misma lógica que para nuevas subactividades.

## CRÍTICO: Campo en la Respuesta

**Problema detectado en producción**: El backend está enviando `codigoActividad` (código de la actividad padre) pero **NO está enviando `codigoSubactividad`** en las respuestas de los endpoints GET.

**Ejemplo del problema**:
```json
{
  "idSubactividad": 9,
  "codigoActividad": "CSUI-2025",  // ✅ Este campo SÍ viene
  "codigoSubactividad": null       // ❌ Este campo NO viene o viene como null
}
```

**Solicitud URGENTE**:
- **TODOS los endpoints GET** que devuelven subactividades deben incluir el campo `codigoSubactividad` en la respuesta.
- Si la subactividad no tiene código en la base de datos, el backend debe generarlo automáticamente antes de enviar la respuesta.
- El campo debe llamarse `codigoSubactividad` (camelCase) o `CodigoSubactividad` (PascalCase) - el frontend acepta ambos formatos.

**Endpoints que deben incluir `codigoSubactividad`**:
- `GET /api/subactividades` - Listar todas
- `GET /api/subactividades/{id}` - Obtener por ID
- `GET /api/subactividades/actividad/{idActividad}` - Obtener por actividad
- Cualquier otro endpoint que devuelva objetos de tipo Subactividad

Si el backend ya tiene esta funcionalidad implementada, solo necesitamos confirmación. Si no, por favor implementarla siguiendo la misma lógica que se usa para actividades.

