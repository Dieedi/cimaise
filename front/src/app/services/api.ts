import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import appConfig from '../../../../config/app.json';

const API_CONFIG = appConfig.api;

/**
 * ApiService: manages the connection to the backend server.
 *
 * Two modes:
 * - Disconnected (default): the app works fully offline with local .moody files
 * - Connected: shows server status in the context menu
 *
 * The backend API is primarily designed for external consumers (Python scripts)
 * to create boards, add images/frames, and export .moody files programmatically.
 *
 * Angular's HttpClient returns Observables (RxJS). We use firstValueFrom() to convert
 * them to Promises — simpler for one-shot requests like REST calls.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private serverUrl: string = API_CONFIG.defaultUrl;
  private _connected: boolean = false;

  public get connected(): boolean { return this._connected; }

  constructor(private http: HttpClient) {}

  /** Try to connect to the server. Returns true if server is reachable. */
  async tryConnect(url?: string): Promise<boolean> {
    if (url) this.serverUrl = url;
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string }>(`${this.serverUrl}${API_CONFIG.healthEndpoint}`)
      );
      this._connected = response.status === 'UP';
      return this._connected;
    } catch {
      this._connected = false;
      return false;
    }
  }

  /** Disconnect from server */
  disconnect(): void {
    this._connected = false;
  }
}
