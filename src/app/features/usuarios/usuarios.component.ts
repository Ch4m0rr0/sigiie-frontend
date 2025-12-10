import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { Usuario } from '../../core/models/usuario';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { finalize } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-list-usuarios',
  imports: [CommonModule, FormsModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './usuarios.component.html',
})
export class ListUsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private searchTimeout: any;

  busqueda = signal<string>('');
  busquedaDebounced = signal<string>('');
  usuarios = signal<Usuario[]>([]);
  loading = signal(false);
  deletingId = signal<number | null>(null);
  error = signal<string | null>(null);
  lastLoadTime = signal<Date | null>(null);

  usuariosFiltrados = computed<Usuario[]>(() => {
    const usuarios = this.usuarios();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    if (!busqueda) return usuarios;
    return usuarios.filter(u => 
      u.nombreCompleto?.toLowerCase().includes(busqueda) ||
      u.correo?.toLowerCase().includes(busqueda) ||
      u.rolNombre?.toLowerCase().includes(busqueda)
    );
  });

  estadisticas = computed(() => ({
    total: this.usuarios().length,
    activos: this.usuarios().filter(u => u.activo).length,
    inactivos: this.usuarios().filter(u => !u.activo).length
  }));

  ngOnInit() {
    this.loadUsuarios();
  }

  onBusquedaChange(value: string) {
    this.busqueda.set(value);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.busquedaDebounced.set(value);
    }, 300);
  }

  loadUsuarios() {
    this.error.set(null);
    this.loading.set(true);
    console.log('🔄 Cargando usuarios...');
    
    this.usuariosService.getAll().pipe(
      finalize(() => {
        this.loading.set(false);
        this.lastLoadTime.set(new Date());
        console.log('✅ Carga de usuarios finalizada');
      })
    ).subscribe({
      next: (data) => {
        console.log(`📊 Usuarios recibidos: ${data?.length || 0}`, data);
        this.usuarios.set(data || []);
        
        if (!data || data.length === 0) {
          console.warn('⚠️ No se recibieron usuarios del backend');
          this.error.set('No hay usuarios en el sistema o no se pudieron cargar.');
        } else {
          console.log(`✅ Se cargaron ${data.length} usuarios correctamente`);
        }
      },
      error: (err) => {
        console.error('❌ Error loading usuarios:', err);
        console.error('Detalles del error:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error
        });
        
        let errorMessage = 'Error al cargar usuarios.';
        
        if (err.status === 403) {
          errorMessage = 'No tienes permisos para ver usuarios. Necesitas el permiso "usuarios.ver".';
        } else if (err.status === 401) {
          errorMessage = 'No estás autenticado. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 404) {
          errorMessage = 'El endpoint de usuarios no fue encontrado.';
        } else if (err.status >= 500) {
          errorMessage = 'Error del servidor al cargar usuarios. Por favor, intenta más tarde.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        
        this.error.set(errorMessage);
        this.usuarios.set([]); // Asegurar que el array esté vacío en caso de error
      }
    });
  }

  onAddNew() {
    this.router.navigate(['/usuarios/nuevo']);
  }

  onEdit(id: any): void {
    const usuarioId = Number(id) || 0;
    if (!usuarioId || usuarioId === 0) {
      console.error('ID inválido para editar:', usuarioId);
      return;
    }
    this.router.navigate(['/usuarios/editar', usuarioId]);
  }

  onDelete(id: any): void {
    const usuarioId = Number(id) || 0;
    if (!usuarioId || usuarioId === 0) {
      console.error('ID inválido para eliminar:', usuarioId);
      return;
    }
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }
    this.deletingId.set(usuarioId);
    this.usuariosService.delete(usuarioId).subscribe({
      next: (success) => {
        if (success) {
          this.loadUsuarios();
        } else {
          this.error.set('Error al eliminar el usuario.');
        }
        this.deletingId.set(null);
      },
      error: (err) => {
        console.error('Error deleting usuario:', err);
        this.error.set('Error al eliminar el usuario.');
        this.deletingId.set(null);
      }
    });
  }

  getLastLoadTime(): string {
    const time = this.lastLoadTime();
    if (!time) return '';
    return new Intl.DateTimeFormat('es-NI', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(time);
  }

  getUsuarioId(usuario: Usuario): number {
    if (typeof usuario.idUsuario === 'number' && usuario.idUsuario > 0) {
      return usuario.idUsuario;
    }
    if (typeof usuario.id === 'number' && usuario.id > 0) {
      return usuario.id;
    }
    return 0;
  }


  /**
   * Asigna todos los permisos disponibles a un usuario por su correo electrónico
   * @param correo Correo electrónico del usuario
   */
  async asignarTodosLosPermisos(correo: string): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      console.log(`🔍 Buscando usuario: ${correo}...`);

      // 1. Buscar el usuario por correo
      const usuarios = await firstValueFrom(this.usuariosService.getAll());
      if (!usuarios || usuarios.length === 0) {
        this.error.set('Error al cargar usuarios o no hay usuarios en el sistema.');
        this.loading.set(false);
        return;
      }

      const usuario = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase());
      if (!usuario) {
        this.error.set(`No se encontró el usuario con correo: ${correo}`);
        console.error(`❌ Usuario no encontrado. Usuarios disponibles:`, usuarios.map(u => u.correo));
        this.loading.set(false);
        return;
      }

      console.log(`✅ Usuario encontrado: ${usuario.nombreCompleto} (ID: ${usuario.idUsuario})`);

      // 2. Obtener todos los permisos disponibles
      const permisos = await firstValueFrom(this.usuariosService.listPermisos());
      if (!permisos || permisos.length === 0) {
        this.error.set('No se pudieron cargar los permisos disponibles.');
        console.error('❌ No se encontraron permisos en el sistema');
        this.loading.set(false);
        return;
      }

      console.log(`✅ Se encontraron ${permisos.length} permisos disponibles`);

      // 3. Obtener el ID del usuario
      const usuarioId = this.getUsuarioId(usuario);
      if (!usuarioId || usuarioId === 0) {
        this.error.set('ID de usuario inválido.');
        console.error(`❌ ID inválido: ${usuarioId}`);
        this.loading.set(false);
        return;
      }

      // 4. Buscar el rol de administrador (ID 1 o por nombre)
      const roles = await firstValueFrom(this.usuariosService.listRoles());
      if (!roles || roles.length === 0) {
        this.error.set('No se pudieron cargar los roles.');
        console.error('❌ No se encontraron roles en el sistema');
        this.loading.set(false);
        return;
      }

      // Buscar el rol de administrador: primero por ID 1, luego por nombre
      let rolAdmin = roles.find(r => r.id === 1);
      if (!rolAdmin) {
        // Si no hay ID 1, buscar por nombres comunes de administrador
        rolAdmin = roles.find(r => 
          r.nombre.toLowerCase().includes('admin') || 
          r.nombre.toLowerCase().includes('administrador')
        );
      }

      if (!rolAdmin) {
        this.error.set('No se encontró el rol de administrador en el sistema.');
        console.error(`❌ Rol de administrador no encontrado. Roles disponibles:`, roles.map(r => `${r.nombre} (ID: ${r.id})`));
        this.loading.set(false);
        return;
      }

      console.log(`✅ Rol de administrador encontrado: ${rolAdmin.nombre} (ID: ${rolAdmin.id})`);
      console.log(`ℹ️ El backend asignará todos los permisos automáticamente al asignar este rol.`);

      // 5. Actualizar el usuario asignando el rol de administrador
      // NO enviamos permisos individuales, solo el rol (el backend los asigna automáticamente)
      const updateData = {
        nombreCompleto: usuario.nombreCompleto,
        correo: usuario.correo,
        idRol: Number(rolAdmin.id), // Asignar rol de administrador
        activo: usuario.activo,
        departamentoId: usuario.departamentoId
        // NO incluimos permisos - el backend los asigna automáticamente según el rol
      };

      console.log('📤 Datos a enviar (solo rol, sin permisos individuales):', JSON.stringify(updateData, null, 2));
      console.log('🔔 Llamando a usuariosService.update()...');

      this.usuariosService.update(usuarioId, updateData).subscribe({
        next: async (success) => {
          console.log(`🔔🔔🔔 Callback next ejecutado. success = ${success}`);
          if (success) {
            console.log(`✅ Rol de administrador asignado al usuario. El backend debería haber asignado todos los permisos automáticamente.`);
            console.log(`⏳ Esperando 500ms para que el backend procese...`);
            
            // Esperar un momento para que el backend procese
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log(`🔍 Verificando que el rol y permisos se asignaron correctamente...`);
            
            // Recargar el usuario para verificar que el rol se asignó
            try {
              console.log(`📡 Llamando a getById(${usuarioId})...`);
              const usuarioActualizado = await firstValueFrom(this.usuariosService.getById(usuarioId));
              console.log(`📥 Usuario recibido:`, usuarioActualizado);
              
              if (usuarioActualizado) {
                const rolActual = usuarioActualizado.rolNombre;
                const permisosActuales = usuarioActualizado.permisos || [];
                
                console.log(`📊 Rol actual del usuario: ${rolActual}`);
                console.log(`📊 Permisos actuales del usuario: ${permisosActuales.length}`, permisosActuales);
                
                // Verificar que el rol se asignó correctamente
                if (rolActual === rolAdmin.nombre) {
                  console.log(`✅ ¡Éxito! El rol de administrador se asignó correctamente`);
                  console.log(`✅ El usuario ahora tiene ${permisosActuales.length} permisos asignados por el rol`);
                  this.loadUsuarios(); // Recargar la lista
                  alert(`✅ Se asignó el rol de administrador (${rolAdmin.nombre}) a ${correo}\n\nEl usuario ahora tiene ${permisosActuales.length} permisos.\n\nEl usuario debe cerrar sesión y volver a iniciar sesión para que los cambios surtan efecto.`);
                } else {
                  console.warn(`⚠️ El rol no coincide. Esperado: ${rolAdmin.nombre}, Actual: ${rolActual}`);
                  this.loadUsuarios();
                  alert(`⚠️ Se intentó asignar el rol de administrador, pero el rol actual es: ${rolActual}\n\nPor favor, verifica manualmente en la lista de usuarios.`);
                }
              } else {
                console.warn('⚠️ No se pudo verificar el usuario actualizado, pero la actualización se envió correctamente');
                this.loadUsuarios();
                alert(`✅ Se asignó el rol de administrador a ${correo}\n\nPor favor, verifica manualmente que se guardó correctamente.`);
              }
            } catch (verifyError: any) {
              console.error('❌ Error al verificar el usuario:', verifyError);
              console.error('Detalles del error de verificación:', {
                message: verifyError?.message,
                stack: verifyError?.stack,
                error: verifyError
              });
              this.loadUsuarios();
              alert(`✅ Se asignó el rol de administrador a ${correo}\n\nError al verificar: ${verifyError?.message || 'Error desconocido'}\n\nPor favor, verifica manualmente que se guardó correctamente.`);
            }
          } else {
            this.error.set('Error al actualizar el rol del usuario. El servidor no confirmó la actualización.');
            console.error('❌ El servidor no confirmó la actualización (success = false)');
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Error asignando permisos:', err);
          console.error('Detalles del error:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error
          });
          this.error.set(`Error al asignar los permisos: ${err.message || err.statusText || 'Error desconocido'}. Por favor, revisa la consola para más detalles.`);
          this.loading.set(false);
        }
      });
    } catch (error: any) {
      console.error('❌ Error inesperado en asignarTodosLosPermisos:', error);
      this.error.set(`Error inesperado: ${error.message || 'Error desconocido'}`);
      this.loading.set(false);
    }
  }
}
