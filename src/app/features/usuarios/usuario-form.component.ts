import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsuariosService } from '../../core/services/usuarios.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Usuario, UsuarioCreate, UsuarioUpdate } from '../../core/models/usuario';
import type { Rol } from '../../core/models/rol';
import type { Departamento } from '../../core/models/departamento';
import type { Permiso } from '../../core/models/permiso';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-usuario-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './usuario-form.component.html',
})
export class UsuarioFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private catalogosService = inject(CatalogosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  isEditMode = signal(false);
  usuarioId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Catálogos
  roles = signal<Rol[]>([]);
  departamentos = signal<Departamento[]>([]);
  permisos = signal<Permiso[]>([]);

  ngOnInit(): void {
    // Verificar si es modo edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const idNumber = +id;
      if (!isNaN(idNumber) && idNumber > 0) {
        this.isEditMode.set(true);
        this.usuarioId.set(idNumber);
      } else {
        console.warn('⚠️ ID inválido en la ruta:', id);
        this.error.set('ID inválido. Redirigiendo...');
        setTimeout(() => this.router.navigate(['/usuarios']), 2000);
        return;
      }
    }

    this.initializeForm();
    this.loadCatalogos();
  }

  initializeForm(): void {
    this.form = this.fb.group({
      nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
      correo: ['', [Validators.required, Validators.email]],
      contraseña: ['', this.isEditMode() ? [] : [Validators.required, Validators.minLength(6)]],
      idRol: [null, Validators.required],
      departamentoId: [null],
      permisos: [[]], // Array de IDs de permisos
      activo: [true]
    });
  }

  loadCatalogos(): void {
    // Cargar roles - solo activos para asignar usando el servicio de catalogos
    this.catalogosService.getRoles(true).subscribe({
      next: (data) => {
        console.log(`✅ Roles activos cargados: ${data.length}`);
        this.roles.set(data);
        // Si estamos en modo edición y los roles ya están cargados, cargar el usuario
        if (this.isEditMode() && this.usuarioId() && this.usuarioId()! > 0) {
          this.loadUsuario(this.usuarioId()!);
        }
      },
      error: (err) => {
        console.error('Error loading roles:', err);
        this.error.set('Error al cargar los roles. Por favor, recarga la página.');
      }
    });

    // Cargar departamentos - solo activos para asignar
    this.catalogosService.getDepartamentos(true).subscribe({
      next: (data) => {
        // Filtrar solo departamentos activos
        const departamentosActivos = data.filter((dept: any) => {
          const activo = dept.activo !== undefined ? dept.activo : 
                        (dept.Activo !== undefined ? dept.Activo : true);
          return activo === true || activo === 1;
        });
        console.log(`✅ Departamentos activos cargados: ${departamentosActivos.length} de ${data.length}`);
        this.departamentos.set(departamentosActivos);
      },
      error: (err) => {
        console.error('Error loading departamentos:', err);
        this.error.set('Error al cargar los departamentos. Por favor, recarga la página.');
      }
    });

    // Cargar permisos
    this.usuariosService.listPermisos().subscribe({
      next: (data) => this.permisos.set(data),
      error: (err) => console.error('Error loading permisos:', err)
    });
  }

  loadUsuario(id: number): void {
    // Esperar a que los roles estén cargados
    if (this.roles().length === 0) {
      // Los roles se cargarán y luego se llamará a loadUsuario de nuevo
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    
    this.usuariosService.getById(id).subscribe({
      next: (usuario) => {
        if (!usuario) {
          this.error.set('Usuario no encontrado.');
          setTimeout(() => this.router.navigate(['/usuarios']), 2000);
          return;
        }
        
        // Buscar el rol - primero por ID, luego por nombre
        let idRol: number | null = null;
        
        // Si el usuario tiene idRol directamente, usarlo
        if ((usuario as any).idRol !== undefined && (usuario as any).idRol !== null) {
          idRol = +(usuario as any).idRol;
          // Verificar que el rol existe y está activo
          const rolEncontrado = this.roles().find(r => r.id === idRol);
          if (!rolEncontrado) {
            console.warn(`⚠️ El rol con ID ${idRol} no está disponible o no está activo. Buscando por nombre...`);
            idRol = null; // Resetear para buscar por nombre
          } else {
            console.log(`✅ Rol encontrado por ID: "${rolEncontrado.nombre}" (ID: ${idRol})`);
          }
        }
        
        // Si no se encontró por ID, buscar por nombre
        if (!idRol && usuario.rolNombre && this.roles().length > 0) {
          // Primero intentar búsqueda exacta
          let rol = this.roles().find(r => r.nombre === usuario.rolNombre);
          
          // Si no se encuentra, intentar búsqueda case-insensitive
          if (!rol) {
            rol = this.roles().find(r => 
              r.nombre.toLowerCase().trim() === usuario.rolNombre!.toLowerCase().trim()
            );
          }
          
          // Si aún no se encuentra, intentar búsqueda parcial
          if (!rol) {
            rol = this.roles().find(r => 
              r.nombre.toLowerCase().includes(usuario.rolNombre!.toLowerCase()) ||
              usuario.rolNombre!.toLowerCase().includes(r.nombre.toLowerCase())
            );
          }
          
          if (rol) {
            idRol = rol.id;
            console.log(`✅ Rol encontrado por nombre: "${rol.nombre}" (ID: ${rol.id}) para usuario "${usuario.rolNombre}"`);
          } else {
            console.warn(`⚠️ No se encontró el rol "${usuario.rolNombre}" en la lista de roles activos disponibles.`);
            console.warn(`📋 Roles activos disponibles:`, this.roles().map(r => `"${r.nombre}" (ID: ${r.id})`));
            this.error.set(`⚠️ Advertencia: No se pudo encontrar el rol "${usuario.rolNombre}" en la lista de roles activos. Por favor, selecciona un rol manualmente.`);
          }
        } else if (!idRol && !usuario.rolNombre) {
          console.warn('⚠️ El usuario no tiene un rol asignado.');
          this.error.set('⚠️ El usuario no tiene un rol asignado. Por favor, selecciona un rol.');
        }
        
        // Mapear permisos de nombres a IDs
        // El backend devuelve permisos del rol en 'permisos' (strings) y permisos personalizados en 'permisosPersonalizados' (objetos)
        let permisosIds: number[] = [];
        
        // Obtener nombres de permisos del rol
        const nombresPermisosRol = usuario.permisos || [];
        
        // Obtener nombres de permisos personalizados
        const nombresPermisosPersonalizados = usuario.permisosPersonalizados?.map(p => p.nombre) || [];
        
        // Combinar todos los nombres de permisos
        const todosLosNombresPermisos = [...nombresPermisosRol, ...nombresPermisosPersonalizados];
        
        if (todosLosNombresPermisos.length > 0 && this.permisos().length > 0) {
          permisosIds = this.permisos()
            .filter(p => todosLosNombresPermisos.includes(p.nombre))
            .map(p => p.id);
        }
        
        this.form.patchValue({
          nombreCompleto: usuario.nombreCompleto,
          correo: usuario.correo,
          idRol: idRol,
          departamentoId: usuario.departamentoId,
          permisos: permisosIds,
          activo: usuario.activo
        });
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading usuario:', err);
        this.error.set('Error al cargar el usuario.');
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/usuarios']), 2000);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Por favor, completa todos los campos requeridos.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.form.value;

    // Validar que el rol existe y está activo
    const idRol = +formValue.idRol;
    const rolSeleccionado = this.roles().find(r => r.id === idRol);
    if (!rolSeleccionado) {
      this.error.set('El rol seleccionado no existe o no está activo. Por favor, selecciona otro rol.');
      this.saving.set(false);
      return;
    }

    // Validar que el departamento existe y está activo (si se seleccionó uno)
    if (formValue.departamentoId) {
      const idDepartamento = +formValue.departamentoId;
      const departamentoSeleccionado = this.departamentos().find(d => d.id === idDepartamento);
      if (!departamentoSeleccionado) {
        this.error.set('El departamento seleccionado no existe o no está activo. Por favor, selecciona otro departamento.');
        this.saving.set(false);
        return;
      }
    }

    if (this.isEditMode() && this.usuarioId()) {
      // Convertir IDs de permisos a objetos completos de Permiso
      let permisosCompletos: any[] = [];
      if (formValue.permisos && Array.isArray(formValue.permisos) && formValue.permisos.length > 0) {
        permisosCompletos = formValue.permisos
          .map((permisoId: any) => {
            const permisoIdNum = +permisoId;
            if (isNaN(permisoIdNum)) return null;
            
            // Buscar el permiso completo en la lista cargada
            const permisoCompleto = this.permisos().find(p => p.id === permisoIdNum);
            if (permisoCompleto) {
              return {
                idPermiso: permisoCompleto.id,
                nombre: permisoCompleto.nombre,
                descripcion: permisoCompleto.descripcion || null,
                modulo: null, // El backend puede completar esto
                activo: true
              };
            }
            // Si no se encuentra, crear un objeto mínimo con el ID
            return {
              idPermiso: permisoIdNum,
              nombre: null,
              descripcion: null,
              modulo: null,
              activo: true
            };
          })
          .filter((p: any) => p !== null);
      }

      // Actualizar usuario
      const updateData: UsuarioUpdate = {
        nombreCompleto: formValue.nombreCompleto,
        correo: formValue.correo,
        idRol: +formValue.idRol,
        activo: formValue.activo ?? true,
        departamentoId: formValue.departamentoId ? +formValue.departamentoId : undefined,
        permisos: permisosCompletos // Enviar objetos completos, no solo IDs
      };

      console.log('📤 Enviando actualización de usuario:', updateData);
      
      this.usuariosService.update(this.usuarioId()!, updateData).subscribe({
        next: async (success) => {
          if (success) {
            console.log('✅ Usuario actualizado exitosamente');
            
            // Verificar que los permisos se guardaron correctamente
            if (permisosCompletos.length > 0) {
              console.log('🔍 Verificando que los permisos se guardaron...');
              await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que el backend procese
              
              try {
                const usuarioVerificado = await firstValueFrom(this.usuariosService.getById(this.usuarioId()!));
                if (usuarioVerificado) {
                  // El backend devuelve permisos personalizados en 'permisosPersonalizados'
                  const permisosPersonalizadosGuardados = usuarioVerificado.permisosPersonalizados || [];
                  const nombresPermisosEnviados = permisosCompletos.map(p => p.nombre).filter(n => n);
                  
                  console.log(`📊 Permisos enviados: ${permisosCompletos.length}`, nombresPermisosEnviados);
                  console.log(`📊 Permisos personalizados guardados: ${permisosPersonalizadosGuardados.length}`, permisosPersonalizadosGuardados);
                  
                  // Verificar que los permisos personalizados se guardaron
                  const nombresPermisosPersonalizadosGuardados = permisosPersonalizadosGuardados.map(p => p.nombre);
                  const permisosGuardadosCorrectamente = nombresPermisosEnviados.every(nombre => 
                    nombresPermisosPersonalizadosGuardados.includes(nombre)
                  );
                  
                  if (permisosPersonalizadosGuardados.length === 0) {
                    console.warn('⚠️ ADVERTENCIA: Los permisos personalizados no se guardaron. El backend puede no estar procesando el campo Permisos.');
                    alert(`⚠️ Usuario actualizado, pero los permisos personalizados pueden no haberse guardado.\n\nPermisos enviados: ${permisosCompletos.length}\nPermisos personalizados encontrados: ${permisosPersonalizadosGuardados.length}\n\nNota: Los permisos del rol se asignan automáticamente. Los permisos personalizados adicionales deben guardarse en 'permisosPersonalizados'.\n\nPor favor, verifica en el backend si el endpoint procesa el campo Permisos.`);
                  } else if (!permisosGuardadosCorrectamente) {
                    console.warn(`⚠️ Algunos permisos no coinciden. Enviados: ${nombresPermisosEnviados.join(', ')}, Guardados: ${nombresPermisosPersonalizadosGuardados.join(', ')}`);
                    alert(`⚠️ Usuario actualizado, pero algunos permisos pueden no haberse guardado correctamente.\n\nPermisos enviados: ${permisosCompletos.length}\nPermisos personalizados guardados: ${permisosPersonalizadosGuardados.length}`);
                  } else {
                    console.log('✅ Permisos personalizados verificados correctamente');
                  }
                }
              } catch (verifyError) {
                console.warn('⚠️ No se pudo verificar los permisos:', verifyError);
              }
            }
            
            this.router.navigate(['/usuarios']);
          } else {
            this.error.set('Error al actualizar el usuario. El servidor no confirmó la actualización.');
            this.saving.set(false);
          }
        },
        error: (err: any) => {
          console.error('❌ Error updating usuario:', err);
          console.error('Detalles del error:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error
          });
          
          // Mostrar mensaje de error más específico
          let errorMessage = 'Error al actualizar el usuario.';
          
          if (err.status === 403) {
            errorMessage = 'No tienes permisos para actualizar este usuario. Solo los administradores pueden editar usuarios.';
          } else if (err.status === 401) {
            errorMessage = 'No estás autenticado. Por favor, inicia sesión nuevamente.';
          } else if (err.status === 400) {
            errorMessage = err.error?.message || 'Datos inválidos. Por favor, verifica la información ingresada.';
          } else if (err.status === 404) {
            errorMessage = 'Usuario no encontrado.';
          } else if (err.status >= 500) {
            errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          }
          
          this.error.set(errorMessage);
          this.saving.set(false);
        }
      });
    } else {
      // Convertir IDs de permisos a objetos completos de Permiso para crear usuario
      let permisosCompletos: any[] = [];
      if (formValue.permisos && Array.isArray(formValue.permisos) && formValue.permisos.length > 0) {
        permisosCompletos = formValue.permisos
          .map((permisoId: any) => {
            const permisoIdNum = +permisoId;
            if (isNaN(permisoIdNum)) return null;
            
            // Buscar el permiso completo en la lista cargada
            const permisoCompleto = this.permisos().find(p => p.id === permisoIdNum);
            if (permisoCompleto) {
              return {
                idPermiso: permisoCompleto.id,
                nombre: permisoCompleto.nombre,
                descripcion: permisoCompleto.descripcion || null,
                modulo: null,
                activo: true
              };
            }
            // Si no se encuentra, crear un objeto mínimo con el ID
            return {
              idPermiso: permisoIdNum,
              nombre: null,
              descripcion: null,
              modulo: null,
              activo: true
            };
          })
          .filter((p: any) => p !== null);
      }

      // Crear nuevo usuario
      const createData: UsuarioCreate = {
        nombreCompleto: formValue.nombreCompleto,
        correo: formValue.correo,
        contraseña: formValue.contraseña,
        idRol: +formValue.idRol,
        departamentoId: formValue.departamentoId ? +formValue.departamentoId : undefined,
        permisos: permisosCompletos // Enviar objetos completos, no solo IDs
      };

      this.usuariosService.create(createData).subscribe({
        next: (usuario) => {
          this.router.navigate(['/usuarios']);
        },
        error: (err) => {
          console.error('Error creating usuario:', err);
          this.error.set('Error al crear el usuario. Por favor, intenta de nuevo.');
          this.saving.set(false);
        }
      });
    }
  }

  togglePermiso(permisoId: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentPermisos = this.form.get('permisos')?.value || [];
    let newPermisos: number[];
    
    if (checkbox.checked) {
      newPermisos = [...currentPermisos, permisoId];
    } else {
      newPermisos = currentPermisos.filter((id: number) => id !== permisoId);
    }
    
    this.form.patchValue({ permisos: newPermisos });
  }

  onCancel(): void {
    this.router.navigate(['/usuarios']);
  }
}

