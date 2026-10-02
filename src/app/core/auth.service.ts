import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { User, UserRole } from './models';
import { readMock, writeMock } from './mock-session';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<User | null>(null);
  private readonly mode = signal(false);
  private readonly availableState = signal(false);
  readonly available = this.availableState.asReadonly();
  private csrf: { token: string; headerName: string } | null = null;
  readonly currentUser = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));
  readonly adminMode = computed(() => this.isAdmin() && this.mode());
  readonly currentUser$ = toObservable(this.currentUser);
  readonly isAuthenticated$ = toObservable(this.isAuthenticated);
  readonly isAdmin$ = toObservable(this.isAdmin);
  async initialize(): Promise<void> {
    try {
      await this.refresh();
    } catch {
      this.userState.set(null);
      this.availableState.set(false);
    }
  }
  async refresh(): Promise<void> {
    try {
      this.userState.set(
        await firstValueFrom(this.http.get<User>('/api/v1/users/me', { withCredentials: true })),
      );
      const user = this.currentUser();
      if (!user || typeof user.id !== 'string' || !['USER', 'ADMIN'].includes(user.role)) {
        this.userState.set(null);
        throw new Error('Resposta de conta inválida.');
      }
      this.availableState.set(true);
      this.mode.set(this.isAdmin() && !!user && readMock<boolean>('adminMode.' + user.id, false));
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) {
        this.availableState.set(true);
        this.userState.set(null);
        this.mode.set(false);
        return;
      }
      this.availableState.set(false);
      throw this.failure(e);
    }
  }
  private async post<T = void>(path: string, body: unknown): Promise<T> {
    try {
      if (!this.csrf)
        this.csrf = await firstValueFrom(
          this.http.get<{ token: string; headerName: string }>('/api/v1/auth/csrf', {
            withCredentials: true,
          }),
        );
      return await firstValueFrom(
        this.http.post<T>('/api/v1/auth/' + path, body, {
          withCredentials: true,
          headers: { [this.csrf.headerName]: this.csrf.token },
        }),
      );
    } catch (e) {
      this.csrf = null;
      if (e instanceof HttpErrorResponse && e.status === 401) {
        this.userState.set(null);
        this.mode.set(false);
      }
      throw this.failure(e);
    }
  }
  private failure(e: unknown): Error {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 429)
        return new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      if (e.status === 401) return new Error('Email ou senha incorretos.');
      if (e.status === 0 || e.status >= 500)
        return new Error('Serviço indisponível. Tente novamente em alguns instantes.');
      return new Error(
        typeof e.error?.message === 'string'
          ? e.error.message
          : 'Confira os dados e tente novamente.',
      );
    }
    return new Error('Não foi possível concluir a solicitação.');
  }
  async login(email: string, password: string): Promise<void> {
    const user = await this.post<User>('login', { email: email.trim(), password });
    this.csrf = null;
    this.userState.set(user);
    this.setMode(false);
  }
  async register(username: string, email: string, password: string): Promise<void> {
    await this.post('register', { username: username.trim(), email: email.trim(), password });
  }
  async logout(): Promise<void> {
    await this.post('logout', {});
    this.csrf = null;
    this.setMode(false);
    this.userState.set(null);
  }
  async resendVerification(): Promise<void> {
    await this.post('resend-verification', { email: this.currentUser()?.email });
  }
  async forgotPassword(email: string): Promise<void> {
    await this.post('forgot-password', { email: email.trim() });
  }
  async verifyEmail(token: string): Promise<void> {
    await this.post('verify-email', { token });
    await this.refresh();
  }
  async resetPassword(token: string, password: string): Promise<void> {
    await this.post('reset-password', { token, password });
    this.csrf = null;
    this.userState.set(null);
    this.mode.set(false);
  }
  getCurrentUser() {
    return this.currentUser();
  }
  hasRole(role: UserRole) {
    return this.currentUser()?.role === role;
  }
  private setMode(value: boolean) {
    this.mode.set(value);
    const user = this.currentUser();
    if (user) writeMock('adminMode.' + user.id, value);
  }
  toggleAdminMode() {
    if (this.isAdmin()) this.setMode(!this.mode());
  }
}
