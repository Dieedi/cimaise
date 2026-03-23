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
 * - Connected: the app talks to the Spring Boot server for shared boards, sessions, scripting
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
  private _sessionToken: string | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  public get connected(): boolean { return this._connected; }
  public get sessionToken(): string | null { return this._sessionToken; }

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

  /** Disconnect from server and clean up */
  async disconnect(): Promise<void> {
    if (this._sessionToken) {
      await this.closeSession();
    }
    this._connected = false;
  }

  // ─── Boards ──────────────────────────────────────────────

  async listBoards(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.serverUrl}/api/boards`));
  }

  async getBoard(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.serverUrl}/api/boards/${id}`));
  }

  async createBoard(title: string, filePath: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.serverUrl}/api/boards`, { title, filePath })
    );
  }

  async updateBoard(id: string, data: { title?: string; filePath?: string }): Promise<any> {
    return firstValueFrom(
      this.http.put<any>(`${this.serverUrl}/api/boards/${id}`, data)
    );
  }

  async deleteBoard(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.serverUrl}/api/boards/${id}`)
    );
  }

  // ─── Sessions ────────────────────────────────────────────

  /** Open a board on the server: get a session token and see who else is on it */
  async openSession(boardId: string, clientName: string): Promise<{ token: string; otherClients: string[] }> {
    const response = await firstValueFrom(
      this.http.post<{ token: string; otherClients: string[] }>(
        `${this.serverUrl}/api/sessions`,
        { boardId, clientName }
      )
    );
    this._sessionToken = response.token;
    this.startHeartbeat();
    return response;
  }

  /** Close the current session */
  async closeSession(): Promise<void> {
    this.stopHeartbeat();
    if (this._sessionToken) {
      try {
        await firstValueFrom(
          this.http.delete<void>(`${this.serverUrl}/api/sessions/${this._sessionToken}`)
        );
      } catch { /* server might be down, ignore */ }
      this._sessionToken = null;
    }
  }

  /** List who is currently on a board */
  async getBoardSessions(boardId: string): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${this.serverUrl}/api/sessions/board/${boardId}`)
    );
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      if (!this._sessionToken) return;
      try {
        await firstValueFrom(
          this.http.put<void>(
            `${this.serverUrl}/api/sessions/${this._sessionToken}/heartbeat`,
            {}
          )
        );
      } catch {
        // Server unreachable — session will expire on its own
      }
    }, API_CONFIG.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ─── Board Images ────────────────────────────────────────

  async listImages(boardId: string): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${this.serverUrl}/api/boards/${boardId}/images`)
    );
  }

  async addImage(boardId: string, data: {
    filePath: string; x: number; y: number; width: number; height: number;
    scaleX?: number; scaleY?: number; rotation?: number;
  }): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.serverUrl}/api/boards/${boardId}/images`, data)
    );
  }

  async updateImage(boardId: string, imageId: string, data: any): Promise<any> {
    return firstValueFrom(
      this.http.put<any>(`${this.serverUrl}/api/boards/${boardId}/images/${imageId}`, data)
    );
  }

  async deleteImage(boardId: string, imageId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.serverUrl}/api/boards/${boardId}/images/${imageId}`)
    );
  }

  // ─── Board Frames ────────────────────────────────────────

  async listFrames(boardId: string): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${this.serverUrl}/api/boards/${boardId}/frames`)
    );
  }

  async addFrame(boardId: string, data: {
    title?: string; x: number; y: number; width: number; height: number;
    children?: string[];
  }): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.serverUrl}/api/boards/${boardId}/frames`, data)
    );
  }

  async updateFrame(boardId: string, frameId: string, data: any): Promise<any> {
    return firstValueFrom(
      this.http.put<any>(`${this.serverUrl}/api/boards/${boardId}/frames/${frameId}`, data)
    );
  }

  async deleteFrame(boardId: string, frameId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.serverUrl}/api/boards/${boardId}/frames/${frameId}`)
    );
  }
}
