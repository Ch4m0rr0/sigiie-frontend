import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { ToastService, ToastMessage } from '../../core/services/toast.service';

@Component({
  standalone: true,
  selector: 'app-toast',
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed top-4 right-4 z-[10000] flex flex-col gap-3 max-w-md w-full sm:w-auto pointer-events-none">
      @for (toast of toasts(); track toast.id) {
        <div
          [class]="getToastClasses(toast.tipo)"
          class="pointer-events-auto animate-slide-in-right shadow-lg rounded-xl p-4 flex items-start gap-3 min-w-[320px] max-w-md">
          
          <!-- Icono -->
          <div [class]="getIconBgClass(toast.tipo)" class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center">
            <app-icon [icon]="getIconName(toast.tipo)" size="sm" [class]="getIconColorClass(toast.tipo)"></app-icon>
          </div>

          <!-- Contenido -->
          <div class="flex-1 min-w-0">
            @if (toast.titulo) {
              <h4 class="text-sm font-semibold mb-1" [class]="getTitleColorClass(toast.tipo)">
                {{ toast.titulo }}
              </h4>
            }
            <p class="text-sm leading-relaxed" [class]="getMessageColorClass(toast.tipo)">
              {{ toast.mensaje }}
            </p>
            @if (toast.accion) {
              <button
                (click)="handleAction(toast)"
                class="mt-2 text-xs font-medium underline hover:no-underline transition-all"
                [class]="getActionColorClass(toast.tipo)">
                {{ toast.accion.texto }}
              </button>
            }
          </div>

          <!-- Botón cerrar -->
          <button
            (click)="removeToast(toast.id)"
            class="flex-shrink-0 p-1 hover:bg-black/10 rounded-lg transition-colors"
            [class]="getCloseButtonColorClass(toast.tipo)">
            <app-icon icon="close" size="xs"></app-icon>
          </button>

          <!-- Barra de progreso -->
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-xl overflow-hidden">
            <div
              [class]="getProgressBarClass(toast.tipo)"
              class="h-full transition-all ease-linear"
              [style.width.%]="toast.progress"
              [style.transition-duration.ms]="toast.duracion">
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .animate-slide-in-right {
      animation: slideInRight 0.3s ease-out;
    }

    .animate-slide-out-right {
      animation: slideOutRight 0.3s ease-in;
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  private toastService = inject(ToastService);
  toasts = signal<ToastMessage[]>([]);
  private subscription: any;

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(toasts => {
      this.toasts.set(toasts);
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }

  handleAction(toast: ToastMessage): void {
    if (toast.accion?.callback) {
      toast.accion.callback();
    }
    this.removeToast(toast.id);
  }

  getToastClasses(tipo: string): string {
    const base = 'relative border-2';
    switch (tipo) {
      case 'success':
        return `${base} bg-emerald-50 border-emerald-200`;
      case 'warning':
        return `${base} bg-amber-50 border-amber-200`;
      case 'error':
        return `${base} bg-red-50 border-red-200`;
      case 'info':
      default:
        return `${base} bg-blue-50 border-blue-200`;
    }
  }

  getIconBgClass(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'bg-emerald-100';
      case 'warning':
        return 'bg-amber-100';
      case 'error':
        return 'bg-red-100';
      case 'info':
      default:
        return 'bg-blue-100';
    }
  }

  getIconColorClass(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'text-emerald-600';
      case 'warning':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      case 'info':
      default:
        return 'text-blue-600';
    }
  }

  getIconName(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
      default:
        return 'info';
    }
  }

  getTitleColorClass(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'text-emerald-800';
      case 'warning':
        return 'text-amber-800';
      case 'error':
        return 'text-red-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  }

  getMessageColorClass(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'text-emerald-700';
      case 'warning':
        return 'text-amber-700';
      case 'error':
        return 'text-red-700';
      case 'info':
      default:
        return 'text-blue-700';
    }
  }

  getActionColorClass(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'text-emerald-700';
      case 'warning':
        return 'text-amber-700';
      case 'error':
        return 'text-red-700';
      case 'info':
      default:
        return 'text-blue-700';
    }
  }

  getCloseButtonColorClass(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'text-emerald-600 hover:text-emerald-800';
      case 'warning':
        return 'text-amber-600 hover:text-amber-800';
      case 'error':
        return 'text-red-600 hover:text-red-800';
      case 'info':
      default:
        return 'text-blue-600 hover:text-blue-800';
    }
  }

  getProgressBarClass(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  }
}

