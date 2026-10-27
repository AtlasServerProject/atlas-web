import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
@Injectable({ providedIn: 'root' })
export class CommerceClient {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private check(epoch: number) { if (epoch !== this.auth.sessionGeneration()) throw new Error('Sua sessão mudou. Tente novamente.'); }
  async get<T>(path: string): Promise<T> {
    const epoch = this.auth.sessionGeneration();
    try {
      const result = await firstValueFrom(this.http.get<T>('/api/v1/' + path, { withCredentials: true }));
      this.check(epoch);
      return result;
    } catch (e) {
      this.check(epoch);
      if (e instanceof HttpErrorResponse && e.status === 401) this.auth.expireSession();
      throw this.failure(e);
    }
  }
  async post<T>(path: string, body: unknown, headers: Record<string, string> = {}, retried = false): Promise<T> {
    const epoch = this.auth.sessionGeneration();
    try {
      const csrf = await this.get<{ token: string; headerName: string }>('auth/csrf');
      this.check(epoch);
      const result = await firstValueFrom(
        this.http.post<T>('/api/v1/' + path, body, {
          withCredentials: true,
          headers: { ...headers, [csrf.headerName]: csrf.token },
        }),
      );
      this.check(epoch);
      return result;
    } catch (e) {
      this.check(epoch);
      if (!retried && e instanceof HttpErrorResponse && e.status === 403 && e.error?.code === 'REAUTHENTICATION_REQUIRED') {
        await this.auth.requestReauthentication();
        this.check(epoch);
        return this.post<T>(path, body, headers, true);
      }
      if (e instanceof HttpErrorResponse && e.status === 401) this.auth.expireSession();
      throw this.failure(e);
    }
  }
  private failure(e: unknown) {
    return new Error(
      e instanceof HttpErrorResponse && typeof e.error?.message === 'string'
        ? e.error.message
        : e instanceof Error && !(e instanceof HttpErrorResponse)
          ? e.message
          : 'Não foi possível concluir a solicitação. Tente novamente.',
    );
  }
}
