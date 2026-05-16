import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, remove as fbRemove } from "firebase/database";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const firebaseConfig = {
  apiKey: "AIzaSyCMcJP8hAdKCwl5IlHjZqu9y6enG79Isao",
  authDomain: "mon-voyage-5031e.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL,
  projectId: "mon-voyage-5031e",
  storageBucket: "mon-voyage-5031e.firebasestorage.app",
  messagingSenderId: "510891652679",
  appId: "1:510891652679:web:20a86ae03b985d8f3aa362"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const TABS = ["Planning", "Budget", "To-Do"];
const TAB_ICONS = ["📅", "💰", "✅"];
const defaultVoyageData = { stops: [], budget: { items: [] }, todos: [] };

const STOP_CATEGORIES = [
  { id: "avion",      label: "Avion",      emoji: "✈️",  color: "#5B8DEF" },
  { id: "train",      label: "Train",      emoji: "🚆",  color: "#F5A623" },
  { id: "bus",        label: "Bus",        emoji: "🚌",  color: "#7ED321" },
  { id: "bateau",     label: "Bateau",     emoji: "⛵",  color: "#1ABC9C" },
  { id: "activite",   label: "Activite",   emoji: "🎯",  color: "#E74C3C" },
  { id: "restaurant", label: "Restaurant", emoji: "🍽️", color: "#E67E22" },
];
const getCat = (id) => STOP_CATEGORIES.find((c) => c.id === id) || STOP_CATEGORIES[0];

function ensureStopIds(stops) {
  let changed = false;
  const result = stops.map((s) => {
    if (!s._id) { changed = true; return { ...s, _id: "s_" + Math.random().toString(36).slice(2, 9) }; }
    return s;
  });
  return { stops: result, changed };
}

function useVoyages() {
  const [voyages, setVoyages] = useState({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const r = ref(db, "voyages");
    const unsub = onValue(r, (snap) => { setVoyages(snap.val() || {}); setLoaded(true); });
    return () => unsub();
  }, []);
  const createVoyage = (name, destination, dates) => {
    const id = "voyage_" + Date.now();
    set(ref(db, `voyages/${id}`), { meta: { name, destination, dates, createdAt: Date.now() }, ...defaultVoyageData });
    return id;
  };
  const deleteVoyage = (id) => fbRemove(ref(db, `voyages/${id}`));
  const saveVoyageKey = (id, key, value) => set(ref(db, `voyages/${id}/${key}`), value);
  return { voyages, loaded, createVoyage, deleteVoyage, saveVoyageKey };
}

// ─── INLINE EDIT FORM (compact, replaces the tile) ───────────────────────────
function InlineEditForm({ stop, onSave, onCancel }) {
  const [form, setForm] = useState({ ...stop });
  return (
    <div className="inline-edit-form">
      <div className="cat-picker cat-picker-small">
        {STOP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={"cat-btn" + (form.categorie === cat.id ? " cat-btn-active" : "")}
            style={form.categorie === cat.id ? { borderColor: cat.color, background: cat.color + "18" } : {}}
            onClick={() => setForm({ ...form, categorie: cat.id })}
            type="button"
          >
            <span className="cat-btn-emoji">{cat.emoji}</span>
            <span className="cat-btn-label">{cat.label}</span>
          </button>
        ))}
      </div>
      <input className="inp" placeholder="Description" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
      <input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      <input className="inp" placeholder="Note" value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      <div className="inline-edit-actions">
        <button className="btn-cancel-small" onClick={onCancel}>Annuler</button>
        <button className="btn-save-small" onClick={() => { if (form.ville.trim()) onSave(form); }}>Enregistrer</button>
      </div>
    </div>
  );
}

// ─── STOP FORM (add new) ─────────────────────────────────────────────────────
function StopForm({ initial, onSave, onCancel, title }) {
  const [form, setForm] = useState(initial || { ville: "", date: "", note: "", categorie: "avion" });
  return (
    <div className="form-card">
      <div className="form-header">
        <span>{title}</span>
        <button className="btn-close" onClick={onCancel}>✕</button>
      </div>
      <div className="form-body">
        <div className="input-group">
          <label className="input-label">Categorie</label>
          <div className="cat-picker">
            {STOP_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={"cat-btn" + (form.categorie === cat.id ? " cat-btn-active" : "")}
                style={form.categorie === cat.id ? { borderColor: cat.color, background: cat.color + "18" } : {}}
                onClick={() => setForm({ ...form, categorie: cat.id })}
                type="button"
              >
                <span className="cat-btn-emoji">{cat.emoji}</span>
                <span className="cat-btn-label">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Description</label>
          <input className="inp" placeholder="Ex: Vol Paris-Rome, Musee du Louvre..." value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
        </div>
        <div className="input-group">
          <label className="input-label">Date</label>
          <input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div className="input-group">
          <label className="input-label">Note</label>
          <input className="inp" placeholder="Details, confirmation, adresse..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={() => { if (form.ville.trim()) onSave(form); }}>Enregistrer</button>
      </div>
    </div>
  );
}

function sortStops(stops) {
  return [...stops].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });
}

// ─── STOP CARD INNER ─────────────────────────────────────────────────────────
function StopCardInner({ stop, canDrag, handleProps, isOverlay, onEdit, onRemove }) {
  const cat = getCat(stop.categorie);
  return (
    <div className="planning-stop-inner" style={{ borderLeftColor: cat.color, boxShadow: isOverlay ? "0 12px 32px rgba(0,0,0,0.18)" : undefined }}>
      <div className="planning-stop-top">
        <div className="stop-cat-badge" style={{ background: cat.color + "18", color: cat.color }}>{cat.emoji}</div>
        <div className="stop-main">
          <span className="planning-stop-city">{stop.ville}</span>
          {stop.note && <p className="stop-note">{stop.note}</p>}
        </div>
        <div className="stop-right">
          {canDrag && <span className="drag-handle" title="Deplacer" {...handleProps}>⠿</span>}
          {!isOverlay && (
            <div className="stop-actions">
              <button className="btn-icon" onClick={onEdit}>✏️</button>
              <button className="btn-icon" onClick={onRemove}>🗑️</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SORTABLE STOP — shows inline edit form when editing ─────────────────────
function SortableStop({ stop, canDrag, editingId, onStartEdit, onSaveEdit, onCancelEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop._id });
  const isEditing = editingId === stop._id;

  return (
    <div
      ref={setNodeRef}
      className="planning-stop"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.25 : 1 }}
    >
      {isEditing ? (
        <InlineEditForm
          stop={stop}
          onSave={(form) => onSaveEdit(stop._id, form)}
          onCancel={onCancelEdit}
        />
      ) : (
        <StopCardInner
          stop={stop}
          canDrag={canDrag}
          handleProps={{ ...attributes, ...listeners }}
          isOverlay={false}
          onEdit={() => onStartEdit(stop._id)}
          onRemove={() => onRemove(stop._id)}
        />
      )}
    </div>
  );
}

// ─── PLANNING ─────────────────────────────────────────────────────────────────
function Planning({ stops: rawStops, save }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [editingId, setEditingId] = useState(null); // _id of stop being edited inline
  const [activeStop, setActiveStop] = useState(null);
  const [stops, setStops] = useState(() => ensureStopIds(rawStops).stops);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isDragging) return;
    const { stops: s, changed } = ensureStopIds(rawStops);
    setStops(s);
    if (changed) save("stops", s);
  }, [rawStops, isDragging]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const addStop = (form) => {
    const newStop = { ...form, _id: "s_" + Math.random().toString(36).slice(2, 9) };
    const updated = sortStops([...stops, newStop]);
    setStops(updated);
    save("stops", updated);
    setShowAdd(false);
    setAddDate("");
  };

  const saveEdit = (id, form) => {
    const updated = sortStops(stops.map((s) => s._id === id ? { ...form, _id: s._id } : s));
    setStops(updated);
    save("stops", updated);
    setEditingId(null);
  };

  const removeStop = (id) => {
    const updated = stops.filter((s) => s._id !== id);
    setStops(updated);
    save("stops", updated);
  };

  const withDate = stops.filter((s) => s.date);
  const withoutDate = stops.filter((s) => !s.date);
  const grouped = withDate.reduce((acc, stop) => {
    if (!acc[stop.date]) acc[stop.date] = [];
    acc[stop.date].push(stop);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  const handleDragStart = ({ active }) => {
    setIsDragging(true);
    setEditingId(null); // close any open edit
    setActiveStop(stops.find((s) => s._id === active.id) || null);
  };

  const handleDragEnd = (dateStr, { active, over }) => {
    setActiveStop(null);
    setIsDragging(false);
    if (!over || active.id === over.id) return;
    const dayStops = grouped[dateStr];
    const oldIndex = dayStops.findIndex((s) => s._id === active.id);
    const newIndex = dayStops.findIndex((s) => s._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(dayStops, oldIndex, newIndex);
    const otherStops = stops.filter((s) => s.date !== dateStr);
    const newStops = sortStops([...otherStops, ...reordered]);
    setStops(newStops);
    save("stops", newStops);
  };

  const formatDayHeader = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
    const label = diff === 0 ? "Aujourd'hui" : diff === 1 ? "Demain" : diff === -1 ? "Hier" : null;
    return {
      day: d.toLocaleDateString("fr-FR", { weekday: "long" }),
      date: d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      label,
    };
  };

  return (
    <div className="section">
      {!showAdd && (
        <button className="btn-add-trip" onClick={() => setShowAdd(true)}>
          <span className="btn-add-icon">+</span> Ajouter une etape
        </button>
      )}
      {showAdd && (
        <StopForm
          title="Nouvelle etape"
          initial={{ ville: "", date: addDate, note: "", categorie: "avion" }}
          onSave={addStop}
          onCancel={() => { setShowAdd(false); setAddDate(""); }}
        />
      )}
      {stops.length === 0 && !showAdd && (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p className="empty-title">Aucune etape planifiee</p>
          <p className="empty-sub">Ajoutez des etapes avec des dates pour voir votre planning</p>
        </div>
      )}

      <div className="planning-timeline">
        {sortedDates.map((dateStr) => {
          const { day, date, label } = formatDayHeader(dateStr);
          const dayStops = grouped[dateStr];
          const canDrag = dayStops.length > 1;

          return (
            <div key={dateStr} className="planning-day">
              <div className="planning-day-header">
                <div className="planning-day-left">
                  <div className="planning-day-dot" />
                  <div className="planning-day-line" />
                </div>
                <div className="planning-day-info">
                  {label && <span className="planning-day-label">{label}</span>}
                  <span className="planning-day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                  <span className="planning-day-date">{date}</span>
                </div>
                <button className="btn-add-day" onClick={() => { setAddDate(dateStr); setShowAdd(true); setEditingId(null); }}>+</button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={(e) => handleDragEnd(dateStr, e)}
                onDragCancel={() => { setActiveStop(null); setIsDragging(false); }}
              >
                <SortableContext items={dayStops.map((s) => s._id)} strategy={verticalListSortingStrategy}>
                  <div className="planning-day-stops">
                    {dayStops.map((stop) => (
                      <SortableStop
                        key={stop._id}
                        stop={stop}
                        canDrag={canDrag}
                        editingId={editingId}
                        onStartEdit={(id) => setEditingId(id)}
                        onSaveEdit={saveEdit}
                        onCancelEdit={() => setEditingId(null)}
                        onRemove={removeStop}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {activeStop ? (
                    <div className="planning-stop" style={{ transform: "rotate(1.5deg)", cursor: "grabbing" }}>
                      <StopCardInner stop={activeStop} canDrag={false} handleProps={{}} isOverlay={true} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          );
        })}

        {withoutDate.length > 0 && (
          <div className="planning-day">
            <div className="planning-day-header">
              <div className="planning-day-left">
                <div className="planning-day-dot" style={{ background: "#DDDDDD" }} />
              </div>
              <div className="planning-day-info">
                <span className="planning-day-name" style={{ color: "#717171" }}>Sans date</span>
              </div>
            </div>
            <div className="planning-day-stops">
              {withoutDate.map((stop) => {
                const cat = getCat(stop.categorie);
                const isEditing = editingId === stop._id;
                return (
                  <div key={stop._id} className="planning-stop">
                    {isEditing ? (
                      <InlineEditForm
                        stop={stop}
                        onSave={(form) => saveEdit(stop._id, form)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="planning-stop-inner" style={{ borderLeftColor: "#DDDDDD" }}>
                        <div className="planning-stop-top">
                          <div className="stop-cat-badge" style={{ background: cat.color + "18", color: cat.color }}>{cat.emoji}</div>
                          <div className="stop-main">
                            <span className="planning-stop-city">{stop.ville}</span>
                            {stop.note && <p className="stop-note">{stop.note}</p>}
                          </div>
                          <div className="stop-right">
                            <div className="stop-actions">
                              <button className="btn-icon" onClick={() => setEditingId(stop._id)}>✏️</button>
                              <button className="btn-icon" onClick={() => removeStop(stop._id)}>🗑️</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BUDGET ───────────────────────────────────────────────────────────────────
function Budget({ budget, save }) {
  const [form, setForm] = useState({ label: "", montant: "", categorie: "Transport" });
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const categories = ["Transport", "Hebergement", "Resto", "Activites", "Autre"];
  const catEmoji = { Transport: "✈️", Hebergement: "🏠", Resto: "🍽️", Activites: "🎯", Autre: "📦" };
  const catColors = { Transport: "#FF5A5F", Hebergement: "#00A699", Resto: "#FC642D", Activites: "#484848", Autre: "#767676" };
  const items = budget.items || [];
  const total = items.reduce((s, i) => s + parseFloat(i.montant || 0), 0);
  const add = () => {
    if (!form.label.trim() || !form.montant) return;
    save("budget", { ...budget, items: [...items, form] });
    setForm({ label: "", montant: "", categorie: "Transport" });
    setShowForm(false);
  };
  const remove = (i) => save("budget", { ...budget, items: items.filter((_, idx) => idx !== i) });
  const byCategorie = categories.reduce((acc, cat) => { acc[cat] = items.filter((i) => i.categorie === cat); return acc; }, {});

  return (
    <div className="section">
      <div className="budget-hero" onClick={() => setShowDetail(!showDetail)} style={{ cursor: "pointer" }}>
        <p className="budget-hero-label">Total des depenses</p>
        <p className="budget-hero-amount">{total.toFixed(2)} €</p>
        <div className="budget-chips">
          {categories.filter((c) => byCategorie[c].length > 0).map((cat) => (
            <span key={cat} className="budget-chip">{catEmoji[cat]} {byCategorie[cat].reduce((s, i) => s + parseFloat(i.montant), 0).toFixed(0)}€</span>
          ))}
        </div>
        <p style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.75rem" }}>{showDetail ? "▲ Masquer le detail" : "▼ Voir le detail par categorie"}</p>
      </div>
      {showDetail && (
        <div className="detail-card">
          {categories.filter((c) => byCategorie[c].length > 0).map((cat) => {
            const catTotal = byCategorie[cat].reduce((s, i) => s + parseFloat(i.montant), 0);
            const pct = total > 0 ? (catTotal / total) * 100 : 0;
            return (
              <div key={cat} className="detail-row">
                <div className="detail-top">
                  <span className="detail-label">{catEmoji[cat]} {cat}</span>
                  <span className="detail-amount" style={{ color: catColors[cat] }}>{catTotal.toFixed(2)} €</span>
                </div>
                <div className="detail-bar"><div className="detail-bar-fill" style={{ width: `${pct}%`, background: catColors[cat] }} /></div>
                <span className="detail-pct">{Math.round(pct)}% du total</span>
              </div>
            );
          })}
        </div>
      )}
      {!showForm && <button className="btn-add-trip" onClick={() => setShowForm(true)}><span className="btn-add-icon">+</span> Ajouter une depense</button>}
      {showForm && (
        <div className="form-card">
          <div className="form-header"><span>Nouvelle depense</span><button className="btn-close" onClick={() => setShowForm(false)}>✕</button></div>
          <div className="form-body">
            <div className="input-group"><label className="input-label">Description</label><input className="inp" placeholder="Ex: Vol Paris-Rome" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div className="input-row">
              <div className="input-group" style={{ flex: 1 }}><label className="input-label">Montant (€)</label><input className="inp" type="number" placeholder="0.00" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></div>
              <div className="input-group" style={{ flex: 1 }}><label className="input-label">Categorie</label><select className="inp" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
            </div>
            <button className="btn-primary" onClick={add}>Ajouter</button>
          </div>
        </div>
      )}
      {items.length === 0 && !showForm && <div className="empty-state"><div className="empty-icon">💳</div><p className="empty-title">Suivez vos depenses</p><p className="empty-sub">Gardez un oeil sur votre budget de voyage</p></div>}
      {categories.map((cat) => byCategorie[cat].length > 0 ? (
        <div key={cat} className="budget-group">
          <div className="group-header" style={{ borderLeft: `3px solid ${catColors[cat]}` }}><span>{catEmoji[cat]} {cat}</span><span className="group-total">{byCategorie[cat].reduce((s, i) => s + parseFloat(i.montant), 0).toFixed(2)} €</span></div>
          {byCategorie[cat].map((item, gi) => {
            const realIdx = items.findIndex((x) => x === item);
            return (
              <div key={gi} className="budget-item">
                <span className="item-label">{item.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className="item-amount">{parseFloat(item.montant).toFixed(2)} €</span>
                  <button className="btn-icon small" onClick={() => remove(realIdx)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null)}
    </div>
  );
}

// ─── TODO ─────────────────────────────────────────────────────────────────────
function TodoList({ todos, save }) {
  const [input, setInput] = useState("");
  const done = todos.filter((t) => t.done).length;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
  const add = () => { if (!input.trim()) return; save("todos", [...todos, { text: input, done: false }]); setInput(""); };
  const toggle = (i) => save("todos", todos.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)));
  const remove = (i) => save("todos", todos.filter((_, idx) => idx !== i));
  return (
    <div className="section">
      {todos.length > 0 && (
        <div className="progress-card">
          <div className="progress-top"><span className="progress-label">{done} sur {todos.length} tache{todos.length > 1 ? "s" : ""}</span><span className="progress-pct">{pct}%</span></div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      <div className="todo-input-row">
        <input className="inp todo-inp" placeholder="Ajouter une tache..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn-primary btn-add-inline" onClick={add}>Ajouter</button>
      </div>
      {todos.length === 0 && <div className="empty-state"><div className="empty-icon">📋</div><p className="empty-title">Votre liste de taches</p><p className="empty-sub">Passeport, visas, reservations... tout ici !</p></div>}
      <div className="todo-list">
        {todos.filter((t) => !t.done).map((t) => {
          const ri = todos.findIndex((x) => x === t);
          return (<div key={ri} className="todo-item"><button className="todo-check" onClick={() => toggle(ri)} /><span className="todo-text">{t.text}</span><button className="btn-icon small" onClick={() => remove(ri)}>🗑️</button></div>);
        })}
        {todos.filter((t) => t.done).length > 0 && (<>
          <p className="done-separator">Terminees</p>
          {todos.filter((t) => t.done).map((t) => {
            const ri = todos.findIndex((x) => x === t);
            return (<div key={ri} className="todo-item done"><button className="todo-check checked" onClick={() => toggle(ri)}>✓</button><span className="todo-text">{t.text}</span><button className="btn-icon small" onClick={() => remove(ri)}>🗑️</button></div>);
          })}
        </>)}
      </div>
    </div>
  );
}

// ─── VOYAGE DETAIL ────────────────────────────────────────────────────────────
function VoyageDetail({ voyageId, voyage, saveKey, onBack }) {
  const [tab, setTab] = useState(0);
  const meta = voyage.meta || {};
  const stops = voyage.stops || [];
  const budget = voyage.budget || { items: [] };
  const todos = voyage.todos || [];
  const save = (key, val) => saveKey(voyageId, key, val);
  return (
    <>
      <div className="header">
        <button className="btn-back" onClick={onBack}>← Tous les voyages</button>
        <div className="header-eyebrow">{meta.destination || "Destination"}</div>
        <h1 className="header-title">{meta.name || "Mon Voyage"}</h1>
        {meta.dates && <p className="header-dates">📅 {meta.dates}</p>}
        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={i} className={"tab" + (tab === i ? " active" : "")} onClick={() => setTab(i)}>{TAB_ICONS[i]} {t}</button>
          ))}
        </div>
      </div>
      {tab === 0 && <Planning stops={stops} save={save} />}
      {tab === 1 && <Budget budget={budget} save={save} />}
      {tab === 2 && <TodoList todos={todos} save={save} />}
    </>
  );
}

// ─── VOYAGE LIST ──────────────────────────────────────────────────────────────
function VoyageList({ voyages, onCreate, onSelect, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", destination: "", dates: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const submit = () => {
    if (!form.name.trim()) return;
    const id = onCreate(form.name, form.destination, form.dates);
    setForm({ name: "", destination: "", dates: "" });
    setShowForm(false);
    onSelect(id);
  };
  const list = Object.entries(voyages).sort((a, b) => (b[1].meta?.createdAt || 0) - (a[1].meta?.createdAt || 0));
  return (
    <>
      <div className="home-header">
        <p className="home-eyebrow">Planificateur collaboratif</p>
        <h1 className="home-title">Mes Voyages ✈️</h1>
      </div>
      <div className="section">
        {!showForm && <button className="btn-new-voyage" onClick={() => setShowForm(true)}><span className="btn-new-icon">+</span> Nouveau voyage</button>}
        {showForm && (
          <div className="form-card">
            <div className="form-header"><span>Nouveau voyage</span><button className="btn-close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="form-body">
              <div className="input-group"><label className="input-label">Nom du voyage</label><input className="inp" placeholder="Ex: Road trip Espagne" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Destination</label><input className="inp" placeholder="Ex: Barcelone, Madrid..." value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Dates</label><input className="inp" placeholder="Ex: 15 juin - 30 juin 2025" value={form.dates} onChange={(e) => setForm({ ...form, dates: e.target.value })} /></div>
              <button className="btn-primary" onClick={submit}>Creer le voyage</button>
            </div>
          </div>
        )}
        {list.length === 0 && !showForm && (
          <div className="empty-state" style={{ paddingTop: "4rem" }}>
            <div className="empty-icon">🌍</div>
            <p className="empty-title">Aucun voyage pour l'instant</p>
            <p className="empty-sub">Creez votre premier voyage pour commencer a planifier !</p>
          </div>
        )}
        <div className="voyage-list">
          {list.map(([id, voyage]) => {
            const meta = voyage.meta || {};
            const stops = voyage.stops || [];
            const todos = voyage.todos || [];
            const budget = voyage.budget || { items: [] };
            const total = (budget.items || []).reduce((s, i) => s + parseFloat(i.montant || 0), 0);
            const doneTodos = todos.filter((t) => t.done).length;
            return (
              <div key={id} className="voyage-card" onClick={() => onSelect(id)}>
                <div className="voyage-card-top">
                  <div>
                    <p className="voyage-destination">{meta.destination || "Destination"}</p>
                    <h2 className="voyage-name">{meta.name}</h2>
                    {meta.dates && <p className="voyage-dates">📅 {meta.dates}</p>}
                  </div>
                  <button className="btn-delete-voyage" onClick={(e) => { e.stopPropagation(); setConfirmDelete(id); }}>🗑️</button>
                </div>
                <div className="voyage-stats">
                  <span className="voyage-stat">🗺️ {stops.length} etape{stops.length > 1 ? "s" : ""}</span>
                  <span className="voyage-stat">💰 {total.toFixed(0)} €</span>
                  <span className="voyage-stat">✅ {doneTodos}/{todos.length} taches</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">Supprimer ce voyage ?</p>
            <p className="modal-sub">Cette action est irreversible.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { voyages, loaded, createVoyage, deleteVoyage, saveVoyageKey } = useVoyages();
  const [selectedId, setSelectedId] = useState(null);
  if (!loaded) return <div className="loading"><div className="spinner" /><span>Chargement...</span></div>;
  const selectedVoyage = selectedId ? voyages[selectedId] : null;
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F7F7; color: #222; font-family: 'Plus Jakarta Sans', sans-serif; min-height: 100vh; }
        .app { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #fff; box-shadow: 0 0 40px rgba(0,0,0,0.08); padding-bottom: 100px; }
        .home-header { padding: 3rem 1.5rem 1.5rem; background: linear-gradient(135deg, #FF5A5F, #FC642D); color: #fff; }
        .home-eyebrow { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.85; margin-bottom: 0.3rem; }
        .home-title { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.03em; }
        .btn-new-voyage { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; border: 2px dashed #FF5A5F; border-radius: 14px; background: rgba(255,90,95,0.03); color: #FF5A5F; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; margin-bottom: 1.5rem; }
        .btn-new-voyage:hover { background: rgba(255,90,95,0.08); }
        .btn-new-icon { font-size: 1.3rem; }
        .voyage-list { display: flex; flex-direction: column; gap: 0.85rem; }
        .voyage-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; padding: 1.25rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .voyage-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); transform: translateY(-1px); }
        .voyage-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem; }
        .voyage-destination { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #FF5A5F; margin-bottom: 0.2rem; }
        .voyage-name { font-size: 1.1rem; font-weight: 700; color: #222; margin-bottom: 0.25rem; }
        .voyage-dates { font-size: 0.78rem; color: #717171; }
        .btn-delete-voyage { background: #F7F7F7; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s; }
        .btn-delete-voyage:hover { background: #FFE8E8; }
        .voyage-stats { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .voyage-stat { font-size: 0.78rem; color: #484848; background: #F7F7F7; padding: 0.3rem 0.7rem; border-radius: 20px; font-weight: 500; }
        .header { padding: 2rem 1.5rem 0; background: #fff; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #EBEBEB; }
        .btn-back { background: none; border: none; color: #FF5A5F; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 0.75rem; display: block; }
        .header-eyebrow { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #FF5A5F; margin-bottom: 0.2rem; }
        .header-title { font-size: 1.5rem; font-weight: 700; color: #222; letter-spacing: -0.03em; margin-bottom: 0.2rem; }
        .header-dates { font-size: 0.78rem; color: #717171; margin-bottom: 0.85rem; }
        .tabs { display: flex; margin: 0 -1.5rem; padding: 0 1.5rem; overflow-x: auto; scrollbar-width: none; }
        .tabs::-webkit-scrollbar { display: none; }
        .tab { flex-shrink: 0; padding: 0.75rem; border: none; background: transparent; color: #717171; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.78rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; display: flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
        .tab.active { color: #222; border-bottom: 2px solid #FF5A5F; }
        .section { padding: 1.5rem; }
        .form-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; margin-bottom: 1.25rem; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .form-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #EBEBEB; font-weight: 600; font-size: 0.9rem; color: #222; }
        .btn-close { background: #F7F7F7; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 0.75rem; color: #717171; display: flex; align-items: center; justify-content: center; }
        .form-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
        .input-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .input-row { display: flex; gap: 0.75rem; }
        .input-label { font-size: 0.75rem; font-weight: 600; color: #717171; text-transform: uppercase; letter-spacing: 0.06em; }
        .inp { width: 100%; background: #F7F7F7; border: 1px solid #EBEBEB; border-radius: 10px; padding: 0.75rem 1rem; color: #222; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.9rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .inp:focus { border-color: #FF5A5F; box-shadow: 0 0 0 3px rgba(255,90,95,0.1); background: #fff; }
        .inp option { background: #fff; }
        .btn-primary { background: #FF5A5F; color: #fff; border: none; border-radius: 10px; padding: 0.85rem 1.5rem; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; width: 100%; }
        .btn-primary:hover { background: #e0484d; }
        .btn-add-trip { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem; border: 1.5px dashed #DDDDDD; border-radius: 12px; background: transparent; color: #717171; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.2s; margin-bottom: 1.25rem; }
        .btn-add-trip:hover { border-color: #FF5A5F; color: #FF5A5F; }
        .btn-add-icon { font-size: 1.1rem; }
        .btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.3rem; border-radius: 6px; opacity: 0.6; transition: all 0.15s; }
        .btn-icon:hover { background: #F7F7F7; opacity: 1; }
        .btn-icon.small { font-size: 0.8rem; }
        .empty-state { text-align: center; padding: 3rem 1rem; }
        .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
        .empty-title { font-weight: 600; font-size: 1rem; color: #222; margin-bottom: 0.35rem; }
        .empty-sub { font-size: 0.85rem; color: #717171; }
        .cat-picker { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
        .cat-picker-small { gap: 0.35rem; margin-bottom: 0.25rem; }
        .cat-btn { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.6rem 0.4rem; border: 1.5px solid #EBEBEB; border-radius: 10px; background: #F7F7F7; cursor: pointer; transition: all 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; }
        .cat-btn:hover { border-color: #CCCCCC; background: #F0F0F0; }
        .cat-btn-active { background: #fff; }
        .cat-btn-emoji { font-size: 1.4rem; line-height: 1; }
        .cat-btn-label { font-size: 0.68rem; font-weight: 600; color: #484848; }
        /* Inline edit form */
        .inline-edit-form { background: #fff; border: 1.5px solid #FF5A5F; border-radius: 12px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem; box-shadow: 0 4px 16px rgba(255,90,95,0.12); }
        .inline-edit-actions { display: flex; gap: 0.5rem; margin-top: 0.15rem; }
        .btn-cancel-small { flex: 1; padding: 0.6rem; border: 1px solid #EBEBEB; border-radius: 8px; background: #F7F7F7; color: #717171; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; }
        .btn-save-small { flex: 2; padding: 0.6rem; border: none; border-radius: 8px; background: #FF5A5F; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; }
        .btn-save-small:hover { background: #e0484d; }
        /* Planning */
        .planning-timeline { display: flex; flex-direction: column; }
        .planning-day { margin-bottom: 1.5rem; }
        .planning-day-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
        .planning-day-left { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 14px; padding-top: 4px; }
        .planning-day-dot { width: 14px; height: 14px; border-radius: 50%; background: #FF5A5F; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(255,90,95,0.15); }
        .planning-day-line { width: 2px; flex: 1; background: #EBEBEB; min-height: 12px; margin-top: 4px; }
        .planning-day-info { flex: 1; }
        .planning-day-label { display: inline-block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #fff; background: #FF5A5F; padding: 2px 8px; border-radius: 20px; margin-bottom: 0.25rem; }
        .planning-day-name { display: block; font-size: 0.95rem; font-weight: 700; color: #222; }
        .planning-day-date { display: block; font-size: 0.78rem; color: #717171; margin-top: 0.1rem; }
        .btn-add-day { background: #F7F7F7; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 1rem; color: #FF5A5F; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; transition: background 0.15s; margin-top: 2px; }
        .btn-add-day:hover { background: #FFE8E8; }
        .planning-day-stops { padding-left: 1.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .planning-stop { touch-action: manipulation; }
        .planning-stop-inner { background: #fff; border: 1px solid #EBEBEB; border-left: 3px solid #FF5A5F; border-radius: 10px; padding: 0.75rem 0.85rem; }
        .planning-stop-top { display: flex; align-items: flex-start; gap: 0.65rem; }
        .stop-cat-badge { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
        .stop-main { flex: 1; min-width: 0; }
        .planning-stop-city { font-weight: 700; font-size: 0.92rem; color: #222; display: block; }
        .stop-note { font-size: 0.8rem; color: #717171; line-height: 1.4; margin-top: 0.2rem; }
        .stop-right { display: flex; align-items: center; gap: 0.1rem; flex-shrink: 0; }
        .stop-actions { display: flex; gap: 0.1rem; }
        .drag-handle { font-size: 1.3rem; color: #CCCCCC; cursor: grab; padding: 0.2rem 0.3rem; border-radius: 6px; line-height: 1; touch-action: none; user-select: none; }
        .drag-handle:hover { color: #999; background: #F7F7F7; }
        .drag-handle:active { cursor: grabbing; color: #FF5A5F; }
        .budget-hero { background: linear-gradient(135deg, #FF5A5F, #FC642D); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.25rem; color: #fff; }
        .budget-hero-label { font-size: 0.8rem; opacity: 0.85; font-weight: 500; margin-bottom: 0.3rem; }
        .budget-hero-amount { font-size: 2.2rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.75rem; }
        .budget-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .budget-chip { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 20px; background: rgba(255,255,255,0.2); color: #fff; }
        .detail-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
        .detail-row { display: flex; flex-direction: column; gap: 0.35rem; }
        .detail-top { display: flex; justify-content: space-between; }
        .detail-label { font-size: 0.88rem; font-weight: 600; color: #222; }
        .detail-amount { font-size: 0.88rem; font-weight: 700; }
        .detail-bar { height: 6px; background: #F7F7F7; border-radius: 99px; overflow: hidden; }
        .detail-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s; }
        .detail-pct { font-size: 0.72rem; color: #717171; }
        .budget-group { background: #fff; border: 1px solid #EBEBEB; border-radius: 12px; margin-bottom: 0.75rem; overflow: hidden; }
        .group-header { display: flex; justify-content: space-between; padding: 0.75rem 1rem 0.75rem 0.85rem; background: #F7F7F7; font-size: 0.82rem; font-weight: 700; color: #222; }
        .group-total { color: #484848; }
        .budget-item { display: flex; justify-content: space-between; align-items: center; padding: 0.7rem 1rem; border-top: 1px solid #F7F7F7; font-size: 0.88rem; }
        .item-label { color: #484848; }
        .item-amount { font-weight: 600; color: #222; }
        .progress-card { background: #F7F7F7; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
        .progress-top { display: flex; justify-content: space-between; margin-bottom: 0.6rem; }
        .progress-label { font-size: 0.83rem; color: #484848; font-weight: 500; }
        .progress-pct { font-size: 0.83rem; font-weight: 700; color: #FF5A5F; }
        .progress-bar { height: 5px; background: #DDDDDD; border-radius: 99px; overflow: hidden; }
        .progress-fill { height: 100%; background: #FF5A5F; border-radius: 99px; transition: width 0.4s; }
        .todo-input-row { display: flex; gap: 0.6rem; margin-bottom: 1.25rem; }
        .todo-inp { flex: 1; }
        .btn-add-inline { width: auto; white-space: nowrap; padding: 0.75rem 1.25rem; }
        .done-separator { font-size: 0.75rem; font-weight: 700; color: #717171; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.75rem 0 0.5rem; }
        .todo-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .todo-item { display: flex; align-items: center; gap: 0.75rem; background: #fff; border: 1px solid #EBEBEB; border-radius: 10px; padding: 0.85rem 1rem; }
        .todo-item.done { opacity: 0.5; }
        .todo-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #DDDDDD; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.7rem; color: #fff; transition: all 0.15s; }
        .todo-check.checked { background: #FF5A5F; border-color: #FF5A5F; }
        .todo-check:hover { border-color: #FF5A5F; }
        .todo-text { flex: 1; font-size: 0.9rem; color: #222; }
        .todo-item.done .todo-text { text-decoration: line-through; color: #717171; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1.5rem; }
        .modal { background: #fff; border-radius: 20px; padding: 1.75rem; width: 100%; max-width: 320px; }
        .modal-title { font-size: 1.1rem; font-weight: 700; color: #222; margin-bottom: 0.5rem; }
        .modal-sub { font-size: 0.85rem; color: #717171; margin-bottom: 1.5rem; }
        .modal-actions { display: flex; gap: 0.75rem; }
        .btn-cancel { flex: 1; padding: 0.75rem; border: 1px solid #EBEBEB; border-radius: 10px; background: #fff; color: #222; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
        .btn-danger { flex: 1; padding: 0.75rem; border: none; border-radius: 10px; background: #FF5A5F; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
        .loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 1rem; color: #717171; font-size: 0.9rem; background: #fff; }
        .spinner { width: 28px; height: 28px; border: 2px solid #EBEBEB; border-top-color: #FF5A5F; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="app">
        {selectedVoyage ? (
          <VoyageDetail voyageId={selectedId} voyage={selectedVoyage} saveKey={saveVoyageKey} onBack={() => setSelectedId(null)} />
        ) : (
          <VoyageList voyages={voyages} onCreate={createVoyage} onSelect={setSelectedId} onDelete={deleteVoyage} />
        )}
      </div>
    </>
  );
}
