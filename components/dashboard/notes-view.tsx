'use client';

import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { NoteItem } from '@/lib/dashboard-types';
import { formatDateTime } from '@/lib/dashboard-utils';

export function NotesView({ notes, loading, error, onCreate, onSave, onDelete }: { notes: NoteItem[]; loading: boolean; error: string | null; onCreate: () => Promise<NoteItem>; onSave: (id: number, title: string, content: string) => Promise<void>; onDelete: (note: NoteItem) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<'gespeichert' | 'speichert' | 'fehler'>('gespeichert');
  const active = notes.find((note) => note.id === activeId) ?? null;
  const filtered = useMemo(() => notes.filter((note) => `${note.title} ${note.content}`.toLocaleLowerCase('de-DE').includes(search.toLocaleLowerCase('de-DE'))), [notes, search]);

  useEffect(() => {
    if (!active && notes.length > 0) setActiveId(notes[0].id);
  }, [active, notes]);

  useEffect(() => {
    if (active) { setTitle(active.title); setContent(active.content); setSaveState('gespeichert'); }
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active || (title === active.title && content === active.content)) return;
    setSaveState('speichert');
    const timer = window.setTimeout(() => {
      void onSave(active.id, title || 'Ohne Titel', content).then(() => setSaveState('gespeichert')).catch(() => setSaveState('fehler'));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [active, title, content, onSave]);

  const create = async () => { const note = await onCreate(); setActiveId(note.id); };

  return (
    <section aria-labelledby="notes-heading">
      <div className="section-heading"><div><p className="eyebrow">AUTOMATISCH GESPEICHERT</p><h2 id="notes-heading">Notizen</h2></div><Button onClick={() => void create()}><Plus /> Neue Notiz</Button></div>
      {error && <div className="inline-alert" role="alert"><span className="status-dot warning" /> {error}</div>}
      <div className="notes-layout">
        <Card className="panel notes-sidebar"><CardContent><label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Notizen suchen</span><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Notizen durchsuchen…" /></label><div className="note-list">{loading ? <p className="list-message">Notizen werden geladen…</p> : filtered.length === 0 ? <p className="list-message">Keine Notizen gefunden.</p> : filtered.map((note) => <button type="button" key={note.id} className={note.id === activeId ? 'note-item active' : 'note-item'} onClick={() => setActiveId(note.id)}><strong>{note.title || 'Ohne Titel'}</strong><span>{note.content || 'Leere Notiz'}</span><time>{formatDateTime(note.updated_at)}</time></button>)}</div></CardContent></Card>
        <Card className="panel note-editor"><CardContent>{active ? <><div className="editor-toolbar"><span className={`save-state ${saveState}`}>{saveState === 'gespeichert' ? 'Gespeichert' : saveState === 'speichert' ? 'Speichert…' : 'Speichern fehlgeschlagen'}</span><Button variant="ghost" size="sm" onClick={() => void onDelete(active)}><Trash2 /> Löschen</Button></div><label><span className="sr-only">Notiztitel</span><Input className="note-title-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="Titel" /></label><label><span className="sr-only">Notizinhalt</span><Textarea className="note-content-input" value={content} onChange={(event) => setContent(event.target.value)} maxLength={10000} placeholder="Gedanken festhalten…" /></label><p className="editor-meta">Zuletzt geändert: {formatDateTime(active.updated_at)}</p></> : <div className="empty-editor"><FileText /><h3>Wähle eine Notiz aus</h3><p>Oder erstelle eine neue Notiz, um zu beginnen.</p></div>}</CardContent></Card>
      </div>
    </section>
  );
}
