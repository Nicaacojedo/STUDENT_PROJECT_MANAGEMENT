import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

type Params = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private params(values?: Params): HttpParams {
    let params = new HttpParams();
    if (!values) return params;
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  get<T>(path: string, values?: Params): Observable<T> {
    return this.http.get<T>(`/api${path}`, { params: this.params(values) });
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(`/api${path}`, body);
  }

  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(`/api${path}`, body);
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(`/api${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`/api${path}`);
  }

  upload<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<T>(`/api${path}`, form);
  }

  download(path: string): Observable<Blob> {
    return this.http.get(`/api${path}`, { responseType: 'blob' });
  }
}
