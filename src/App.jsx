import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isSameMonth, isSameDay, addDays, addWeeks, subWeeks, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, Clock, Trash2, CloudSync, CheckCircle2, Wallet } from 'lucide-react';
import Financas from './Financas';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import './index.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const CATEGORIES = [
  { name: 'Índigo', color: '#6366f1' },
  { name: 'Rosa', color: '#f43f5e' },
  { name: 'Esmeralda', color: '#10b981' },
  { name: 'Âmbar', color: '#f59e0b' },
  { name: 'Ciano', color: '#06b6d4' },
  { name: 'Violeta', color: '#8b5cf6' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Laranja', color: '#f97316' },
];

const pad = (n) => (n < 10 ? '0' + n : '' + n);
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function loadEvents() {
  try {
    const saved = localStorage.getItem('organizador_events');
    if (!saved) return [];
    return JSON.parse(saved).map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) }));
  } catch { return []; }
}

// ─── Mini Calendar ──────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect }) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate || new Date()));

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = addDays(endOfMonth(viewMonth), 6 - getDay(monthEnd));
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewMonth]);

  return (
    <div className="mini-cal">
      <div className="mini-cal-header">
        <button className="mini-cal-nav" onClick={() => setViewMonth(subMonths(viewMonth, 1))}><ChevronLeft size={14} /></button>
        <span>{format(viewMonth, 'MMMM yyyy', { locale: ptBR })}</span>
        <button className="mini-cal-nav" onClick={() => setViewMonth(addMonths(viewMonth, 1))}><ChevronRight size={14} /></button>
      </div>
      <div className="mini-cal-grid">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="mini-cal-day-name">{d}</span>)}
        {days.map((day, i) => (
          <button
            key={i}
            className={`mini-cal-day ${isToday(day) ? 'today' : ''} ${!isSameMonth(day, viewMonth) ? 'other-month' : ''}`}
            onClick={() => onSelect(day)}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Wheel Select Component ──────────────────────────────────
function WheelSelect({ value, options, onChange }) {
  const containerRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typedValue, setTypedValue] = useState(value);

  // Sync scroll position to the current value initially
  useEffect(() => {
    if (isTyping || !containerRef.current) return;
    const index = options.indexOf(value);
    if (index >= 0) {
      containerRef.current.scrollTop = index * 34; // item height is 34px
    }
  }, [value, options, isTyping]);

  // Intercept wheel events to reduce sensitivity (1 notch = 1 item)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const direction = Math.sign(e.deltaY);
      el.scrollBy({ top: direction * 34, behavior: 'smooth' });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Update value when scroll stops
  const handleScroll = (e) => {
    const index = Math.round(e.target.scrollTop / 34);
    if (options[index] && options[index] !== value) {
      onChange(options[index]);
    }
  };

  const handleDoubleClick = () => {
    setTypedValue(value);
    setIsTyping(true);
  };

  const submitTyping = () => {
    setIsTyping(false);
    let padded = typedValue;
    if (padded.length === 1) padded = '0' + padded;
    
    // Only accept valid values for this specific wheel
    if (options.includes(padded)) {
      onChange(padded);
    }
  };

  if (isTyping) {
    return (
      <div className="wheel-select typing-mode">
        <input 
          className="wheel-input"
          type="number"
          value={typedValue}
          onChange={e => setTypedValue(e.target.value)}
          onBlur={submitTyping}
          onKeyDown={e => { if(e.key === 'Enter') submitTyping() }}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="wheel-select" ref={containerRef} onScroll={handleScroll} onDoubleClick={handleDoubleClick}>
      <div className="wheel-pad" />
      {options.map(opt => (
        <div 
          key={opt} 
          className={`wheel-item ${opt === value ? 'selected' : ''}`}
          onClick={() => {
            const idx = options.indexOf(opt);
            if (containerRef.current) {
              containerRef.current.scrollTo({ top: idx * 34, behavior: 'smooth' });
            }
          }}
        >
          {opt}
        </div>
      ))}
      <div className="wheel-pad" />
    </div>
  );
}

// ─── Time Select Component ────────────────────────────────────
function TimeSelect({ value, onChange, minHour = 0, minMinute = 0 }) {
  const [h, m] = value.split(':');
  const hNum = parseInt(h, 10);
  
  const hours = Array.from({length: 24}, (_, i) => pad(i))
    .filter(x => parseInt(x, 10) >= minHour);

  // Minutes only constrained if the current hour is exactly the minimum hour
  const effectiveMinMin = hNum === minHour ? minMinute : 0;
  const minutes = Array.from({length: 60}, (_, i) => pad(i))
    .filter(x => parseInt(x, 10) >= effectiveMinMin);

  return (
    <div className="custom-time-picker">
      <WheelSelect value={h} options={hours} onChange={newH => onChange(`${newH}:${m}`)} />
      <span className="time-colon">:</span>
      <WheelSelect value={m} options={minutes} onChange={newM => onChange(`${h}:${newM}`)} />
    </div>
  );
}

// ─── Event Modal ────────────────────────────────────────────
function EventModal({ event, isEditing, hasGoogleToken, onSave, onDelete, onClose }) {
  const extractDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const extractTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  
  const initialStart = event?.start ? new Date(event.start) : new Date();
  const initialEnd = event?.end ? new Date(event.end) : new Date(initialStart.getTime() + 3600000);

  const [title, setTitle] = useState(event?.title || '');
  const [startDate, setStartDate] = useState(extractDate(initialStart));
  const [startTime, setStartTime] = useState(extractTime(initialStart));
  const [endDate, setEndDate] = useState(extractDate(initialEnd));
  const [endTime, setEndTime] = useState(extractTime(initialEnd));
  const [color, setColor] = useState(event?.color || CATEGORIES[0].color);
  const [description, setDescription] = useState(event?.description || '');
  const [syncToGoogle, setSyncToGoogle] = useState(event?.isGoogle || false);

  // Auto-correct End Date/Time if Start pushes past it
  useEffect(() => {
    const s = new Date(`${startDate}T${startTime}:00`);
    const e = new Date(`${endDate}T${endTime}:00`);
    if (s > e) {
      setEndDate(startDate);
      setEndTime(startTime);
    }
  }, [startDate, startTime, endDate, endTime]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !startDate || !startTime || !endDate || !endTime) return;
    
    const startObj = new Date(`${startDate}T${startTime}:00`);
    const endObj = new Date(`${endDate}T${endTime}:00`);
    
    onSave({ id: event?.id || Date.now(), title, start: startObj, end: endObj, color, description, isGoogle: event?.isGoogle, syncToGoogle });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{isEditing ? 'Editar Evento' : 'Novo Evento'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título</label>
            <input className="form-input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Reunião de equipe" autoFocus required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Início</label>
              <div className="datetime-split">
                <input 
                  className="form-input date-part" 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  onClick={e => { try { e.target.showPicker(); } catch(err){} }}
                  required 
                />
                <TimeSelect value={startTime} onChange={setStartTime} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fim</label>
              <div className="datetime-split">
                <input 
                  className="form-input date-part" 
                  type="date" 
                  value={endDate} 
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)} 
                  onClick={e => { try { e.target.showPicker(); } catch(err){} }}
                  required 
                />
                <TimeSelect 
                  value={endTime} 
                  onChange={setEndTime} 
                  minHour={startDate === endDate ? parseInt(startTime.split(':')[0], 10) : 0}
                  minMinute={startDate === endDate ? parseInt(startTime.split(':')[1], 10) : 0}
                />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição (opcional)</label>
            <input className="form-input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes adicionais..." />
          </div>
          <div className="form-group">
            <label className="form-label">Cor</label>
            <div className="color-selector">
              {CATEGORIES.map(cat => (
                <button
                  type="button"
                  key={cat.color}
                  className={`color-dot ${color === cat.color ? 'selected' : ''}`}
                  style={{ backgroundColor: cat.color, color: cat.color }}
                  onClick={() => setColor(cat.color)}
                  title={cat.name}
                />
              ))}
            </div>
          </div>
          {hasGoogleToken && (
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
              <input 
                type="checkbox" 
                id="sync-google" 
                checked={syncToGoogle} 
                onChange={e => setSyncToGoogle(e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4285F4' }}
              />
              <label htmlFor="sync-google" className="form-label" style={{ margin: 0, cursor: 'pointer', color: '#4285F4' }}>
                Salvar também no Google Agenda
              </label>
            </div>
          )}
          <div className="modal-actions">
            {isEditing && (!event.isGoogle || hasGoogleToken) && <button type="button" className="btn-delete" onClick={() => onDelete(event.id)}><Trash2 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Excluir</button>}
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            {(!event?.isGoogle || hasGoogleToken) && <button type="submit" className="btn-save">Salvar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────
export default function App() {
  const [events, setEvents] = useState(loadEvents);
  const [modalState, setModalState] = useState(null); // null | { event, isEditing }
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('week');
  const [googleToken, setGoogleToken] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    localStorage.setItem('organizador_events', JSON.stringify(events));
  }, [events]);

  // Load Google Auth on mount
  useEffect(() => {
    const authDataStr = localStorage.getItem('organizador_google_auth');
    if (authDataStr) {
      try {
        const authData = JSON.parse(authDataStr);
        if (authData.expiresAt > new Date().getTime()) {
          setGoogleToken(authData.token);
          fetchGoogleEvents(authData.token);
        } else {
          localStorage.removeItem('organizador_google_auth');
        }
      } catch (e) {}
    }
  }, []);

  // ─── Google Calendar Sync ─────────────────────────────────
  const handleGoogleSync = useCallback(() => {
    if (!window.google) {
      alert("A biblioteca do Google ainda está carregando ou foi bloqueada pelo navegador.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: (response) => {
        if (response.error) {
          console.error(response);
          alert('Erro ao autenticar com o Google.');
          return;
        }
        const expiryTime = new Date().getTime() + (response.expires_in * 1000);
        localStorage.setItem('organizador_google_auth', JSON.stringify({
          token: response.access_token,
          expiresAt: expiryTime
        }));
        
        setGoogleToken(response.access_token);
        fetchGoogleEvents(response.access_token);
      },
    });
    client.requestAccessToken();
  }, []);

  const fetchGoogleEvents = async (token) => {
    try {
      // Puxa eventos de 1 mês atrás até os futuros
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1);
      
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&maxResults=250&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.items) {
        const gEvents = data.items.map(item => ({
          id: item.id,
          title: item.summary || 'Sem Título',
          start: new Date(item.start.dateTime || item.start.date),
          end: new Date(item.end.dateTime || item.end.date),
          description: item.description || '',
          color: '#4285F4', // Azul clássico do Google
          isGoogle: true
        }));
        
        // Mantém os eventos locais criados pelo usuário e substitui os do Google pelos mais recentes
        setEvents(prev => {
          const localOnly = prev.filter(e => !e.isGoogle);
          return [...localOnly, ...gEvents];
        });
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao importar eventos do Google Agenda.');
    }
  };

  const handleSelectSlot = useCallback(({ start, end }) => {
    if (swipeRef.current?.wasSwiping) return;
    setModalState({ event: { start, end, color: CATEGORIES[0].color }, isEditing: false });
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setModalState({ event, isEditing: true });
  }, []);

  const handleSave = useCallback(async (eventData) => {
    let finalEvent = { ...eventData };
    
    // Sync to Google Calendar if requested
    if (eventData.syncToGoogle && googleToken) {
      try {
        const gEvent = {
          summary: eventData.title,
          description: eventData.description,
          start: { dateTime: eventData.start.toISOString() },
          end: { dateTime: eventData.end.toISOString() }
        };
        
        const method = eventData.isGoogle ? 'PUT' : 'POST';
        const url = eventData.isGoogle 
          ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventData.id}`
          : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

        const res = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${googleToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(gEvent)
        });
        const data = await res.json();
        
        if (data.id) {
          finalEvent = { ...finalEvent, id: data.id, isGoogle: true, color: '#4285F4' };
        }
      } catch (err) {
        console.error(err);
        alert('Falha ao salvar no Google. O evento foi salvo apenas localmente.');
      }
    }

    setEvents(prev => {
      const exists = prev.find(e => e.id === finalEvent.id);
      if (exists) return prev.map(e => e.id === finalEvent.id ? finalEvent : e);
      return [...prev, finalEvent];
    });
    setModalState(null);
  }, [googleToken]);

  const handleDelete = useCallback(async (id) => {
    const eventToDelete = events.find(e => e.id === id);
    if (eventToDelete?.isGoogle && googleToken) {
      try {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${googleToken}` }
        });
      } catch (err) {
        console.error(err);
        alert('Falha ao excluir do Google Agenda.');
      }
    }
    setEvents(prev => prev.filter(e => e.id !== id));
    setModalState(null);
  }, [events, googleToken]);

  const handleMiniCalSelect = useCallback((date) => {
    setCalDate(date);
    setCalView('day');
  }, []);

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const weekOut = addDays(now, 7);
    return events
      .filter(e => e.start >= now && e.start <= weekOut)
      .sort((a, b) => a.start - b.start)
      .slice(0, 8);
  }, [events]);

  // Stats
  const todayCount = useMemo(() => events.filter(e => isToday(e.start)).length, [events]);
  const weekCount = useMemo(() => {
    const now = new Date();
    const weekOut = addDays(now, 7);
    return events.filter(e => e.start >= now && e.start <= weekOut).length;
  }, [events]);

  // Inject draft event while creating
  const displayEvents = useMemo(() => {
    if (modalState && !modalState.isEditing) {
      return [...events, { ...modalState.event, id: 'draft-preview', title: 'Novo Evento...' }];
    }
    return events;
  }, [events, modalState]);

  // Custom event styling
  const eventPropGetter = useCallback((event) => {
    if (event.id === 'draft-preview') {
      return {
        className: 'rbc-draft-event',
        style: {
          backgroundColor: 'rgba(129, 140, 248, 0.3)',
          border: '1px dashed var(--primary)',
          color: 'var(--text-primary)',
          opacity: 0.8,
        }
      };
    }
    return {
      style: {
        backgroundColor: event.color || CATEGORIES[0].color,
      },
    };
  }, []);

  // ─── Swipe / Drag Navigation ───────────────────────────────
  const wrapperRef = useRef(null);
  const swipeRef = useRef({ startX: 0, startY: 0, active: false, locked: false, isHorizontal: false, dragOffset: 0 });

  const THRESHOLD = 120; // px to trigger navigation
  const RESISTANCE = 0.45; // dampen drag past threshold

  const navigateCalendar = useCallback((direction) => {
    setCalDate(prev => {
      if (calView === 'month') return direction > 0 ? addMonths(prev, 1) : subMonths(prev, 1);
      if (calView === 'week') return direction > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1);
      if (calView === 'day') return direction > 0 ? addDays(prev, 1) : subDays(prev, 1);
      return prev;
    });
  }, [calView]);

  const applyDrag = useCallback((clientX) => {
    const dx = clientX - swipeRef.current.startX;
    const dy = (swipeRef.current.lastY || swipeRef.current.startY) - swipeRef.current.startY;

    // Lock direction on first significant movement (make it stricter to avoid intercepting vertical slot selections)
    if (!swipeRef.current.locked) {
      if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
        swipeRef.current.locked = true;
        // Must be mostly horizontal to be considered a swipe
        swipeRef.current.isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
      }
    }

    if (!swipeRef.current.locked || !swipeRef.current.isHorizontal) return;

    // Apply elastic resistance past threshold
    let offset = dx;
    if (Math.abs(offset) > THRESHOLD) {
      const extra = Math.abs(offset) - THRESHOLD;
      offset = (THRESHOLD + extra * RESISTANCE) * Math.sign(offset);
    }

    swipeRef.current.dragOffset = offset;
    
    if (wrapperRef.current) {
      const progress = Math.min(Math.abs(offset) / THRESHOLD, 1);
      const style = wrapperRef.current.style;
      style.setProperty('--drag-x', `${offset}px`);
      style.setProperty('--drag-opacity', String(1 - progress * 0.15));
      style.setProperty('--drag-transition', 'none');
      style.setProperty('--hint-next-opacity', offset < -30 ? progress : 0);
      style.setProperty('--hint-prev-opacity', offset > 30 ? progress : 0);
      style.setProperty('--hint-next-scale', offset < -30 ? progress : 0);
      style.setProperty('--hint-prev-scale', offset > 30 ? progress : 0);
    }
  }, []);

  const finishDrag = useCallback((clientX) => {
    if (!swipeRef.current.active) return;
    swipeRef.current.active = false;

    const dx = clientX - swipeRef.current.startX;

    // Prevent slot selection only if we locked horizontally and dragged enough
    if (swipeRef.current.locked && swipeRef.current.isHorizontal && Math.abs(dx) > 30) {
      swipeRef.current.wasSwiping = true;
      setTimeout(() => {
        if (swipeRef.current) swipeRef.current.wasSwiping = false;
      }, 150);
    }

    if (swipeRef.current.isHorizontal && Math.abs(dx) > THRESHOLD) {
      // Animate out, then navigate
      const dir = dx < 0 ? 1 : -1;
      
      if (wrapperRef.current) {
        const style = wrapperRef.current.style;
        style.setProperty('--drag-transition', 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease');
        style.setProperty('--drag-x', `${dir * -500}px`);
        style.setProperty('--hint-next-opacity', 0);
        style.setProperty('--hint-prev-opacity', 0);
      }

      setTimeout(() => {
        navigateCalendar(dir);
        if (wrapperRef.current) {
          const style = wrapperRef.current.style;
          style.setProperty('--drag-transition', 'none');
          style.setProperty('--drag-x', '0px');
          style.setProperty('--drag-opacity', '1');
        }
      }, 250);
    } else {
      // Snap back
      if (wrapperRef.current) {
        const style = wrapperRef.current.style;
        style.setProperty('--drag-transition', 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease');
        style.setProperty('--drag-x', '0px');
        style.setProperty('--drag-opacity', '1');
        style.setProperty('--hint-next-opacity', 0);
        style.setProperty('--hint-prev-opacity', 0);
      }
    }

    swipeRef.current.locked = false;
    swipeRef.current.isHorizontal = false;
  }, [navigateCalendar]);

  // Mouse handlers
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a') return;
    swipeRef.current = { startX: e.clientX, startY: e.clientY, active: true, locked: false, isHorizontal: false, lastY: e.clientY };
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!swipeRef.current.active) return;
    swipeRef.current.lastY = e.clientY;
    applyDrag(e.clientX);
  }, [applyDrag]);

  const handlePointerUp = useCallback((e) => {
    finishDrag(e.clientX);
  }, [finishDrag]);

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    swipeRef.current = { startX: t.clientX, startY: t.clientY, active: true, locked: false, isHorizontal: false, lastY: t.clientY };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!swipeRef.current.active) return;
    const t = e.touches[0];
    swipeRef.current.lastY = t.clientY;
    applyDrag(t.clientX);
  }, [applyDrag]);

  const handleTouchEnd = useCallback((e) => {
    const t = e.changedTouches[0];
    finishDrag(t.clientX);
  }, [finishDrag]);

  // Computed swipe labels (static rendering, controlled by CSS vars)
  const nextLabel = calView === 'day' ? 'Próximo dia →' : calView === 'week' ? 'Próxima semana →' : 'Próximo mês →';
  const prevLabel = calView === 'day' ? '← Dia anterior' : calView === 'week' ? '← Semana anterior' : '← Mês anterior';

  return (
    <div className={`app-layout ${activeTab === 'finances' ? 'app-layout-full' : ''}`}>
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <div className="app-logo-icon"><CalendarDays size={20} /></div>
            <div>
              <h1>Organizador</h1>
              <span className="header-date">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
          </div>
          <nav className="tab-nav">
            <button className={`tab-btn ${activeTab === 'calendar' ? 'tab-active' : ''}`} onClick={() => setActiveTab('calendar')}>
              <CalendarDays size={16} />
              Calendário
            </button>
            <button className={`tab-btn ${activeTab === 'finances' ? 'tab-active' : ''}`} onClick={() => setActiveTab('finances')}>
              <Wallet size={16} />
              Finanças
            </button>
          </nav>
        </div>
        {activeTab === 'calendar' && (
          <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={googleToken ? undefined : handleGoogleSync} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                background: googleToken ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-elevated)', 
                border: `1px solid ${googleToken ? '#10b981' : 'var(--border)'}`, 
                color: googleToken ? '#10b981' : 'var(--text-primary)', 
                padding: '8px 14px', borderRadius: 'var(--radius)', 
                cursor: googleToken ? 'default' : 'pointer', 
                transition: '0.2s', fontSize: '0.9rem', fontWeight: '500' 
              }}
              onMouseOver={e => !googleToken && (e.currentTarget.style.borderColor = '#4285F4')}
              onMouseOut={e => !googleToken && (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {googleToken ? <CheckCircle2 size={18} color="#10b981" /> : <CloudSync size={18} color="#4285F4" />}
              {googleToken ? 'Google Sincronizado' : 'Sincronizar Google'}
            </button>
            
            <button className="new-event-btn" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => {
              const now = new Date();
              const end = new Date(now.getTime() + 3600000);
              setModalState({ event: { start: now, end, color: CATEGORIES[0].color }, isEditing: false });
            }}>
              <Plus size={18} />
              Novo Evento
            </button>
          </div>
        )}
      </header>

      {/* ── Sidebar (only for calendar) ── */}
      {activeTab === 'calendar' && (
        <aside className="sidebar">
          <MiniCalendar selectedDate={calDate} onSelect={handleMiniCalSelect} />

          <div className="sidebar-section">
            <span className="sidebar-section-title">Resumo</span>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{todayCount}</div>
                <div className="stat-label">Hoje</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{weekCount}</div>
                <div className="stat-label">7 dias</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{events.length}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-section-title">Próximos Eventos</span>
            {upcomingEvents.length === 0 ? (
              <div className="no-events">Nenhum evento nos próximos 7 dias.</div>
            ) : (
              <div className="upcoming-list">
                {upcomingEvents.map(ev => (
                  <div key={ev.id} className="upcoming-item" onClick={() => handleSelectEvent(ev)}>
                    <span className="upcoming-dot" style={{ backgroundColor: ev.color || CATEGORIES[0].color }} />
                    <div className="upcoming-info">
                      <div className="upcoming-title">{ev.title}</div>
                      <div className="upcoming-time">
                        <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                        {format(ev.start, "EEE, dd MMM · HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ── Main ── */}
      {activeTab === 'calendar' ? (
        <main className="main-content">
          <div
            className="calendar-wrapper"
            ref={wrapperRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Swipe hints (opacity controlled via CSS vars) */}
            <div className="swipe-hint next" style={{ opacity: 'var(--hint-next-opacity, 0)', transition: 'opacity 0.1s' }}>
              <div className="swipe-hint-bar" style={{ transform: 'scaleX(var(--hint-next-scale, 0))' }} />
              <span className="swipe-hint-label">{nextLabel}</span>
            </div>

            <div className="swipe-hint prev" style={{ opacity: 'var(--hint-prev-opacity, 0)', transition: 'opacity 0.1s' }}>
              <div className="swipe-hint-bar" style={{ transform: 'scaleX(var(--hint-prev-scale, 0))' }} />
              <span className="swipe-hint-label">{prevLabel}</span>
            </div>

            <Calendar
              localizer={localizer}
              events={displayEvents}
              date={calDate}
              view={calView}
              onNavigate={setCalDate}
              onView={setCalView}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              selectable="ignoreEvents"
              longPressThreshold={250}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter}
              culture="pt-BR"
              messages={{
                next: "Próximo",
                previous: "Anterior",
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
                agenda: "Agenda",
                date: "Data",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Nenhum evento neste período.",
                showMore: (total) => `+${total} mais`,
              }}
              defaultView="week"
              views={['month', 'week', 'day', 'agenda']}
              popup
              scrollToTime={new Date(1970, 1, 1, 7, 0, 0)}
            />
          </div>
        </main>
      ) : (
        <main className="main-content main-content-full">
          <Financas />
        </main>
      )}

      {/* ── Modal ── */}
      {modalState && (
        <EventModal
          event={modalState.event}
          isEditing={modalState.isEditing}
          hasGoogleToken={!!googleToken}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
