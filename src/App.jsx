import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isSameMonth, isSameDay, addDays, addWeeks, subWeeks, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, CalendarDays, ChevronLeft, ChevronRight, Clock, Trash2 } from 'lucide-react';

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

// ─── Event Modal ────────────────────────────────────────────
function EventModal({ event, isEditing, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(event?.title || '');
  const [start, setStart] = useState(event?.start ? toLocalInput(new Date(event.start)) : '');
  const [end, setEnd] = useState(event?.end ? toLocalInput(new Date(event.end)) : '');
  const [color, setColor] = useState(event?.color || CATEGORIES[0].color);
  const [description, setDescription] = useState(event?.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !start || !end) return;
    onSave({ id: event?.id || Date.now(), title, start: new Date(start), end: new Date(end), color, description });
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
              <input className="form-input" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fim</label>
              <input className="form-input" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required />
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
          <div className="modal-actions">
            {isEditing && <button type="button" className="btn-delete" onClick={() => onDelete(event.id)}><Trash2 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Excluir</button>}
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save">Salvar</button>
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

  useEffect(() => {
    localStorage.setItem('organizador_events', JSON.stringify(events));
  }, [events]);

  const handleSelectSlot = useCallback(({ start, end }) => {
    if (swipeRef.current?.wasSwiping) return;
    setModalState({ event: { start, end, color: CATEGORIES[0].color }, isEditing: false });
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setModalState({ event, isEditing: true });
  }, []);

  const handleSave = useCallback((eventData) => {
    setEvents(prev => {
      const exists = prev.find(e => e.id === eventData.id);
      if (exists) return prev.map(e => e.id === eventData.id ? eventData : e);
      return [...prev, eventData];
    });
    setModalState(null);
  }, []);

  const handleDelete = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setModalState(null);
  }, []);

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

  // Custom event styling
  const eventPropGetter = useCallback((event) => ({
    style: {
      backgroundColor: event.color || CATEGORIES[0].color,
    },
  }), []);

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
    <div className="app-layout">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon"><CalendarDays size={20} /></div>
          <div>
            <h1>Organizador</h1>
            <span className="header-date">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="new-event-btn" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => {
            const now = new Date();
            const end = new Date(now.getTime() + 3600000);
            setModalState({ event: { start: now, end, color: CATEGORIES[0].color }, isEditing: false });
          }}>
            <Plus size={18} />
            Novo Evento
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
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

      {/* ── Main ── */}
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
            events={events}
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

      {/* ── Modal ── */}
      {modalState && (
        <EventModal
          event={modalState.event}
          isEditing={modalState.isEditing}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
