import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// environment.ts n'est pas versionné : sans aiApiUrl, on vise le back lancé en local.
export const API_URL = ((environment as { aiApiUrl?: string }).aiApiUrl ?? 'http://localhost:8000').replace(/\/$/, '');

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AiAction = 'completer_profil' | 'voir_recherche' | 'voir_messages' | 'voir_ma' | 'deposer_annonce' | 'voir_abonnement';

export interface AiReply {
  reply: string;
  actions: AiAction[];
}

export interface AiContextItem {
  label: string;
  value: string;
}

export interface AiContext {
  profile: AiContextItem[];
  activity: AiContextItem[];
  suggested_questions: string[];
}

// Appelle le back Python (dossier backend/), qui injecte le contexte utilisateur et interroge le modèle d'IA.
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);

  async getContext(): Promise<AiContext> {
    return this.request(this.http.get<AiContext>(`${API_URL}/api/coaching-ia/contexte`));
  }

  async sendMessage(history: AiMessage[]): Promise<AiReply> {
    return this.request(this.http.post<AiReply>(`${API_URL}/api/coaching-ia/messages`, { messages: history }));
  }

  private async request<T>(call: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(call);
    } catch (error) {
      throw new Error(this.errorMessage(error));
    }
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return "L'assistant est indisponible pour le moment.";
    }

    if (error.status === 0) {
      return "Impossible de joindre l'assistant. Vérifiez que le back est lancé.";
    }

    const detail = (error.error as { detail?: unknown } | null)?.detail;
    return typeof detail === 'string' ? detail : "L'assistant est indisponible pour le moment.";
  }
}
