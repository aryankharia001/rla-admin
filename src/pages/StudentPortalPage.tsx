import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import apiClient from '../lib/apiClient';
import { examNames, studentPortalTabs, type Examination } from '../navigation/student-portal-tabs';
import { useAdminAuthStore } from '../store/useAdminAuthStore';

type TabContent = { tab: string; title: string; note: string };
const inputClass = 'w-full rounded-lg border border-[#48423a] bg-[#262626] px-3 py-2 text-[#F7F3E6]';

function TabEditor({ examination, tab, initial }: { examination: Examination; tab: string; initial?: TabContent }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('');
    setSaving(true);
    try {
      const response = await apiClient.put<{ data: TabContent }>('/admin/student-portal/' + examination + '/' + tab, { title, note });
      setTitle(response.data.data.title);
      setNote(response.data.data.note);
      setStatus('Saved to the student portal.');
    } catch {
      setStatus('Couldn’t save. Try again or check your settings permission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-4 grid gap-3">
      {tab !== 'profile' && (
        <label className="grid gap-1 text-sm">
          Sidebar label
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80}
            placeholder="Use the default label" className={inputClass} />
        </label>
      )}
      <label className="grid gap-1 text-sm">
        Note shown at the top of this student page
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={1200}
          placeholder="Optional instructions for signed-in students in this examination" className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving} type="submit" className="rounded-lg bg-[#c19b48] px-4 py-2 text-sm font-semibold text-[#1E1E1E] disabled:opacity-60">
          {saving ? 'Saving…' : 'Save tab'}
        </button>
        {status && <p role="status" className="text-sm">{status}</p>}
      </div>
    </form>
  );
}

export function StudentPortalPage() {
  const hasPermission = useAdminAuthStore((state) => state.hasPermission);
  const [examination, setExamination] = useState<Examination>('judiciary');
  const [query, setQuery] = useState('');
  const visibleTabs = studentPortalTabs[examination].filter((tab) =>
    (tab.label + ' ' + tab.description).toLowerCase().includes(query.trim().toLowerCase()));
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ examination: Examination; retry: number; tabs?: TabContent[] }>();
  const current = result?.examination === examination && result.retry === retry ? result : undefined;
  const canEdit = hasPermission('settings:edit');

  useEffect(() => {
    if (!canEdit) return;
    const controller = new AbortController();
    apiClient.get<{ data: TabContent[] }>('/student-portal/' + examination, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setResult({ examination, retry, tabs: data.data }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ examination, retry }); });
    return () => controller.abort();
  }, [canEdit, examination, retry]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold"><BookOpen aria-hidden className="size-6 text-[#c19b48]" /> Student Portal</h1>
        <p className="text-sm text-[#C8C1B5]">Choose an exam and a student tab to manage its content. Tab notes are visible to all signed-in students viewing that exam.</p>
      </header>
      <label className="flex flex-wrap items-center gap-3 text-sm font-medium">Examination
        <select className="rounded-lg border border-[#48423a] bg-[#262626] px-3 py-2 text-[#F7F3E6]"
          value={examination} onChange={(event) => { setExamination(event.target.value as Examination); setQuery(''); }}>
          {Object.entries(examNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Find a student tab
        <input type="search" className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for lessons, quizzes, notices..." />
      </label>
      {!visibleTabs.length && <p role="status">No matching tabs. <button className="underline" onClick={() => setQuery('')}>Show all tabs</button></p>}
      {canEdit && current && !current.tabs && <p role="alert">Couldn’t load saved tab content. <button className="underline" onClick={() => setRetry(retry + 1)}>Try again</button></p>}
      <div className="space-y-2">
        {visibleTabs.map((tab) => (
          <details key={examination + ':' + tab.id} className="rounded-xl border border-[#48423a] bg-[#222222]">
            <summary className="cursor-pointer px-4 py-3 font-semibold">{tab.label}</summary>
            <div className="border-t border-[#48423a] px-4 py-3">
              <p className="text-sm text-[#C8C1B5]">{tab.description}</p>
              {tab.manager && tab.permission && hasPermission(tab.permission) && (
                <Link className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#E8CF8D] underline" to={tab.manager}>
                  Manage content <ArrowRight aria-hidden className="size-4" />
                </Link>
              )}
              {tab.permission && !hasPermission(tab.permission) && <p className="mt-2 text-sm">Your staff role needs the {tab.permission} permission to open this content manager.</p>}
              {canEdit && current?.tabs && (
                <TabEditor examination={examination} tab={tab.id} initial={current.tabs.find((entry) => entry.tab === tab.id)} />
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

