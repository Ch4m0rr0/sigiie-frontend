import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsuariosService } from '../../core/services/usuarios.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { AlertService } from '../../core/services/alert.service';
import type { Usuario, UsuarioCreate, UsuarioUpdate } from '../../core/models/usuario';
import type { Rol } from '../../core/models/rol';
import type { Departamento } from '../../core/models/departamento';
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
  private alertService = inject(AlertService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  isEditMode = signal(false);
  usuarioId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  hasUnsavedChanges = signal(false);

  // Catálogos
  roles = signal<Rol[]>([]);
  departamentos = signal<Departamento[]>([]);

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
      departamentoId: [null, Validators.required],
      activo: [true]
    });

    // Detectar cambios en el formulario
    this.form.valueChanges.subscribe(() => {
      if (this.form.dirty) {
        this.hasUnsavedChanges.set(true);
      }
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
        
        this.form.patchValue({
          nombreCompleto: usuario.nombreCompleto || '',
          correo: usuario.correo || '',
          idRol: idRol,
          departamentoId: usuario.departamentoId || null,
          activo: usuario.activo !== undefined ? usuario.activo : true
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
      // Actualizar usuario - los permisos vienen del rol asignado
      const updateData: UsuarioUpdate = {
        nombreCompleto: formValue.nombreCompleto,
        correo: formValue.correo,
        idRol: +formValue.idRol,
        activo: formValue.activo ?? true,
        departamentoId: formValue.departamentoId ? +formValue.departamentoId : undefined
      };

      console.log('📤 Enviando actualización de usuario:', updateData);
      
      this.usuariosService.update(this.usuarioId()!, updateData).subscribe({
        next: (success) => {
          if (success) {
            console.log('✅ Usuario actualizado exitosamente');
            this.hasUnsavedChanges.set(false);
            this.alertService.success(
              '¡Usuario actualizado exitosamente!',
              `El usuario "${formValue.nombreCompleto}" ha sido actualizado correctamente.`
            ).then(() => {
              this.router.navigate(['/usuarios']);
            });
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
          
          this.alertService.error('Error al actualizar', errorMessage);
          this.saving.set(false);
        }
      });
    } else {
      // Crear nuevo usuario - los permisos vienen del rol asignado
      const createData: UsuarioCreate = {
        nombreCompleto: formValue.nombreCompleto,
        correo: formValue.correo,
        contraseña: formValue.contraseña,
        idRol: +formValue.idRol,
        departamentoId: +formValue.departamentoId
      };

      this.usuariosService.create(createData).subscribe({
        next: (usuario) => {
          console.log('✅ Usuario creado exitosamente');
          this.hasUnsavedChanges.set(false);
          this.alertService.success(
            '¡Usuario creado exitosamente!',
            `El usuario "${formValue.nombreCompleto}" ha sido creado correctamente.`
          ).then(() => {
            this.router.navigate(['/usuarios']);
          });
        },
        error: (err: any) => {
          console.error('Error creating usuario:', err);
          
          let errorMessage = 'Error al crear el usuario. Por favor, intenta de nuevo.';
          
          if (err.status === 400) {
            errorMessage = err.error?.message || 'Datos inválidos. Por favor, verifica la información ingresada.';
          } else if (err.status === 409) {
            errorMessage = 'Ya existe un usuario con este correo electrónico.';
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          }
          
          this.alertService.error('Error al crear', errorMessage);
          this.saving.set(false);
        }
      });
    }
  }

  onCancel(): void {
    if (this.hasUnsavedChanges()) {
      this.alertService.warning(
        '¿Deseas salir?',
        'Tienes cambios sin guardar. ¿Estás seguro de que deseas salir sin guardar?'
      ).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/usuarios']);
        }
      });
    } else {
      this.router.navigate(['/usuarios']);
    }
  }
}

