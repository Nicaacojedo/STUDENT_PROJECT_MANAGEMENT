import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse, RoleName, User } from './models';

const TOKEN_KEY = 'spms_token';
const USER_KEY = 'spms_user';

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(ApiService);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(readUser());
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly isLoggedIn = computed(() => !!this.token());
  readonly role = computed<RoleName | string>(() => this.user()?.role ?? '');
  readonly isAdmin = computed(() => this.role() === 'Admin');
  readonly isAdviser = computed(() => this.role() === 'Adviser');
  readonly isStudent = computed(() => ['Student', 'Team Leader'].includes(this.role()));
  readonly homeRoute = computed(() => (this.token() ? '/dashboard' : '/login'));

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/auth/login', { email, password })
      .pipe(tap((response) => this.setSession(response)));
  }

  register(payload: Record<string, unknown>): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/auth/register', payload)
      .pipe(tap((response) => this.setSession(response)));
  }

  loadMe(): Observable<{ user: User }> {
    return this.http
      .get<{ user: User }>('/auth/me')
      .pipe(tap((response) => this.storeUser(response.user)));
  }

  updateProfile(payload: Record<string, unknown>): Observable<{ user: User }> {
    return this.http
      .put<{ user: User }>('/auth/profile', payload)
      .pipe(tap((response) => this.storeUser(response.user)));
  }

  logout(redirect = true): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
    if (redirect) {
      this.router.navigate(['/login']);
    }
  }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this.role());
  }

  private setSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    this.token.set(response.token);
    this.storeUser(response.user);
  }

  private storeUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.user.set(user);
  }
}
