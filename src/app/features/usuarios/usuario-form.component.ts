import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsuariosService } from '../../core/services/usuarios.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Usuario, UsuarioCreate, UsuarioUpdate } from '../../core/models/usuario';
import type { Rol } from '../../core/models/rol';
import type { Departamento } from '../../core/models/departamento';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

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
      activo: [true]
    });
  }

  loadCatalogos(): void {
    // Cargar roles
    this.usuariosService.listRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        // Si estamos en modo edición y los roles ya están cargados, cargar el usuario
        if (this.isEditMode() && this.usuarioId() && this.usuarioId()! > 0) {
          this.loadUsuario(this.usuarioId()!);
        }
      },
      error: (err) => console.error('Error loading roles:', err)
    });

    // Cargar departamentos
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
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
        
        // Buscar el rol por nombre
        let idRol: number | null = null;
        if (usuario.rolNombre && this.roles().length > 0) {
          const rol = this.roles().find(r => r.nombre === usuario.rolNombre);
          if (rol) {
            idRol = rol.id;
          }
        }
        
        this.form.patchValue({
          nombreCompleto: usuario.nombreCompleto,
          correo: usuario.correo,
          idRol: idRol,
          departamentoId: usuario.departamentoId,
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

    if (this.isEditMode() && this.usuarioId()) {
      // Actualizar usuario
      const updateData: UsuarioUpdate = {
        nombreCompleto: formValue.nombreCompleto,
        correo: formValue.correo,
        idRol: +formValue.idRol,
        activo: formValue.activo ?? true,
        departamentoId: formValue.departamentoId ? +formValue.departamentoId : undefined
      };

      this.usuariosService.update(this.usuarioId()!, updateData).subscribe({
        next: (success) => {
          if (success) {
            this.router.navigate(['/usuarios']);
          } else {
            this.error.set('Error al actualizar el usuario.');
            this.saving.set(false);
          }
        },
        error: (err) => {
          console.error('Error updating usuario:', err);
          this.error.set('Error al actualizar el usuario. Por favor, intenta de nuevo.');
          this.saving.set(false);
        }
      });
    } else {
      // Crear nuevo usuario
      const createData: UsuarioCreate = {
        nombreCompleto: formValue.nombreCompleto,
        correo: formValue.correo,
        contraseña: formValue.contraseña,
        idRol: +formValue.idRol,
        departamentoId: formValue.departamentoId ? +formValue.departamentoId : undefined
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

  onCancel(): void {
    this.router.navigate(['/usuarios']);
  }
}

