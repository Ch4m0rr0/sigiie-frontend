import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Spartan UI
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ...BrnButtonImports,
    ...BrnLabelImports,
  ],
  template: `
    <div class="flex h-screen items-center justify-center bg-gray-100">
      <div class="w-96 p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-xl font-bold text-center mb-4">Iniciar Sesión</h2>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <!-- Correo -->
          <div>
            <label brnLabel for="correo" class="block text-sm font-medium text-gray-700 mb-1">Correo Institucional</label>
            <input
              id="correo"
              type="email"
              formControlName="identificador"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Correo Institucional"
            />
            <p *ngIf="form.controls['identificador'].invalid && form.controls['identificador'].touched"
               class="text-red-500 text-sm mt-1">Ingresa un correo válido</p>
          </div>

          <!-- Contraseña -->
          <div>
            <label brnLabel for="password" class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              id="password"
              type="password"
              formControlName="contrasena"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
            <p *ngIf="form.controls['contrasena'].invalid && form.controls['contrasena'].touched"
               class="text-red-500 text-sm mt-1">La contraseña es requerida</p>
          </div>

          <!-- Botón -->
          <button
            type="submit"
            (click)="submit()"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
            Entrar
          </button>

          <!-- Error Message -->
          <p *ngIf="error()" class="text-red-500 text-sm mt-2 text-center">{{ error() }}</p>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  error = signal<string | null>(null);

  form = new FormGroup({
  identificador: new FormControl('', [Validators.required, Validators.email]),
  contrasena: new FormControl('', Validators.required),
});


  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);

    this.auth.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => this.error.set(err.message || 'Error en el login'),
    });
  }
}
