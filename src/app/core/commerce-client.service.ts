import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class CommerceClient {
  private readonly http = inject(HttpClient);
  async get<T>(path: string): Promise<T> {
    try {
      return await firstValueFrom(this.http.get<T>('/api/v1/' + path, { withCredentials: true }));
    } catch (e) {
      throw this.failure(e);
    }
  }
  async post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
    try {
      const csrf = await this.get<{ token: string; headerName: string }>('auth/csrf');
      return await firstValueFrom(
        this.http.post<T>('/api/v1/' + path, body, {
          withCredentials: true,
          headers: { ...headers, [csrf.headerName]: csrf.token },
        }),
      );
    } catch (e) {
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
