'use client';
import { useCallback, useEffect, useState } from 'react';
import { COURSE_STORAGE_KEY } from '@/app/(lib)/curso';

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(COURSE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(slugs: string[]) {
  try {
    window.localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Sin storage (modo privado, bloqueado): el progreso vive solo en esta pestaña.
  }
}

/** Lecciones vistas (set de slugs) en localStorage. Funciona igual sin storage, en memoria. */
export function useCourseProgress() {
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSeen(new Set(read()));
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === COURSE_STORAGE_KEY) setSeen(new Set(read()));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markSeen = useCallback((slug: string) => {
    setSeen((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      write(Array.from(next));
      return next;
    });
  }, []);

  const toggle = useCallback((slug: string) => {
    setSeen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      write(Array.from(next));
      return next;
    });
  }, []);

  return { seen, ready, markSeen, toggle };
}
