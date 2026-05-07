import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCMcJP8hAdKCwl5IlHjZqu9y6enG79Isao",
  authDomain: "mon-voyage-5031e.firebaseapp.com",
  databaseURL: "https://mon-voyage-5031e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mon-voyage-5031e",
  storageBucket: "mon-voyage-5031e.firebasestorage.app",
  messagingSenderId: "510891652679",
  appId: "1:510891652679:web:20a86ae03b985d8f3aa362"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const TABS = ["Parcours", "Budget", "To-Do"];
const TAB_ICONS = ["🗺️", "💰", "✅"];
const defaultData = { stops: [], budget: { items: [] }, todos: [] };

function useSharedData() {
  const [data, setData] = useState(defaultData);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const r = ref(db, "voyage");
    const unsub = onValue(r, (snap) => {
      setData(snap.val() || defaultData);
      setLoaded(true);
    });
    return () => unsub();
  }, []);
  const save = (key, value) => set(ref(db, `voyage/${key}`), value);
  return { data, loaded, save };
}

function Parcours({ stops, save }) {
  const [form, setForm] = useState({ ville: "", date: "", note: "" });
  const [editIdx, setEditIdx] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const submit = () => {
    if (!form.ville.trim()) return;
    let updated;
    if (editIdx !== null) {
      updated = stops.map((s, i) => (i === editIdx ? form : s));
      setEditIdx(null);
    } else {
      updated = [...stops, form];
    }
    updated = [...updated].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
    save("stops", updated);
    setForm({ ville: "", date: "", note: "" });
    setShowForm(false);
  };

  const remove = (i) => save("stops", stops.filter((_, idx) => idx !== i));
  const edit = (i) => { setForm(stops[i]); setEditIdx(i); setShowForm(true); };

  return (
    <div className="section">
      {!showForm && (
        <button className="btn-add-trip" onClick={() => setShowForm(true)}>
          <span className="btn-add-icon">+</span>
          Ajouter une étape
        </button>
      )}

      {showForm && (
        <div className="form-card">
          <div className="form-header">
            <span>{editIdx !== null ? "Modifier l'étape" : "Nouvelle étape"}</span>
            <button className="btn-close" onClick={() => { setShowForm(false); setEditIdx(null); setForm({ ville: "", date: "", note: "" }); }}>✕</button>
          </div>
          <div className="form-body">
            <div className="input-group">
              <label className="input-label">Destination</label>
              <input className="inp" placeholder="Ex: Paris, Barcelone…" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Date</label>
              <input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Note</label>
              <input className="inp" placeholder="Activités, hébergement…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <button className="btn-primary" onClick={submit}>{editIdx !== null ? "Enregistrer" : "Ajouter"}</button>
          </div>
        </div>
      )}

      {stops.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <p className="empty-title">Planifiez votre itinéraire</p>
          <p className="empty-sub">Ajoutez vos premières étapes de voyage</p>
        </div>
      )}

      <div className="stops-list">
        {stops.map((s, i) => (
          <div key={i} className="stop-card">
            <div className="stop-left">
              <div className="stop-number">{i + 1}</div>
              {i < stops.length - 1 && <div className="stop-connector" />}
            </div>
            <div className="stop-content">
              <div className="stop-top">
                <span className="stop-city">{s.ville}</span>
                <div className="stop-actions">
                  <button className="btn-icon" onClick={() => edit(i)}>✏️</button>
                  <button className="btn-icon" onClick={() => remove(i)}>🗑️</button>
                </div>
              </div>
              {s.date && (
                <span className="stop-date">
                  📅 {new Date(s.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
                </span>
              )}
              {s.note && <p className="stop-note">{s.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Budget({ budget, save }) {
  const [form, setForm] = useState({ label: "", montant: "", categorie: "Transport" });
  const [showForm, setShowForm] = useState(false);
  const categories = ["Transport", "Hébergement", "Resto", "Activités", "Autre"];
  const catEmoji = { Transport: "✈️", Hébergement: "🏠", Resto: "🍽️", Activités: "🎯", Autre: "📦" };
  const catColors = { Transport: "#FF5A5F", Hébergement: "#00A699", Resto: "#FC642D", Activités: "#484848", Autre: "#767676" };
  const items = budget.items || [];
  const total = items.reduce((s, i) => s + parseFloat(i.montant || 0), 0);

  const add = () => {
    if (!form.label.trim() || !form.montant) return;
    save("budget", { ...budget, items: [...items, form] });
    setForm({ label: "", montant: "", categorie: "Transport" });
    setShowForm(false);
  };

  const remove = (i) => save("budget", { ...budget, items: items.filter((_, idx) => idx !== i) });

  const byCategorie = categories.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => i.categorie === cat);
    return acc;
  }, {});

  return (
    <div className="section">
      <div className="budget-hero">
        <p className="budget-hero-label">Total des dépenses</p>
        <p className="budget-hero-amount">{total.toFixed(2)} €</p>
        <div className="budget-chips">
          {categories.filter(c => byCategorie[c].length > 0).map(cat => (
            <span key={cat} className="budget-chip" style={{ background: catColors[cat] + "18", color: catColors[cat] }}>
              {catEmoji[cat]} {byCategorie[cat].reduce((s, i) => s + parseFloat(i.montant), 0).toFixed(0)}€
            </span>
          ))}
        </div>
      </div>

      {!showForm && (
        <button className="btn-add-trip" onClick={() => setShowForm(true)}>
          <span className="btn-add-icon">+</span>
          Ajouter une dépense
        </button>
      )}

      {showForm && (
        <div className="form-card">
          <div className="form-header">
            <span>Nouvelle dépense</span>
            <button className="btn-close" onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div className="form-body">
            <div className="input-group">
              <label className="input-label">Description</label>
              <input className="inp" placeholder="Ex: Vol Paris-Rome" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div className="input-row">
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Montant (€)</label>
                <input className="inp" type="number" placeholder="0.00" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Catégorie</label>
                <select className="inp" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" onClick={add}>Ajouter</button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <p className="empty-title">Suivez vos dépenses</p>
          <p className="empty-sub">Gardez un œil sur votre budget de voyage</p>
        </div>
      )}

      {categories.map((cat) => byCategorie[cat].length > 0 ? (
        <div key={cat} className="budget-group">
          <div className="group-header" style={{ borderLeft: `3px solid ${catColors[cat]}` }}>
            <span>{catEmoji[cat]} {cat}</span>
            <span className="group-total">{byCategorie[cat].reduce((s, i) => s + parseFloat(i.montant), 0).toFixed(2)} €</span>
          </div>
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

function TodoList({ todos, save }) {
  const [input, setInput] = useState("");
  const done = todos.filter((t) => t.done).length;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;

  const add = () => {
    if (!input.trim()) return;
    save("todos", [...todos, { text: input, done: false }]);
    setInput("");
  };

  const toggle = (i) => save("todos", todos.map((t, idx) => idx === i ? { ...t, done: !t.done } : t));
  const remove = (i) => save("todos", todos.filter((_, idx) => idx !== i));

  return (
    <div className="section">
      {todos.length > 0 && (
        <div className="progress-card">
          <div className="progress-top">
            <span className="progress-label">{done} sur {todos.length} tâche{todos.length > 1 ? "s" : ""} complétée{done > 1 ? "s" : ""}</span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="todo-input-row">
        <input
          className="inp todo-inp"
          placeholder="Ajouter une tâche…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn-primary btn-add-inline" onClick={add}>Ajouter</button>
      </div>

      {todos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-title">Votre liste de tâches</p>
          <p className="empty-sub">Passeport, visas, réservations… tout ici !</p>
        </div>
      )}

      <div className="todo-list">
        {todos.filter(t => !t.done).map((t, i) => {
          const realIdx = todos.findIndex((x) => x === t);
          return (
            <div key={i} className="todo-item">
              <button className="todo-check" onClick={() => toggle(realIdx)} />
              <span className="todo-text">{t.text}</span>
              <button className="btn-icon small" onClick={() => remove(realIdx)}>🗑️</button>
            </div>
          );
        })}
        {todos.filter(t => t.done).length > 0 && (
          <>
            <p className="done-separator">Terminées</p>
            {todos.filter(t => t.done).map((t, i) => {
              const realIdx = todos.findIndex((x) => x === t);
              return (
                <div key={i} className="todo-item done">
                  <button className="todo-check checked" onClick={() => toggle(realIdx)}>✓</button>
                  <span className="todo-text">{t.text}</span>
                  <button className="btn-icon small" onClick={() => remove(realIdx)}>🗑️</button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);
  const { data, loaded, save } = useSharedData();

  if (!loaded) return (
    <div className="loading">
      <div className="spinner" />
      <span>Chargement…</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Circular+Std:wght@400;500;700&family=Cedarville+Cursive&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #F7F7F7;
          color: #222222;
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
        }

        .app {
          max-width: 480px;
          margin: 0 auto;
          min-height: 100vh;
          background: #fff;
          box-shadow: 0 0 40px rgba(0,0,0,0.08);
          padding-bottom: 100px;
        }

        /* Header */
        .header {
          padding: 3rem 1.5rem 0;
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 1px solid #EBEBEB;
        }
        .header-eyebrow {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #FF5A5F;
          margin-bottom: 0.3rem;
        }
        .header-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: #222;
          letter-spacing: -0.03em;
          margin-bottom: 1.25rem;
        }

        /* Tabs */
        .tabs {
          display: flex;
          gap: 0;
          border-bottom: none;
          margin: 0 -1.5rem;
          padding: 0 1.5rem;
        }
        .tab {
          flex: 1;
          padding: 0.75rem 0.5rem;
          border: none;
          background: transparent;
          color: #717171;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }
        .tab.active {
          color: #222;
          border-bottom: 2px solid #FF5A5F;
        }

        /* Section */
        .section { padding: 1.5rem; }

        /* Form card */
        .form-card {
          background: #fff;
          border: 1px solid #EBEBEB;
          border-radius: 16px;
          margin-bottom: 1.25rem;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #EBEBEB;
          font-weight: 600;
          font-size: 0.9rem;
          color: #222;
        }
        .btn-close {
          background: #F7F7F7;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.75rem;
          color: #717171;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .form-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .input-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .input-row { display: flex; gap: 0.75rem; }
        .input-label { font-size: 0.75rem; font-weight: 600; color: #717171; text-transform: uppercase; letter-spacing: 0.06em; }
        .inp {
          width: 100%;
          background: #F7F7F7;
          border: 1px solid #EBEBEB;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          color: #222;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .inp:focus { border-color: #FF5A5F; box-shadow: 0 0 0 3px rgba(255,90,95,0.1); background: #fff; }
        .inp option { background: #fff; }

        .btn-primary {
          background: #FF5A5F;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 0.85rem 1.5rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          width: 100%;
        }
        .btn-primary:hover { background: #e0484d; }
        .btn-primary:active { transform: scale(0.98); }

        .btn-add-trip {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem;
          border: 1.5px dashed #DDDDDD;
          border-radius: 12px;
          background: transparent;
          color: #717171;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1.25rem;
        }
        .btn-add-trip:hover { border-color: #FF5A5F; color: #FF5A5F; background: rgba(255,90,95,0.03); }
        .btn-add-icon { font-size: 1.1rem; font-weight: 400; }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0.3rem;
          border-radius: 6px;
          transition: background 0.15s;
          opacity: 0.6;
        }
        .btn-icon:hover { background: #F7F7F7; opacity: 1; }
        .btn-icon.small { font-size: 0.8rem; }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #717171;
        }
        .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
        .empty-title { font-weight: 600; font-size: 1rem; color: #222; margin-bottom: 0.35rem; }
        .empty-sub { font-size: 0.85rem; color: #717171; }

        /* Stops */
        .stops-list { display: flex; flex-direction: column; }
        .stop-card {
          display: flex;
          gap: 1rem;
          padding-bottom: 1rem;
        }
        .stop-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .stop-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #FF5A5F;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stop-connector {
          width: 2px;
          flex: 1;
          background: #EBEBEB;
          margin: 4px 0;
          min-height: 20px;
        }
        .stop-content {
          flex: 1;
          background: #fff;
          border: 1px solid #EBEBEB;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          margin-bottom: 0;
        }
        .stop-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.35rem;
        }
        .stop-city { font-weight: 700; font-size: 1rem; color: #222; }
        .stop-actions { display: flex; gap: 0.25rem; }
        .stop-date { font-size: 0.78rem; color: #717171; display: block; margin-bottom: 0.4rem; }
        .stop-note { font-size: 0.83rem; color: #484848; margin-top: 0.3rem; line-height: 1.4; }

        /* Budget */
        .budget-hero {
          background: linear-gradient(135deg, #FF5A5F, #FC642D);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.25rem;
          color: #fff;
        }
        .budget-hero-label { font-size: 0.8rem; opacity: 0.85; font-weight: 500; margin-bottom: 0.3rem; }
        .budget-hero-amount { font-size: 2.2rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.75rem; }
        .budget-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .budget-chip {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 20px;
          background: rgba(255,255,255,0.2) !important;
          color: #fff !important;
        }
        .budget-group {
          background: #fff;
          border: 1px solid #EBEBEB;
          border-radius: 12px;
          margin-bottom: 0.75rem;
          overflow: hidden;
        }
        .group-header {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #F7F7F7;
          font-size: 0.82rem;
          font-weight: 700;
          color: #222;
          padding-left: 0.85rem;
        }
        .group-total { color: #484848; }
        .budget-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.7rem 1rem;
          border-top: 1px solid #F7F7F7;
          font-size: 0.88rem;
        }
        .item-label { color: #484848; }
        .item-amount { font-weight: 600; color: #222; }

        /* Todo */
        .progress-card {
          background: #F7F7F7;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.25rem;
        }
        .progress-top { display: flex; justify-content: space-between; margin-bottom: 0.6rem; }
        .progress-label { font-size: 0.83rem; color: #484848; font-weight: 500; }
        .progress-pct { font-size: 0.83rem; font-weight: 700; color: #FF5A5F; }
        .progress-bar { height: 5px; background: #DDDDDD; border-radius: 99px; overflow: hidden; }
        .progress-fill { height: 100%; background: #FF5A5F; border-radius: 99px; transition: width 0.4s; }

        .todo-input-row { display: flex; gap: 0.6rem; margin-bottom: 1.25rem; }
        .todo-inp { flex: 1; }
        .btn-add-inline { width: auto; white-space: nowrap; padding: 0.75rem 1.25rem; }

        .done-separator {
          font-size: 0.75rem;
          font-weight: 700;
          color: #717171;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.75rem 0 0.5rem;
        }

        .todo-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .todo-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #fff;
          border: 1px solid #EBEBEB;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          transition: opacity 0.2s;
        }
        .todo-item.done { opacity: 0.5; }
        .todo-check {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #DDDDDD;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 0.7rem;
          color: #fff;
          transition: all 0.15s;
        }
        .todo-check.checked { background: #FF5A5F; border-color: #FF5A5F; }
        .todo-check:hover { border-color: #FF5A5F; }
        .todo-text { flex: 1; font-size: 0.9rem; color: #222; }
        .todo-item.done .todo-text { text-decoration: line-through; color: #717171; }

        /* Loading */
        .loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 1rem; color: #717171; font-size: 0.9rem; background: #fff; }
        .spinner { width: 28px; height: 28px; border: 2px solid #EBEBEB; border-top-color: #FF5A5F; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="app">
        <div className="header">
          <p className="header-eyebrow">Planificateur collaboratif</p>
          <h1 className="header-title">Mon Voyage ✈️</h1>
          <div className="tabs">
            {TABS.map((t, i) => (
              <button key={i} className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>
                {TAB_ICONS[i]} {t}
              </button>
            ))}
          </div>
        </div>

        {tab === 0 && <Parcours stops={data.stops || []} save={save} />}
        {tab === 1 && <Budget budget={data.budget || { items: [] }} save={save} />}
        {tab === 2 && <TodoList todos={data.todos || []} save={save} />}
      </div>
    </>
  );