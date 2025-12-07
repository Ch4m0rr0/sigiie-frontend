/**
 * Script para asignar todos los permisos a arturo@siguiie.com
 * 
 * INSTRUCCIONES:
 * 1. Abre la aplicación en el navegador
 * 2. Inicia sesión como administrador
 * 3. Navega a la página de Usuarios (/usuarios)
 * 4. Abre la consola del desarrollador (F12)
 * 5. Copia y pega este script completo en la consola
 * 6. Presiona Enter para ejecutar
 */

(async function() {
  const correo = 'arturo@siguiie.com';
  console.log(`🔍 Buscando usuario: ${correo}...`);

  try {
    // Obtener el token de autenticación
    const token = localStorage.getItem('siggie_token');
    if (!token) {
      console.error('❌ No hay sesión activa. Por favor, inicia sesión primero.');
      return;
    }

    const apiUrl = '/api'; // Ajusta según tu configuración

    // 1. Buscar el usuario por correo
    console.log('📋 Cargando usuarios...');
    const usuariosResponse = await fetch(`${apiUrl}/usuarios`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!usuariosResponse.ok) {
      throw new Error(`Error al cargar usuarios: ${usuariosResponse.statusText}`);
    }

    const usuariosData = await usuariosResponse.json();
    const usuarios = usuariosData.data || usuariosData;
    const usuario = Array.isArray(usuarios) 
      ? usuarios.find(u => (u.Correo || u.correo || '').toLowerCase() === correo.toLowerCase())
      : null;

    if (!usuario) {
      console.error(`❌ No se encontró el usuario con correo: ${correo}`);
      return;
    }

    console.log(`✅ Usuario encontrado: ${usuario.NombreCompleto || usuario.nombreCompleto}`);

    // 2. Obtener todos los permisos disponibles
    console.log('🔐 Cargando permisos disponibles...');
    const permisosResponse = await fetch(`${apiUrl}/permisos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!permisosResponse.ok) {
      throw new Error(`Error al cargar permisos: ${permisosResponse.statusText}`);
    }

    const permisosData = await permisosResponse.json();
    const permisos = permisosData.data || permisosData;
    const todosLosPermisos = Array.isArray(permisos) ? permisos : [];

    if (todosLosPermisos.length === 0) {
      console.error('❌ No se pudieron cargar los permisos disponibles.');
      return;
    }

    console.log(`✅ Se encontraron ${todosLosPermisos.length} permisos disponibles`);

    // 3. Obtener roles para el ID del rol
    console.log('👥 Cargando roles...');
    const rolesResponse = await fetch(`${apiUrl}/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!rolesResponse.ok) {
      throw new Error(`Error al cargar roles: ${rolesResponse.statusText}`);
    }

    const rolesData = await rolesResponse.json();
    const roles = rolesData.data || rolesData;
    const rolUsuario = Array.isArray(roles) 
      ? roles.find(r => (r.Nombre || r.nombre) === (usuario.RolNombre || usuario.rolNombre))
      : null;

    if (!rolUsuario) {
      console.error('❌ No se pudo encontrar el rol del usuario.');
      return;
    }

    const idRol = rolUsuario.IdRol || rolUsuario.idRol || rolUsuario.Id || rolUsuario.id;
    const idUsuario = usuario.IdUsuario || usuario.idUsuario || usuario.Id || usuario.id;

    // 4. Preparar los datos para actualizar
    const todosLosPermisosIds = todosLosPermisos.map(p => 
      p.IdPermiso || p.idPermiso || p.Id || p.id
    );

    const updateData = {
      NombreCompleto: usuario.NombreCompleto || usuario.nombreCompleto,
      Correo: usuario.Correo || usuario.correo,
      IdRol: idRol,
      Activo: usuario.Activo !== undefined ? usuario.Activo : (usuario.activo !== undefined ? usuario.activo : true),
      Permisos: todosLosPermisosIds
    };

    if (usuario.DepartamentoId || usuario.departamentoId) {
      updateData.DepartamentoId = usuario.DepartamentoId || usuario.departamentoId;
    }

    console.log(`🔄 Actualizando usuario con ${todosLosPermisosIds.length} permisos...`);

    // 5. Actualizar el usuario
    const updateResponse = await fetch(`${apiUrl}/usuarios/${idUsuario}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Error al actualizar usuario: ${updateResponse.statusText} - ${errorText}`);
    }

    console.log(`✅ ¡Éxito! Se asignaron ${todosLosPermisosIds.length} permisos a ${correo}`);
    console.log('📝 Nota: El usuario necesitará cerrar sesión y volver a iniciar sesión para que los cambios surtan efecto.');
    
    // Recargar la página para ver los cambios
    if (confirm('¿Deseas recargar la página para ver los cambios?')) {
      window.location.reload();
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Detalles:', error.message);
  }
})();

