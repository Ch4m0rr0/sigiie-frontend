# Scripts de Utilidad - SIGIIE Frontend

Este directorio contiene scripts de utilidad para tareas administrativas.

## Asignar Todos los Permisos a un Usuario

### Opción 1: Script de Consola del Navegador (Recomendado)

**Archivo:** `asignar-permisos-consola.js`

**Pasos:**
1. Abre la aplicación en el navegador
2. Inicia sesión como administrador
3. Navega a la página de Usuarios (`/usuarios`)
4. Abre la consola del desarrollador (F12 o clic derecho → Inspeccionar → Consola)
5. Copia todo el contenido del archivo `asignar-permisos-consola.js`
6. Pégalo en la consola y presiona Enter
7. El script buscará automáticamente a `arturo@siguiie.com` y le asignará todos los permisos

**Para cambiar el correo:** Edita la línea `const correo = 'arturo@siguiie.com';` en el script antes de ejecutarlo.

### Opción 2: Usar la Función del Componente

Si tienes acceso al código del componente, puedes llamar directamente a la función:

```typescript
// Desde la consola del navegador (más complejo)
const injector = ng.probe(document.querySelector('app-list-usuarios')).injector;
const usuariosComponent = injector.get(ng.coreTokens.ComponentRef).instance;
usuariosComponent.asignarTodosLosPermisos('arturo@siguiie.com');
```

### Opción 3: Editar Manualmente desde la Interfaz

1. Navega a `/usuarios`
2. Busca el usuario `arturo@siguiie.com`
3. Haz clic en el botón "Editar" (ícono de lápiz)
4. En la sección de "Permisos", marca todos los checkboxes
5. Guarda los cambios

## Notas Importantes

- ⚠️ **Permisos de Administrador**: Necesitas tener permisos de administrador para modificar usuarios
- ⚠️ **Sesión Activa**: Debes estar autenticado en la aplicación
- ⚠️ **Efecto de los Cambios**: El usuario necesitará cerrar sesión y volver a iniciar sesión para que los nuevos permisos surtan efecto
- ✅ **Verificación**: Después de asignar los permisos, puedes verificar en la lista de usuarios haciendo clic en "Ver permisos" junto al usuario

## Solución de Problemas

### Error: "No hay sesión activa"
- Asegúrate de estar autenticado en la aplicación
- Verifica que el token esté en `localStorage` con la clave `siggie_token`

### Error: "Usuario no encontrado"
- Verifica que el correo sea exactamente `arturo@siguiie.com` (puede ser sensible a mayúsculas/minúsculas)
- Asegúrate de que el usuario exista en el sistema

### Error: "No se pudieron cargar los permisos"
- Verifica tu conexión a internet
- Asegúrate de tener permisos para acceder al endpoint de permisos
- Revisa la consola del navegador para más detalles del error

## Contacto

Si tienes problemas con estos scripts, contacta al equipo de desarrollo.

