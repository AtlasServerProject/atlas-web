import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom, Subject } from 'rxjs';
import { User, UserRole } from './models';
import { readMock, writeMock } from './mock-session';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<User | null>(null);
  private readonly mode = signal(false);
  private readonly availableState = signal(false);
  private readonly epoch = signal(0);
  private readonly changes = new Subject<void>();
  private refreshSequence = 0;
  readonly mfaChallenge = signal<{ setupRequired: boolean } | null>(null);
  readonly recoveryCodes = signal<string[]>([]);
  readonly reauthenticationRequired = signal(false);
  private reauthenticationPromise?: Promise<void>;
  private resolveReauthentication?: () => void;
  private rejectReauthentication?: (error: Error) => void;
  readonly sessionGeneration = this.epoch.asReadonly();
  // Synchronous notification: privileged caches are cleared before the next render/microtask.
  readonly sessionChanges = this.changes.asObservable();
  readonly available = this.availableState.asReadonly();
  private csrf: { token: string; headerName: string } | null = null;
  readonly currentUser = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));
  readonly canSupport = computed(() => this.hasRole('ADMIN') || this.hasRole('SUPPORT') || this.hasRole('MODERATOR'));
  readonly adminMode = computed(() => this.isAdmin() && this.mode());
  readonly currentUser$ = toObservable(this.currentUser);
  readonly isAuthenticated$ = toObservable(this.isAuthenticated);
  readonly isAdmin$ = toObservable(this.isAdmin);
  private boundary(user: User | null): number {
    this.csrf = null;
    this.mfaChallenge.set(null);
    this.recoveryCodes.set([]);
    this.cancelReauthentication();
    this.mode.set(false);
    this.userState.set(user);
    this.epoch.set(this.epoch() + 1);
    this.changes.next();
    return this.epoch();
  }
  private unchanged(epoch: number) { return epoch === this.epoch(); }
  private assertSession(epoch: number) {
    if (!this.unchanged(epoch)) throw new Error('Sua sessão mudou. Tente novamente.');
  }
  private validUser(user: User): boolean {
    return !!user && typeof user.id === 'string' && ['USER', 'SUPPORT', 'MODERATOR', 'ADMIN'].includes(user.role);
  }
  async initialize(): Promise<void> { try { await this.refresh(); } catch { /* refresh fails closed. */ } }
  async refresh(): Promise<void> {
    const epoch = this.epoch(), sequence = ++this.refreshSequence;
    try {
      const user = await firstValueFrom(this.http.get<User>('/api/v1/users/me', { withCredentials: true }));
      if (!this.unchanged(epoch) || sequence !== this.refreshSequence) return;
      if (!this.validUser(user)) throw new Error('Resposta de conta inválida.');
      const old = this.currentUser();
      if (old?.id !== user.id || old.role !== user.role) this.boundary(user);
      else this.userState.set(user);
      this.availableState.set(true);
      this.mode.set(this.isAdmin() && readMock<boolean>('adminMode.' + user.id, false));
    } catch (e) {
      if (!this.unchanged(epoch) || sequence !== this.refreshSequence) return;
      this.boundary(null);
      this.availableState.set(e instanceof HttpErrorResponse && e.status === 401);
      if (!(e instanceof HttpErrorResponse && e.status === 401)) throw this.failure(e);
    }
  }
  private async post<T = void>(path: string, body: unknown): Promise<T> {
    const epoch = this.epoch();
    try {
      let csrf = this.csrf;
      if (!csrf) {
        csrf = await firstValueFrom(this.http.get<{ token: string; headerName: string }>('/api/v1/auth/csrf', { withCredentials: true }));
        this.assertSession(epoch);
        this.csrf = csrf;
      }
      this.assertSession(epoch);
      const result = await firstValueFrom(this.http.post<T>('/api/v1/auth/' + path, body, {
        withCredentials: true, headers: { [csrf.headerName]: csrf.token },
      }));
      this.assertSession(epoch);
      return result;
    } catch (e) {
      if (!this.unchanged(epoch)) throw new Error('Sua sessão mudou. Tente novamente.');
      this.csrf = null;
      if (e instanceof HttpErrorResponse && e.status === 401 && !(path === 'mfa/verify' && e.error?.code === 'INVALID_MFA_CODE')) this.boundary(null);
      throw this.failure(e);
    }
  }
  private failure(e: unknown): Error {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 429) return new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      if (e.status === 401) return new Error(e.error?.code === 'INVALID_MFA_CODE' ? 'Código inválido, expirado ou já utilizado. Confira o autenticador.' : 'Email ou senha incorretos.');
      if (e.status === 0 || e.status >= 500) return new Error('Serviço indisponível. Tente novamente em alguns instantes.');
      return new Error(typeof e.error?.message === 'string' ? e.error.message : 'Confira os dados e tente novamente.');
    }
    return new Error('Não foi possível concluir a solicitação.');
  }
  async login(email: string, password: string): Promise<void> {
    const epoch = this.boundary(null);
    const result = await this.post<User | { mfaRequired: true; setupRequired: boolean }>('login', { email: email.trim(), password });
    this.assertSession(epoch);
    this.acceptAuthentication(result);
  }
  private acceptAuthentication(result: User | { mfaRequired: true; setupRequired: boolean }) {
    this.csrf = null;
    if ('mfaRequired' in result && result.mfaRequired) {
      this.mfaChallenge.set({ setupRequired: result.setupRequired });
      return;
    }
    const user = result as User;
    if (!this.validUser(user)) throw new Error('Resposta de conta inválida.');
    this.boundary(user);
  }
  async loginGoogle(credential: string) {
    const epoch = this.epoch();
    const result = await this.post<User | { mfaRequired: true; setupRequired: boolean }>('google/complete', { credential });
    this.assertSession(epoch);
    this.acceptAuthentication(result);
  }
  async setupMfa(password?: string) {
    return this.post<{ secret: string; issuer: string; account: string }>('mfa/setup', { password: password || null });
  }
  async verifyMfa(code: string) {
    const result = await this.post<{ user: User; recoveryCodes: string[] }>('mfa/verify', { code: code.trim() });
    if (!this.validUser(result.user)) throw new Error('Resposta de conta inválida.');
    this.boundary(result.user);
    this.recoveryCodes.set(result.recoveryCodes);
  }
  requestReauthentication(): Promise<void> {
    if (this.reauthenticationPromise) return this.reauthenticationPromise;
    this.reauthenticationRequired.set(true);
    this.reauthenticationPromise = new Promise<void>((resolve, reject) => {
      this.resolveReauthentication = resolve;
      this.rejectReauthentication = reject;
    });
    return this.reauthenticationPromise;
  }
  async approveReauthentication(password: string, code: string) {
    await this.post('reauthenticate', { password, code: code.trim() || null });
    this.resolveReauthentication?.();
    this.reauthenticationRequired.set(false);
    this.reauthenticationPromise = undefined;
    this.resolveReauthentication = this.rejectReauthentication = undefined;
  }
  cancelReauthentication() {
    this.rejectReauthentication?.(new Error('Confirmação cancelada. Nenhuma alteração foi enviada.'));
    this.reauthenticationRequired.set(false);
    this.reauthenticationPromise = undefined;
    this.resolveReauthentication = this.rejectReauthentication = undefined;
  }
  expireSession() { this.boundary(null); }
  async register(username: string, email: string, password: string): Promise<void> {
    await this.post('register', { username: username.trim(), email: email.trim(), password });
  }
  async logout(): Promise<void> {
    this.boundary(null);
    await this.post('logout', {});
    this.csrf = null;
  }
  async resendVerification(): Promise<void> { await this.post('resend-verification', { email: this.currentUser()?.email }); }
  async forgotPassword(email: string): Promise<void> { await this.post('forgot-password', { email: email.trim() }); }
  async verifyEmail(token: string): Promise<void> { await this.post('verify-email', { token }); await this.refresh(); }
  async resetPassword(token: string, password: string): Promise<void> {
    this.boundary(null);
    await this.post('reset-password', { token, password });
    this.csrf = null;
  }
  getCurrentUser() { return this.currentUser(); }
  hasRole(role: UserRole) { return this.currentUser()?.role === role; }
  private setMode(value: boolean) {
    this.mode.set(value);
    const user = this.currentUser();
    if (user) writeMock('adminMode.' + user.id, value);
  }
  toggleAdminMode() { if (this.isAdmin()) this.setMode(!this.mode()); }
}
