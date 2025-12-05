# Requerimientos para Edición Completa de Actividades

## Resumen
Necesitamos que al editar una actividad (planificada o no planificada), todos los campos existentes se carguen correctamente en el formulario para poder editarlos.

## Estado Actual

### Campos que SÍ se cargan correctamente:
- ✅ nombreActividad
- ✅ descripcion
- ✅ departamentoId
- ✅ fechaInicio
- ✅ fechaFin
- ✅ horaRealizacion (convertido a formato 12h)
- ✅ idEstadoActividad
- ✅ modalidad
- ✅ idCapacidadInstalada
- ✅ semanaMes
- ✅ codigoActividad
- ✅ objetivo
- ✅ anio
- ✅ cantidadParticipantesProyectados
- ✅ cantidadParticipantesEstudiantesProyectados
- ✅ cantidadTotalParticipantesProtagonistas
- ✅ responsableActividad

### Campos que necesitan corrección:

#### 1. **departamentoResponsableId** (Array de departamentos responsables)
**Problema actual:** Se está usando `departamentoResponsableId` (singular) cuando el backend devuelve `idDepartamentosResponsables` (plural, array).

**Solución Frontend:**
- Usar `data.idDepartamentosResponsables` en lugar de `data.departamentoResponsableId`
- El servicio ya mapea correctamente este campo desde el backend

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdDepartamentosResponsables` como array de números (int[])

#### 2. **idActividadAnual** (Array de actividades anuales)
**Problema actual:** Se está usando `idActividadAnual` (singular) cuando el backend devuelve `idActividadesAnuales` (plural, array).

**Solución Frontend:**
- Usar `data.idActividadesAnuales` en lugar de `data.idActividadAnual`
- El servicio ya mapea correctamente este campo desde el backend

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdActividadesAnuales` como array de números (int[])

#### 3. **idActividadMensualInst** (Array de actividades mensuales)
**Problema actual:** Se está usando `idActividadMensualInst` (singular) cuando el backend devuelve `idActividadesMensualesInst` (plural, array).

**Solución Frontend:**
- Usar `data.idActividadesMensualesInst` en lugar de `data.idActividadMensualInst`
- El servicio ya mapea correctamente este campo desde el backend

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdActividadesMensualesInst` como array de números (int[])

#### 4. **idTipoProtagonista** (Array de tipos de protagonistas)
**Problema actual:** Se está usando `idTipoProtagonista` (singular) cuando el backend devuelve `idTiposProtagonistas` (plural, array).

**Solución Frontend:**
- Usar `data.idTiposProtagonistas` en lugar de `data.idTipoProtagonista`
- El servicio ya mapea correctamente este campo desde el backend

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdTiposProtagonistas` como array de números (int[])

#### 5. **idTipoActividad** (Array de tipos de actividad)
**Problema actual:** Se está usando `idTipoActividad` (singular) cuando puede ser un array.

**Solución Frontend:**
- Verificar si viene como array y manejarlo correctamente
- El servicio ya mapea este campo

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdTipoActividad` como array de números (int[]) si la actividad puede tener múltiples tipos

#### 6. **idTipoEvidencias** (Array de tipos de evidencias)
**Problema actual:** No se está cargando en el formulario de edición.

**Solución Frontend:**
- Agregar `idTipoEvidencias: idTipoEvidenciasArray` al `form.patchValue()`
- El servicio ya mapea correctamente este campo desde el backend

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdTipoEvidencias` como array de números (int[])

#### 7. **idArea** (Área de conocimiento)
**Problema actual:** Se está usando `areaConocimientoId` (legacy) en lugar de `idArea`.

**Solución Frontend:**
- Ya se está mapeando correctamente como `idArea` en el servicio
- Solo necesita usarse en el formulario

#### 8. **idTipoIniciativa**
**Problema actual:** No se está cargando en el formulario de edición.

**Solución Frontend:**
- Agregar `idTipoIniciativa: data.idTipoIniciativa || null` al `form.patchValue()`

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdTipoIniciativa` como número (int)

#### 9. **idNivel**
**Problema actual:** No se está cargando en el formulario de edición.

**Solución Frontend:**
- Agregar `idNivel: data.idNivel || null` al `form.patchValue()`

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdNivel` como número (int)

#### 10. **idTipoDocumento**
**Problema actual:** No se está cargando en el formulario de edición.

**Solución Frontend:**
- Agregar `idTipoDocumento: data.idTipoDocumento || null` al `form.patchValue()`

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `IdTipoDocumento` como número (int)

#### 11. **organizador**
**Problema actual:** No se está cargando en el formulario de edición.

**Solución Frontend:**
- Agregar `organizador: data.organizador || ''` al `form.patchValue()`

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `Organizador` como string

#### 12. **soporteDocumentoUrl**
**Problema actual:** No se está cargando en el formulario de edición.

**Solución Frontend:**
- Agregar `soporteDocumentoUrl: data.soporteDocumentoUrl || null` al `form.patchValue()`

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `SoporteDocumentoUrl` como string

#### 13. **fechaEvento**
**Problema actual:** No se está cargando en el formulario de edición.

**Solución Frontend:**
- Agregar `fechaEvento: data.fechaEvento || ''` al `form.patchValue()`

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver `FechaEvento` como DateOnly (string formato YYYY-MM-DD)

#### 14. **Campos adicionales de planificación (solo para actividades planificadas):**
- `metaAlcanzada`
- `metaCumplimiento`
- `valoracionIndicadorEstrategico`
- `brechaEstrategica`
- `tipoResumenAccion`
- `cantidadMaximaParticipantesEstudiantes`

**Solución Frontend:**
- Agregar estos campos al `form.patchValue()` en el formulario de actividades planificadas

**Requerimiento Backend:**
- El endpoint `GET /api/actividades/{id}` debe devolver estos campos cuando `EsPlanificada = true`

## Resumen de Requerimientos Backend

El endpoint `GET /api/actividades/{id}` debe devolver TODOS los siguientes campos:

### Campos básicos (obligatorios):
- `IdActividad` (int)
- `NombreActividad` (string)
- `Descripcion` (string?)
- `DepartamentoId` (int?)
- `FechaInicio` (DateOnly)
- `FechaFin` (DateOnly)
- `HoraRealizacion` (TimeOnly)
- `IdEstadoActividad` (int)
- `Modalidad` (string)
- `IdCapacidadInstalada` (int?)
- `EsPlanificada` (bool)

### Arrays (deben ser arrays, no valores únicos):
- `IdDepartamentosResponsables` (int[]?) - Array de IDs de departamentos responsables
- `IdActividadesAnuales` (int[]?) - Array de IDs de actividades anuales (solo si es planificada)
- `IdActividadesMensualesInst` (int[]?) - Array de IDs de actividades mensuales (solo si es planificada)
- `IdTiposProtagonistas` (int[]?) - Array de IDs de tipos de protagonistas
- `IdTipoActividad` (int[]?) - Array de IDs de tipos de actividad
- `IdTipoEvidencias` (int[]?) - Array de IDs de tipos de evidencias

### Campos opcionales:
- `IdTipoIniciativa` (int?)
- `IdArea` (int?)
- `IdNivel` (int?)
- `IdTipoDocumento` (int?)
- `Organizador` (string?)
- `SoporteDocumentoUrl` (string?)
- `FechaEvento` (DateOnly?)
- `SemanaMes` (int?)
- `CodigoActividad` (string?)
- `Objetivo` (string?)
- `Anio` (string?)
- `CantidadParticipantesProyectados` (int?)
- `CantidadParticipantesEstudiantesProyectados` (int?)
- `CantidadTotalParticipantesProtagonistas` (int?)
- `ResponsableActividad` (string?)

### Campos de planificación (solo si EsPlanificada = true):
- `IdIndicador` (int)
- `MetaAlcanzada` (decimal?)
- `MetaCumplimiento` (decimal?)
- `ValoracionIndicadorEstrategico` (string?)
- `BrechaEstrategica` (string?)
- `TipoResumenAccion` (string?)
- `CantidadMaximaParticipantesEstudiantes` (int?)

## Cambios Necesarios en Frontend

1. Actualizar `loadActividad()` en `actividad-planificada-form.component.ts` para usar los arrays correctos
2. Actualizar `loadActividad()` en `actividad-no-planificada-form.component.ts` para usar los arrays correctos
3. Agregar todos los campos faltantes al `form.patchValue()` en ambos formularios
4. Asegurar que los formularios tengan todos los campos necesarios en `initializeForm()`

## Notas Importantes

- El servicio `ActividadesService.mapActividad()` ya mapea correctamente todos estos campos desde el backend
- Los formularios ya tienen la mayoría de estos campos definidos, solo necesitan ser cargados correctamente
- Los arrays deben manejarse correctamente: si el backend devuelve un array, usarlo directamente; si devuelve un valor único, convertirlo a array

