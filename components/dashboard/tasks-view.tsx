'use client';

import { Check, CheckSquare2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Priority, TaskDraft, TaskItem } from '@/lib/dashboard-types';
import { formatDate } from '@/lib/dashboard-utils';

const emptyDraft: TaskDraft = { title: '', due_date: '', priority: 'mittel' };

export function TasksView({ tasks, loading, error, onCreate, onUpdate, onToggle, onDelete }: { tasks: TaskItem[]; loading: boolean; error: string | null; onCreate: (draft: TaskDraft) => Promise<void>; onUpdate: (id: number, draft: TaskDraft) => Promise<void>; onToggle: (task: TaskItem) => Promise<void>; onDelete: (task: TaskItem) => Promise<void> }) {
  const [filter, setFilter] = useState<'offen' | 'erledigt'>('offen');
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const filtered = tasks.filter((task) => filter === 'erledigt' ? task.completed : !task.completed);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) await onUpdate(editingId, draft);
      else await onCreate(draft);
      setDraft(emptyDraft);
      setEditingId(null);
    } finally { setSaving(false); }
  };

  const edit = (task: TaskItem) => {
    setEditingId(task.id);
    setDraft({ title: task.title, due_date: task.due_date ?? '', priority: task.priority });
  };

  return (
    <section aria-labelledby="tasks-heading">
      <div className="section-heading"><div><p className="eyebrow">LOKAL GESPEICHERT</p><h2 id="tasks-heading">Aufgaben</h2></div><span>{tasks.filter((task) => !task.completed).length} offen · {tasks.filter((task) => task.completed).length} erledigt</span></div>
      {error && <div className="inline-alert" role="alert"><span className="status-dot warning" /> {error}</div>}
      <Card className="panel task-composer">
        <CardHeader><CardDescription>{editingId ? 'AUFGABE BEARBEITEN' : 'NEUE AUFGABE'}</CardDescription><CardTitle>{editingId ? 'Details aktualisieren' : 'Was steht als Nächstes an?'}</CardTitle></CardHeader>
        <CardContent><form onSubmit={submit} className="task-form"><label><span>Aufgabe</span><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={200} placeholder="z. B. Backup prüfen" required /></label><label><span>Fällig am</span><Input type="date" value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} /></label><label><span>Priorität</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="niedrig">Niedrig</option><option value="mittel">Mittel</option><option value="hoch">Hoch</option></select></label><Button type="submit" disabled={saving}>{editingId ? <Check /> : <Plus />}{saving ? 'Speichert…' : editingId ? 'Änderung speichern' : 'Hinzufügen'}</Button>{editingId && <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}><X /> Abbrechen</Button>}</form></CardContent>
      </Card>
      <div className="filter-tabs" role="group" aria-label="Aufgaben filtern"><button className={filter === 'offen' ? 'active' : ''} onClick={() => setFilter('offen')} type="button">Offen</button><button className={filter === 'erledigt' ? 'active' : ''} onClick={() => setFilter('erledigt')} type="button">Erledigt</button></div>
      <div className="task-list" aria-live="polite">
        {loading ? <Card className="panel empty-state"><CardContent>Aufgaben werden geladen…</CardContent></Card> : filtered.length === 0 ? <Card className="panel empty-state"><CardContent><CheckSquare2 /><h3>{filter === 'offen' ? 'Alles erledigt' : 'Noch keine erledigten Aufgaben'}</h3><p>{filter === 'offen' ? 'Neue Aufgaben können oben hinzugefügt werden.' : 'Erledigte Aufgaben erscheinen automatisch hier.'}</p></CardContent></Card> : filtered.map((task) => <Card key={task.id} className={`panel task-row ${task.completed ? 'completed' : ''}`}><CardContent><button type="button" className="task-check" onClick={() => void onToggle(task)} aria-label={task.completed ? `${task.title} wieder öffnen` : `${task.title} als erledigt markieren`}>{task.completed && <Check />}</button><div className="task-copy"><strong>{task.title}</strong><div><Badge className={`priority ${task.priority}`} variant="outline">{task.priority}</Badge><span>{formatDate(task.due_date)}</span></div></div><div className="row-actions"><Button variant="ghost" size="icon" onClick={() => edit(task)} aria-label={`${task.title} bearbeiten`}><Pencil /></Button><Button variant="ghost" size="icon" onClick={() => void onDelete(task)} aria-label={`${task.title} löschen`}><Trash2 /></Button></div></CardContent></Card>)}
      </div>
    </section>
  );
}
