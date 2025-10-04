import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { IconComponent } from './icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    IconComponent,
  ],
  template: `
    <div class="flex h-screen bg-slate-900">
      <!-- Sidebar -->
      <app-sidebar></app-sidebar>
      
      <!-- Main content area -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Top header -->
        <header class="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600/50 px-6 py-4 shadow-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <app-icon icon="dashboard" size="md" color="white"></app-icon>
                </div>
                <div>
                  <h1 class="text-xl font-bold text-white tracking-tight">SIGIIE</h1>
                  <p class="text-sm text-slate-400">Sistema de Gestión Integral</p>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <!-- Search -->
              <div class="relative hidden md:block">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <app-icon icon="search" size="sm" color="slate-400"></app-icon>
                </div>
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  class="block w-64 pl-10 pr-3 py-2 border border-slate-600 rounded-lg bg-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                >
              </div>
              
              <!-- Notifications -->
              <button class="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 group">
                <app-icon icon="notifications" size="lg" color="slate-400"></app-icon>
                <span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              <!-- Settings -->
              <button class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 group">
                <app-icon icon="settings" size="lg" color="slate-400"></app-icon>
              </button>
            </div>
          </div>
        </header>
        
        <!-- Main content with multi-column layout -->
        <main class="flex-1 overflow-auto bg-slate-50">
          <div class="h-full p-6">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class LayoutComponent {}
