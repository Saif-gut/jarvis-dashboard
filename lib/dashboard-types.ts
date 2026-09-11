export type Priority = 'niedrig' | 'mittel' | 'hoch';

export interface SystemMetrics {
  cpu_percent: number;
  memory_percent: number;
  memory_used: number;
  memory_total: number;
  disk_used: number;
  disk_free: number;
  disk_total: number;
  disk_percent: number;
  cpu_cores_logical: number;
  cpu_cores_physical: number | null;
  operating_system: string;
  hostname: string;
  last_updated: string;
}

export interface MetricPoint {
  time: string;
  cpu: number;
  ram: number;
}

export interface TaskItem {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface NoteItem {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface WeatherHour {
  time: string;
  temperature: number;
  precipitation_probability: number;
  weather_code: number;
  description: string;
}

export interface WeatherData {
  location: { name: string; postal_code: string; country: string };
  current: {
    temperature: number;
    apparent_temperature: number;
    wind_speed: number;
    weather_code: number;
    description: string;
    precipitation_probability: number;
  };
  next_hours: WeatherHour[];
  tomorrow: {
    date: string;
    temperature_max: number;
    temperature_min: number;
    precipitation_probability: number;
    weather_code: number;
    description: string;
  };
  last_updated: string;
}

export type JarvisStatus =
  | 'nicht_verbunden'
  | 'bereit'
  | 'hoert_zu'
  | 'verarbeitet'
  | 'spricht'
  | 'gestoppt'
  | 'fehler';

export interface JarvisRuntime {
  status: JarvisStatus;
  connected: boolean;
  managed: boolean;
  pid: number | null;
  started_at: string | null;
  runtime_seconds: number | null;
  logs: string[];
  message: string | null;
  last_user_text: string | null;
  last_response: string | null;
}

export interface TaskDraft {
  title: string;
  due_date: string;
  priority: Priority;
}
