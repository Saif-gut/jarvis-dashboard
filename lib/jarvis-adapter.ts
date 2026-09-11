import type { JarvisStatus } from './dashboard-types';

export interface JarvisAdapter {
  getStatus(): Promise<JarvisStatus>;
  connect(): Promise<void>;
  ask(message: string): Promise<string>;
}

export class DisconnectedJarvisAdapter implements JarvisAdapter {
  async getStatus(): Promise<JarvisStatus> {
    return 'nicht_verbunden';
  }

  async connect(): Promise<void> {
    throw new Error('Die Jarvis-Verbindung ist in dieser Version noch nicht eingerichtet.');
  }

  async ask(_message: string): Promise<string> {
    throw new Error('Jarvis ist nicht verbunden.');
  }
}

export const jarvisAdapter: JarvisAdapter = new DisconnectedJarvisAdapter();
