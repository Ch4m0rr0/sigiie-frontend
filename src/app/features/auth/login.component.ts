import { Component, inject, signal } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icon/icon.component';

// Spartan UI
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [
    CommonModule,
    NgIf,
    ReactiveFormsModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports,
  ],
 
  styles: [],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  // Señales para manejar el estado de error, éxito y carga
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  loading = signal(false);
  showPassword = signal(false);

  // Formulario fuertemente tipado para mayor seguridad y autocompletado.
  form = new FormGroup({
    identificador: new FormControl('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    contrasena: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  get identificador() { return this.form.get('identificador'); }
  get contrasena() { return this.form.get('contrasena'); }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  onPasswordEyeMouseDown() {
    this.showPassword.set(true);
  }

  onPasswordEyeMouseUp() {
    this.showPassword.set(false);
  }

  onPasswordEyeMouseLeave() {
    this.showPassword.set(false);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Limpiar mensajes anteriores
    this.error.set(null);
    this.success.set(null);
    this.loading.set(true);

    const { identificador, contrasena } = this.form.getRawValue();
    const loginRequest = {
      Identificador: identificador,
      Contrasena: contrasena,
    };
    
    this.auth.login(loginRequest).subscribe({
      next: () => {
        // Mostrar mensaje de éxito antes de redirigir
        this.success.set('¡Login exitoso! Redirigiendo...');
        this.loading.set(false);
        
        // Auto-cerrar la alerta de éxito después de 3 segundos
        setTimeout(() => {
          this.success.set(null);
        }, 3000);
        
        // Redirigir después de un breve delay para mostrar el mensaje
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        console.error('🔴 Error en login:', err);
        
        let errorMessage = 'Error inesperado al iniciar sesión';
        
        if (err.status === 0) {
          errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté ejecutándose en https://localhost:7041';
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos. Verifica tu correo y contraseña.';
        } else if (err.status === 401) {
          errorMessage = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
        } else if (err.status === 404) {
          errorMessage = 'Endpoint no encontrado. Verifica la configuración del servidor.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.error.set(errorMessage);
        this.loading.set(false);
        
        // Auto-cerrar la alerta de error después de 5 segundos
        setTimeout(() => {
          this.error.set(null);
        }, 5000);
      },
      complete: () => this.loading.set(false),
    });
  }
}
