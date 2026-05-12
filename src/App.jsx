import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, remove as fbRemove } from "firebase/database";
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
const TAB_ICONS = [" ", " ", " "];
const defaultVoyageData = { stops: [], budget: { items: [] }, todos: [] };
// ─── STOP CATEGORIES ──────────────────────────────────────────────────────────
const STOP_CATEGORIES = [
{ id: "avion", label: "Avion", emoji: " ", color: "#5B8DEF" },
{ id: "train", label: "Train", emoji: " ", color: "#F5A623" },
{ id: "bus", label: "Bus", emoji: " ", color: "#7ED321" },
{ id: "voiture", label: "Voiture", emoji: " ", color: "#9B59B6" },
{ id: "activite", label: "Activité", emoji: " ", color: "#E74C3C" },
{ id: "restaurant",label: "Restaurant", emoji: " ", color: "#E67E22" },
];
const getCat = (id) => STOP_CATEGORIES.find(c => c.id === id) || STOP_CATEGORIES[0];
function useVoyages() {
const [voyages, setVoyages] = useState({});
const [loaded, setLoaded] = useState(false);
useEffect(() => {
const r = ref(db, "voyages");
const unsub = onValue(r, (snap) => {
setVoyages(snap.val() || {});
setLoaded(true);
});
return () => unsub();
}, []);
const createVoyage = (name, destination, dates) => {
const id = "voyage_" + Date.now();
set(ref(db, `voyages/${id}`), { meta: { name, destination, dates, createdAt: Date.now() }, return id;
};
const deleteVoyage = (id) => fbRemove(ref(db, `voyages/${id}`));
const saveVoyageKey = (id, key, value) => set(ref(db, `voyages/${id}/${key}`), value);
return { voyages, loaded, createVoyage, deleteVoyage, saveVoyageKey };
}
// ─── STOP FORM ────────────────────────────────────────────────────────────────
function StopForm({ initial, onSave, onCancel, title }) {
const [form, setForm] = useState(initial || { ville: "", date: "", note: "", categorie: "avion" return (
<div className="form-card">
<div className="form-header">
<span>{title}</span>
<button className="btn-close" onClick={onCancel}>✕</button>
</div>
<div className="form-body">
<div className="input-group">
<label className="input-label">Catégorie</label>
<div className="cat-picker">
{STOP_CATEGORIES.map(cat => (
<button
key={cat.id}
className={`cat-btn${form.categorie === cat.id ? " cat-btn-active" : ""}`}
style={form.categorie === cat.id ? { borderColor: cat.color, background: cat.onClick={() => setForm({ ...form, categorie: cat.id })}
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
<input className="inp" placeholder="Ex: Vol Paris→Rome, Musée du Louvre…" value={form.</div>
<div className="input-group">
<label className="input-label">Date</label>
<input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...</div>
<div className="input-group">
<label className="input-label">Note</label>
<input className="inp" placeholder="Détails, confirmation, adresse…" value={form.note} </div>
<button className="btn-primary" onClick={() => { if (form.ville.trim()) onSave(form); </div>
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
// ─── PLANNING ─────────────────────────────────────────────────────────────────
function Planning({ stops, save }) {
const [editIdx, setEditIdx] = useState(null);
const [showAdd, setShowAdd] = useState(false);
const [addDate, setAddDate] = useState("");
const [draggingKey, setDraggingKey] = useState(null);
const dragItem = useRef(null);
const dragOver = useRef(null);
// True only when the touch started on the drag handle
const touchOnHandle = useRef(false);
const timelineRef = useRef(null);
const addStop = (form) => {
const updated = sortStops([...stops, form]);
save("stops", updated);
setShowAdd(false);
setAddDate("");
};
const editStop = (form) => {
const updated = sortStops(stops.map((s, i) => (i === editIdx ? form : s)));
save("stops", updated);
setEditIdx(null);
};
const remove = (i) => save("stops", stops.filter((_, idx) => idx !== i));
const withDate = stops.map((s, i) => ({ ...s, originalIdx: i })).filter(s => s.date);
const withoutDate = stops.map((s, i) => ({ ...s, originalIdx: i })).filter(s => !s.date);
const grouped = withDate.reduce((acc, stop) => {
const key = stop.date;
if (!acc[key]) acc[key] = [];
acc[key].push(stop);
return acc;
}, {});
const groupedRef = useRef(grouped);
groupedRef.current = grouped;
const stopsRef = useRef(stops);
stopsRef.current = stops;
const sortedDates = Object.keys(grouped).sort();
const formatDayHeader = (dateStr) => {
const d = new Date(dateStr);
const today = new Date();
today.setHours(0, 0, 0, 0);
const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
const label = diff === 0 ? "Aujourd'hui" : diff === 1 ? "Demain" : diff === -1 ? "Hier" : return {
day: d.toLocaleDateString("fr-FR", { weekday: "long" }),
date: d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
label,
};
};
const resetDrag = () => {
dragItem.current = null;
dragOver.current = null;
touchOnHandle.current = false;
setDraggingKey(null);
};
const applyDrop = () => {
if (!dragItem.current || !dragOver.current) { resetDrag(); return; }
const { dateStr, localIdx: from } = dragItem.current;
const { dateStr: overDate, localIdx: to } = dragOver.current;
if (dateStr !== overDate || from === to) { resetDrag(); return; }
const dayStops = [...groupedRef.current[dateStr]];
const [moved] = dayStops.splice(from, 1);
dayStops.splice(to, 0, moved);
const originalIndices = groupedRef.current[dateStr].map(s => s.originalIdx);
const newStops = [...stopsRef.current];
dayStops.forEach((stop, i) => {
newStops[originalIndices[i]] = { ville: stop.ville, date: stop.date, note: stop.note, categorie: });
save("stops", newStops);
resetDrag();
};
// Touch starts on the handle: begin drag
const handleHandleTouchStart = (e, dateStr, localIdx) => {
touchOnHandle.current = true;
dragItem.current = { dateStr, localIdx };
setDraggingKey(`${dateStr}-${localIdx}`);
};
// Non-passive touchmove: only active when drag started from handle
useEffect(() => {
const el = timelineRef.current;
if (!el) return;
const onTouchMove = (e) => {
if (!touchOnHandle.current || !dragItem.current) return;
e.preventDefault(); // block scroll only during a handle-initiated drag
const touch = e.touches[0];
const target = document.elementFromPoint(touch.clientX, touch.clientY);
if (target) {
const stopEl = target.closest("[data-drag-idx]");
if (stopEl) {
dragOver.current = {
dateStr: stopEl.getAttribute("data-drag-date"),
localIdx: parseInt(stopEl.getAttribute("data-drag-idx")),
};
}
}
};
el.addEventListener("touchmove", onTouchMove, { passive: false });
return () => el.removeEventListener("touchmove", onTouchMove);
}, []);
return (
<div className="section">
{!showAdd && editIdx === null && (
<button className="btn-add-trip" onClick={() => setShowAdd(true)}>
<span className="btn-add-icon">+</span> Ajouter une étape
</button>
)}
{showAdd && (
<StopForm
title="Nouvelle étape"
initial={{ ville: "", date: addDate, note: "", categorie: "avion" }}
onSave={addStop}
onCancel={() => { setShowAdd(false); setAddDate(""); }}
/>
)}
{editIdx !== null && (
<StopForm
title="Modifier l'étape"
initial={stops[editIdx]}
onSave={editStop}
onCancel={() => setEditIdx(null)}
/>
)}
{stops.length === 0 && !showAdd && (
<div className="empty-state">
<div className="empty-icon"> </div>
<p className="empty-title">Aucune étape planifiée</p>
<p className="empty-sub">Ajoutez des étapes avec des dates pour voir votre planning</</div>
)}
<div className="planning-timeline" ref={timelineRef}>
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
<span className="planning-day-name">{day.charAt(0).toUpperCase() + day.slice(<span className="planning-day-date">{date}</span>
</div>
<button
className="btn-add-day"
onClick={() => { setAddDate(dateStr); setShowAdd(true); setEditIdx(null); }}
title="Ajouter une étape ce jour"
>+</button>
</div>
<div
className="planning-day-stops"
onDragOver={(e) => e.preventDefault()}
onDrop={applyDrop}
onTouchEnd={applyDrop}
>
{dayStops.map((stop, si) => {
const key = `${dateStr}-${si}`;
const isDragging = draggingKey === key;
const isOver = dragOver.current?.dateStr === dateStr && dragOver.current?.localIdx const cat = getCat(stop.categorie);
return (
<div
key={si}
className={`planning-stop${isDragging ? " dragging" : ""}${isOver ? " drag-data-drag-idx={si}
data-drag-date={dateStr}
// Desktop: drag only fires if it started on the handle (draggable=false >
<div className="planning-stop-inner" style={{ borderLeftColor: cat.color <div className="planning-stop-top">
{/* Category badge */}
<div className="stop-cat-badge" style={{ background: cat.color + "18", <span>{cat.emoji}</span>
</div>
<div className="stop-main">
<span className="planning-stop-city">{stop.ville}</span>
{stop.note && <p className="stop-note">{stop.note}</p>}
</div>
<div className="stop-right">
{canDrag && (
<span
className="drag-handle"
title="Déplacer"
// Desktop: make only the handle trigger drag
draggable
onDragStart={(e) => {
e.stopPropagation();
dragItem.current = { dateStr, localIdx: si };
setDraggingKey(key);
// Store on the event so the parent div knows it's a handle e.dataTransfer.effectAllowed = "move";
}}
onDragEnd={applyDrop}
// Mobile: only handle initiates drag
onTouchStart={(e) => handleHandleTouchStart(e, dateStr, si)}
>⠿</span>
)}
<div className="stop-actions">
<button className="btn-icon" onClick={() => { setEditIdx(stop.originalIdx); <button className="btn-icon" onClick={() => remove(stop.originalIdx)}> </div>
</div>
</div>
</div>
</div>
);
})}
</div>
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
{withoutDate.map((stop, si) => {
const cat = getCat(stop.categorie);
return (
<div key={si} className="planning-stop">
<div className="planning-stop-inner" style={{ borderLeftColor: "#DDDDDD" <div className="planning-stop-top">
<div className="stop-cat-badge" style={{ background: cat.color + "18", <span>{cat.emoji}</span>
</div>
<div className="stop-main">
<span className="planning-stop-city">{stop.ville}</span>
{stop.note && <p className="stop-note">{stop.note}</p>}
</div>
<div className="stop-right">
<div className="stop-actions">
<button className="btn-icon" onClick={() => { setEditIdx(stop.originalIdx); <button className="btn-icon" onClick={() => remove(stop.originalIdx)}> </div>
</div>
</div>
</div>
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
const categories = ["Transport", "Hébergement", "Resto", "Activités", "Autre"];
const catEmoji = { Transport: " ", Hébergement: " ", Resto: " ", Activités: " ", Autre: const catColors = { Transport: "#FF5A5F", Hébergement: "#00A699", Resto: "#FC642D", Activités: const items = budget.items || [];
const total = items.reduce((s, i) => s + parseFloat(i.montant || 0), 0);
const add = () => {
if (!form.label.trim() || !form.montant) return;
save("budget", { ...budget, items: [...items, form] });
setForm({ label: "", montant: "", categorie: "Transport" });
setShowForm(false);
};
const remove = (i) => save("budget", { ...budget, items: items.filter((_, idx) => idx !== i) const byCategorie = categories.reduce((acc, cat) => { acc[cat] = items.filter((i) => i.categorie return (
<div className="section">
<div className="budget-hero" onClick={() => setShowDetail(!showDetail)} style={{ cursor: <p className="budget-hero-label">Total des dépenses</p>
<p className="budget-hero-amount">{total.toFixed(2)} €</p>
<div className="budget-chips">
{categories.filter(c => byCategorie[c].length > 0).map(cat => (
<span key={cat} className="budget-chip">{catEmoji[cat]} {byCategorie[cat].reduce(())}
</div>
<p style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.75rem" }}>{showDetail ? </div>
{showDetail && (
<div className="detail-card">
{categories.filter(c => byCategorie[c].length > 0).map(cat => {
const catTotal = byCategorie[cat].reduce((s, i) => s + parseFloat(i.montant), 0);
const pct = total > 0 ? (catTotal / total) * 100 : 0;
return (
<div key={cat} className="detail-row">
<div className="detail-top">
<span className="detail-label">{catEmoji[cat]} {cat}</span>
<span className="detail-amount" style={{ color: catColors[cat] }}>{catTotal.</div>
<div className="detail-bar"><div className="detail-bar-fill" style={{ width: <span className="detail-pct">{Math.round(pct)}% du total</span>
</div>
);
})}
</div>
)}
{!showForm && <button className="btn-add-trip" onClick={() => setShowForm(true)}><span {showForm && (
<div className="form-card">
<div className="form-header"><span>Nouvelle dépense</span><button className="btn-close" <div className="form-body">
<div className="input-group"><label className="input-label">Description</label><input <div className="input-row">
<div className="input-group" style={{ flex: 1 }}><label className="input-label"><div className="input-group" style={{ flex: 1 }}><label className="input-label"></div>
<button className="btn-primary" onClick={add}>Ajouter</button>
</div>
</div>
)}
{items.length === 0 && !showForm && <div className="empty-state"><div className="empty-{categories.map((cat) => byCategorie[cat].length > 0 ? (
<div key={cat} className="budget-group">
<div className="group-header" style={{ borderLeft: `3px solid ${catColors[cat]}` }}><{byCategorie[cat].map((item, gi) => {
const realIdx = items.findIndex((x) => x === item);
return (
<div key={gi} className="budget-item">
<span className="item-label">{item.label}</span>
<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
<span className="item-amount">{parseFloat(item.montant).toFixed(2)} €</span>
<button className="btn-icon small" onClick={() => remove(realIdx)}> </button>
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
const add = () => { if (!input.trim()) return; save("todos", [...todos, { text: input, done: const toggle = (i) => save("todos", todos.map((t, idx) => idx === i ? { ...t, done: !t.done const remove = (i) => save("todos", todos.filter((_, idx) => idx !== i));
return (
<div className="section">
{todos.length > 0 && (
<div className="progress-card">
<div className="progress-top"><span className="progress-label">{done} sur {todos.length} <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` </div>
)}
<div className="todo-input-row">
<input className="inp todo-inp" placeholder="Ajouter une tâche…" value={input} onChange={(<button className="btn-primary btn-add-inline" onClick={add}>Ajouter</button>
</div>
{todos.length === 0 && <div className="empty-state"><div className="empty-icon"> </div><<div className="todo-list">
{todos.filter(t => !t.done).map((t) => {
const ri = todos.findIndex((x) => x === t);
return (<div key={ri} className="todo-item"><button className="todo-check" onClick={() })}
{todos.filter(t => t.done).length > 0 && (<>
<p className="done-separator">Terminées</p>
{todos.filter(t => t.done).map((t) => {
const ri = todos.findIndex((x) => x === t);
return (<div key={ri} className="todo-item done"><button className="todo-check checked" })}
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
{meta.dates && <p className="header-dates"> {meta.dates}</p>}
<div className="tabs">
{TABS.map((t, i) => (
<button key={i} className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab())}
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
const list = Object.entries(voyages).sort((a, b) => (b[1].meta?.createdAt || 0) - (a[1].meta?.return (
<>
<div className="home-header">
<p className="home-eyebrow">Planificateur collaboratif</p>
<h1 className="home-title">Mes Voyages </h1>
</div>
<div className="section">
{!showForm && <button className="btn-new-voyage" onClick={() => setShowForm(true)}><span {showForm && (
<div className="form-card">
<div className="form-header"><span>Nouveau voyage</span><button className="btn-close" <div className="form-body">
<div className="input-group"><label className="input-label">Nom du voyage</label><<div className="input-group"><label className="input-label">Destination</label><<div className="input-group"><label className="input-label">Dates</label><input <button className="btn-primary" onClick={submit}>Créer le voyage</button>
</div>
</div>
)}
{list.length === 0 && !showForm && (
<div className="empty-state" style={{ paddingTop: "4rem" }}>
<div className="empty-icon"> </div>
<p className="empty-title">Aucun voyage pour l'instant</p>
<p className="empty-sub">Créez votre premier voyage pour commencer à planifier !</</div>
)}
<div className="voyage-list">
{list.map(([id, voyage]) => {
const meta = voyage.meta || {};
const stops = voyage.stops || [];
const todos = voyage.todos || [];
const budget = voyage.budget || { items: [] };
const total = (budget.items || []).reduce((s, i) => s + parseFloat(i.montant || 0), const doneTodos = todos.filter(t => t.done).length;
return (
<div key={id} className="voyage-card" onClick={() => onSelect(id)}>
<div className="voyage-card-top">
<div>
<p className="voyage-destination">{meta.destination || "Destination"}</p>
<h2 className="voyage-name">{meta.name}</h2>
{meta.dates && <p className="voyage-dates"> {meta.dates}</p>}
</div>
<button className="btn-delete-voyage" onClick={(e) => { e.stopPropagation(); </div>
<div className="voyage-stats">
<span className="voyage-stat"> {stops.length} étape{stops.length > 1 ? "s" <span className="voyage-stat"> {total.toFixed(0)} €</span>
<span className="voyage-stat"> {doneTodos}/{todos.length} tâches</span>
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
<p className="modal-sub">Cette action est irréversible.</p>
<div className="modal-actions">
<button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Annuler</<button className="btn-danger" onClick={() => { onDelete(confirmDelete); setConfirmDelete(</div>
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
if (!loaded) return (
<div className="loading"><div className="spinner" /><span>Chargement…</span></div>
);
const selectedVoyage = selectedId ? voyages[selectedId] : null;
return (
<>
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #F7F7F7; color: #222; font-family: 'Plus Jakarta Sans', sans-serif; .app { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #fff; box-shadow: /* Home */
.home-header { padding: 3rem 1.5rem 1.5rem; background: linear-gradient(135deg, #FF5A5F, .home-eyebrow { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.12em; text-transform: .home-title { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.03em; }
.btn-new-voyage { width: 100%; display: flex; align-items: center; justify-content: center; .btn-new-voyage:hover { background: rgba(255,90,95,0.08); }
.btn-new-icon { font-size: 1.3rem; }
.voyage-list { display: flex; flex-direction: column; gap: 0.85rem; }
.voyage-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; padding: .voyage-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); transform: translateY(-1px); .voyage-card-top { display: flex; justify-content: space-between; align-items: flex-start; .voyage-destination { font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
.voyage-name { font-size: 1.1rem; font-weight: 700; color: #222; margin-bottom: 0.25rem; .voyage-dates { font-size: 0.78rem; color: #717171; }
.btn-delete-voyage { background: #F7F7F7; border: none; width: 32px; height: 32px; border-.btn-delete-voyage:hover { background: #FFE8E8; }
.voyage-stats { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.voyage-stat { font-size: 0.78rem; color: #484848; background: #F7F7F7; padding: 0.3rem /* Header / tabs */
.header { padding: 2rem 1.5rem 0; background: #fff; position: sticky; top: 0; z-index: .btn-back { background: none; border: none; color: #FF5A5F; font-family: 'Plus Jakarta .header-eyebrow { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.12em; text-transform: .header-title { font-size: 1.5rem; font-weight: 700; color: #222; letter-spacing: -0.03em; .header-dates { font-size: 0.78rem; color: #717171; margin-bottom: 0.85rem; }
.tabs { display: flex; margin: 0 -1.5rem; padding: 0 1.5rem; overflow-x: auto; scrollbar-.tabs::-webkit-scrollbar { display: none; }
.tab { flex-shrink: 0; padding: 0.75rem; border: none; background: transparent; color: .tab.active { color: #222; border-bottom: 2px solid #FF5A5F; }
/* Shared */
.section { padding: 1.5rem; }
.form-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; margin-.form-header { display: flex; justify-content: space-between; align-items: center; padding: .btn-close { background: #F7F7F7; border: none; width: 28px; height: 28px; border-radius: .form-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.input-group { display: flex; flex-direction: column; gap: 0.35rem; }
.input-row { display: flex; gap: 0.75rem; }
.input-label { font-size: 0.75rem; font-weight: 600; color: #717171; text-transform: .inp { width: 100%; background: #F7F7F7; border: 1px solid #EBEBEB; border-radius: 10px; .inp:focus { border-color: #FF5A5F; box-shadow: 0 0 0 3px rgba(255,90,95,0.1); background: .inp option { background: #fff; }
.btn-primary { background: #FF5A5F; color: #fff; border: none; border-radius: 10px; padding: .btn-primary:hover { background: #e0484d; }
.btn-add-trip { width: 100%; display: flex; align-items: center; justify-content: center; .btn-add-trip:hover { border-color: #FF5A5F; color: #FF5A5F; }
.btn-add-icon { font-size: 1.1rem; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: .btn-icon:hover { background: #F7F7F7; opacity: 1; }
.btn-icon.small { font-size: 0.8rem; }
.empty-state { text-align: center; padding: 3rem 1rem; }
.empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
.empty-title { font-weight: 600; font-size: 1rem; color: #222; margin-bottom: 0.35rem; .empty-sub { font-size: 0.85rem; color: #717171; }
/* Category picker */
.cat-picker { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
.cat-btn { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; .cat-btn:hover { border-color: #CCCCCC; background: #F0F0F0; }
.cat-btn-active { background: #fff !important; }
.cat-btn-emoji { font-size: 1.4rem; line-height: 1; }
.cat-btn-label { font-size: 0.68rem; font-weight: 600; color: #484848; }
/* Planning timeline */
.planning-timeline { display: flex; flex-direction: column; }
.planning-day { margin-bottom: 1.5rem; }
.planning-day-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: .planning-day-left { display: flex; flex-direction: column; align-items: center; flex-.planning-day-dot { width: 14px; height: 14px; border-radius: 50%; background: #FF5A5F; .planning-day-line { width: 2px; flex: 1; background: #EBEBEB; min-height: 12px; margin-.planning-day-info { flex: 1; }
.planning-day-label { display: inline-block; font-size: 0.7rem; font-weight: 700; text-.planning-day-name { display: block; font-size: 0.95rem; font-weight: 700; color: #222; .planning-day-date { display: block; font-size: 0.78rem; color: #717171; margin-top: .btn-add-day { background: #F7F7F7; border: none; width: 28px; height: 28px; border-radius: .btn-add-day:hover { background: #FFE8E8; }
.planning-day-stops { padding-left: 1.75rem; display: flex; flex-direction: column; gap: /* Stop card */
.planning-stop { transition: opacity 0.15s, transform 0.15s; }
.planning-stop.dragging { opacity: 0.35; transform: scale(0.98); }
.planning-stop.drag-over .planning-stop-inner { box-shadow: 0 -3px 0 0 #FF5A5F; }
.planning-stop-inner { background: #fff; border: 1px solid #EBEBEB; border-left: 3px .planning-stop-top { display: flex; align-items: flex-start; gap: 0.65rem; }
.stop-cat-badge { width: 36px; height: 36px; border-radius: 10px; display: flex; align-.stop-main { flex: 1; min-width: 0; }
.planning-stop-city { font-weight: 700; font-size: 0.92rem; color: #222; display: block; .stop-note { font-size: 0.8rem; color: #717171; line-height: 1.4; margin-top: 0.2rem; .stop-right { display: flex; align-items: center; gap: 0.1rem; flex-shrink: 0; }
.stop-actions { display: flex; gap: 0.1rem; }
.drag-handle { font-size: 1.3rem; color: #CCCCCC; user-select: none; cursor: grab; padding: .drag-handle:hover { color: #999; background: #F7F7F7; }
.drag-handle:active { cursor: grabbing; color: #FF5A5F; }
/* Budget */
.budget-hero { background: linear-gradient(135deg, #FF5A5F, #FC642D); border-radius: .budget-hero-label { font-size: 0.8rem; opacity: 0.85; font-weight: 500; margin-bottom: .budget-hero-amount { font-size: 2.2rem; font-weight: 700; letter-spacing: -0.03em; margin-.budget-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.budget-chip { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.65rem; border-.detail-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 16px; padding: .detail-row { display: flex; flex-direction: column; gap: 0.35rem; }
.detail-top { display: flex; justify-content: space-between; }
.detail-label { font-size: 0.88rem; font-weight: 600; color: #222; }
.detail-amount { font-size: 0.88rem; font-weight: 700; }
.detail-bar { height: 6px; background: #F7F7F7; border-radius: 99px; overflow: hidden;
.detail-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s; }
.detail-pct { font-size: 0.72rem; color: #717171; }
.budget-group { background: #fff; border: 1px solid #EBEBEB; border-radius: 12px; margin-.group-header { display: flex; justify-content: space-between; padding: 0.75rem 1rem .group-total { color: #484848; }
.budget-item { display: flex; justify-content: space-between; align-items: center; padding: .item-label { color: #484848; }
.item-amount { font-weight: 600; color: #222; }
/* Todo */
.progress-card { background: #F7F7F7; border-radius: 12px; padding: 1rem 1.25rem; margin-.progress-top { display: flex; justify-content: space-between; margin-bottom: 0.6rem; .progress-label { font-size: 0.83rem; color: #484848; font-weight: 500; }
.progress-pct { font-size: 0.83rem; font-weight: 700; color: #FF5A5F; }
.progress-bar { height: 5px; background: #DDDDDD; border-radius: 99px; overflow: hidden; .progress-fill { height: 100%; background: #FF5A5F; border-radius: 99px; transition: .todo-input-row { display: flex; gap: 0.6rem; margin-bottom: 1.25rem; }
.todo-inp { flex: 1; }
.btn-add-inline { width: auto; white-space: nowrap; padding: 0.75rem 1.25rem; }
.done-separator { font-size: 0.75rem; font-weight: 700; color: #717171; text-transform: .todo-list { display: flex; flex-direction: column; gap: 0.5rem; }
.todo-item { display: flex; align-items: center; gap: 0.75rem; background: #fff; border: .todo-item.done { opacity: 0.5; }
.todo-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #DDDDDD; .todo-check.checked { background: #FF5A5F; border-color: #FF5A5F; }
.todo-check:hover { border-color: #FF5A5F; }
.todo-text { flex: 1; font-size: 0.9rem; color: #222; }
.todo-item.done .todo-text { text-decoration: line-through; color: #717171; }
/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; .modal { background: #fff; border-radius: 20px; padding: 1.75rem; width: 100%; max-width: .modal-title { font-size: 1.1rem; font-weight: 700; color: #222; margin-bottom: 0.5rem; .modal-sub { font-size: 0.85rem; color: #717171; margin-bottom: 1.5rem; }
.modal-actions { display: flex; gap: 0.75rem; }
.btn-cancel { flex: 1; padding: 0.75rem; border: 1px solid #EBEBEB; border-radius: 10px; .btn-danger { flex: 1; padding: 0.75rem; border: none; border-radius: 10px; background: /* Loading */
.loading { display: flex; flex-direction: column; align-items: center; justify-content: .spinner { width: 28px; height: 28px; border: 2px solid #EBEBEB; border-top-color: #FF5A5F; @keyframes spin { to { transform: rotate(360deg); } }
`}</style>
<div className="app">
{selectedVoyage ? (
<VoyageDetail voyageId={selectedId} voyage={selectedVoyage} saveKey={saveVoyageKey} ) : (
<VoyageList voyages={voyages} onCreate={createVoyage} onSelect={setSelectedId} onDelete={)}
</div>
</>
);
}
