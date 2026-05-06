import { useState, useEffect } from "react"; import { initializeApp } from "firebase/app"; import { getDatabase, ref, onValue, set } from "firebase/database";

// 🔥 On mettra ta config Firebase ici juste après const firebaseConfig = {
  apiKey: "REMPLACE_MOI",
  authDomain: "REMPLACE_MOI",
  databaseURL: "REMPLACE_MOI",
  projectId: "REMPLACE_MOI",
  storageBucket: "REMPLACE_MOI",
  messagingSenderId: "REMPLACE_MOI",
  appId: "REMPLACE_MOI",
};

const app = initializeApp(firebaseConfig); const db = getDatabase(app);

const TABS = ["🗺️ Parcours", "💰 Budget", "✅ To-Do"]; const defaultData = { stops: [], budget: { items: [] }, todos: [] };

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

  const save = (key, value) => {
    set(ref(db, `voyage/${key}`), value);
  };

  return { data, loaded, save };
}

function Parcours({ stops, save }) {
  const [form, setForm] = useState({ ville: "", date: "", note: "" });
  const [editIdx, setEditIdx] = useState(null);

  const submit = () => {
    if (!form.ville.trim()) return;
    let updated;
    if (editIdx !== null) {
      updated = stops.map((s, i) => (i === editIdx ? form : s));
      setEditIdx(null);
    } else {
      updated = [...stops, form];
    }
    save("stops", updated);
    setForm({ ville: "", date: "", note: "" });
  };

  const remove = (i) => save("stops", stops.filter((_, idx) => idx !== i));
  const edit = (i) => { setForm(stops[i]); setEditIdx(i); };

  return (
    <div className="section">
      <div className="card-form">
        <input className="inp" placeholder="Ville / Étape" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
        <input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input className="inp" placeholder="Note (optionnel)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button className="btn-primary" onClick={submit}>{editIdx !== null ? "Modifier" : "+ Ajouter"}</button>
      </div>
      {stops.length === 0 && <p className="empty">Aucune étape — ajoutez votre première destination ✈️</p>}
      <div className="timeline">
        {stops.map((s, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot" />
            {i < stops.length - 1 && <div className="timeline-line" />}
            <div className="timeline-content">
              <div className="stop-header">
                <span className="stop-city">{s.ville}</span>
                {s.date && <span className="stop-date">{new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
              </div>
              {s.note && <p className="stop-note">{s.note}</p>}
              <div className="item-actions">
                <button className="btn-ghost" onClick={() => edit(i)}>✏️</button>
                <button className="btn-ghost danger" onClick={() => remove(i)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Budget({ budget, save }) {
  const [form, setForm] = useState({ label: "", montant: "", categorie: "Transport" });
  const categories = ["Transport", "Hébergement", "Resto", "Activités", "Autre"];
  const catEmoji = { Transport: "✈️", Hébergement: "🏨", Resto: "🍽️", Activités: "🎯", Autre: "📦" };
  const items = budget.items || [];
  const total = items.reduce((s, i) => s + parseFloat(i.montant || 0), 0);

  const add = () => {
    if (!form.label.trim() || !form.montant) return;
    save("budget", { ...budget, items: [...items, form] });
    setForm({ label: "", montant: "", categorie: "Transport" });
  };

  const remove = (i) => save("budget", { ...budget, items: items.filter((_, idx) => idx !== i) });

  return (
    <div className="section">
      <div className="budget-total">
        <span className="total-label">Total dépensé</span>
        <span className="total-amount">{total.toFixed(2)} €</span>
      </div>
      <div className="card-form">
        <input className="inp" placeholder="Dépense" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <input className="inp" type="number" placeholder="Montant (€)" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
        <select className="inp" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="btn-primary" onClick={add}>+ Ajouter</button>
      </div>
      {items.length === 0 && <p className="empty">Aucune dépense enregistrée 💸</p>}
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.categorie === cat);
        if (!catItems.length) return null;
        return (
          <div key={cat} className="budget-group">
            <div className="group-header">
              <span>{catEmoji[cat]} {cat}</span>
              <span className="group-total">{catItems.reduce((s, i) => s + parseFloat(i.montant), 0).toFixed(2)} €</span>
            </div>
            {catItems.map((item, gi) => {
              const realIdx = items.findIndex((x) => x === item);
              return (
                <div key={gi} className="budget-item">
                  <span className="item-label">{item.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="item-amount">{parseFloat(item.montant).toFixed(2)} €</span>
                    <button className="btn-ghost danger" onClick={() => remove(realIdx)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function TodoList({ todos, save }) {
  const [input, setInput] = useState("");
  const done = todos.filter((t) => t.done).length;

  const add = () => {
    if (!input.trim()) return;
    save("todos", [...todos, { text: input, done: false }]);
    setInput("");
  };

  const toggle = (i) => save("todos", todos.map((t, idx) => idx === i ? { ...t, done: !t.done } : t));
  const remove = (i) => save("todos", todos.filter((_, idx) => idx !== i));

  return (
    <div className="section">
      <div className="todo-progress">
        <span>{done}/{todos.length} fait{done > 1 ? "s" : ""}</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: todos.length ? `${(done / todos.length) * 100}%` : "0%" }} />
        </div>
      </div>
      <div className="card-form" style={{ flexDirection: "row" }}>
        <input className="inp" placeholder="Nouvelle tâche…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1 }} />
        <button className="btn-primary" onClick={add}>+</button>
      </div>
      {todos.length === 0 && <p className="empty">Aucune tâche — tout est prêt ? 🎒</p>}
      <div className="todo-list">
        {todos.map((t, i) => (
          <div key={i} className={`todo-item ${t.done ? "done" : ""}`}>
            <button className="todo-check" onClick={() => toggle(i)}>{t.done ? "✓" : ""}</button>
            <span className="todo-text">{t.text}</span>
            <button className="btn-ghost danger" onClick={() => remove(i)}>✕</button>
          </div>
        ))}
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
        @import url('https://urldefense.com/v3/__https://fonts.googleapis.com/css2?family=Playfair*Display:wght@700&family=DM*Sans:wght@400;500;600&display=swap__;Kys!!IY5JXqZAIQ!6kqgPA1LfTLwcKto3cziUMgx0KN_1xiaohgnwMPn0tuU6_vGjj9BnQ4lnx_fhuhc5koweDRHdMrOEv50cHf1$ ');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f1117; color: #e8e3d8; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        .app { max-width: 480px; margin: 0 auto; padding: 0 0 80px; min-height: 100vh; }
        .header { padding: 2.5rem 1.5rem 1rem; background: linear-gradient(180deg, #181c27 0%, transparent 100%); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(12px); }
        .header-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: #f5f0e8; }
        .header-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.2rem; letter-spacing: 0.08em; text-transform: uppercase; }
        .tabs { display: flex; margin: 0.5rem 0 0; background: #181c27; border-radius: 12px; padding: 4px; gap: 2px; }
        .tab { flex: 1; padding: 0.55rem 0.2rem; border: none; background: transparent; color: #6b7280; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .tab.active { background: #252a3a; color: #f5f0e8; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
        .section { padding: 1.5rem; }
        .card-form { display: flex; flex-direction: column; gap: 0.6rem; background: #181c27; border: 1px solid #252a3a; border-radius: 14px; padding: 1rem; margin-bottom: 1.5rem; }
        .inp { width: 100%; background: #0f1117; border: 1px solid #252a3a; border-radius: 8px; padding: 0.65rem 0.85rem; color: #e8e3d8; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
        .inp:focus { border-color: #c9a96e; }
        .inp option { background: #181c27; }
        .btn-primary { background: #c9a96e; color: #0f1117; border: none; border-radius: 8px; padding: 0.65rem 1.2rem; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; }
        .btn-primary:hover { background: #d4b87a; }
        .btn-ghost { background: transparent; border: none; color: #6b7280; cursor: pointer; font-size: 0.85rem; padding: 0.2rem 0.4rem; border-radius: 4px; transition: color 0.15s; }
        .btn-ghost.danger:hover { color: #ef4444; }
        .empty { text-align: center; color: #4b5563; font-size: 0.9rem; padding: 2rem 0; }
        .timeline { display: flex; flex-direction: column; }
        .timeline-item { display: flex; position: relative; padding-left: 2rem; padding-bottom: 1.5rem; }
        .timeline-dot { position: absolute; left: 0; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: #c9a96e; border: 2px solid #0f1117; z-index: 1; }
        .timeline-line { position: absolute; left: 5px; top: 18px; width: 2px; bottom: 0; background: #252a3a; }
        .timeline-content { background: #181c27; border: 1px solid #252a3a; border-radius: 12px; padding: 0.85rem 1rem; flex: 1; }
        .stop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; }
        .stop-city { font-weight: 600; font-size: 1rem; color: #f5f0e8; }
        .stop-date { font-size: 0.75rem; color: #c9a96e; background: #c9a96e15; padding: 2px 8px; border-radius: 20px; }
        .stop-note { font-size: 0.82rem; color: #9ca3af; margin-top: 0.3rem; }
        .item-actions { display: flex; gap: 0.3rem; margin-top: 0.5rem; justify-content: flex-end; }
        .budget-total { background: linear-gradient(135deg, #1a1f2e, #252a3a); border: 1px solid #c9a96e30; border-radius: 16px; padding: 1.2rem 1.5rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .total-label { color: #9ca3af; font-size: 0.85rem; }
        .total-amount { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #c9a96e; }
        .budget-group { background: #181c27; border: 1px solid #252a3a; border-radius: 12px; margin-bottom: 0.8rem; overflow: hidden; }
        .group-header { display: flex; justify-content: space-between; padding: 0.7rem 1rem; background: #1e2333; font-size: 0.85rem; font-weight: 600; color: #d1c9b8; border-bottom: 1px solid #252a3a; }
        .group-total { color: #c9a96e; }
        .budget-item { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1rem; border-bottom: 1px solid #1a1f2e; font-size: 0.88rem; }
        .budget-item:last-child { border-bottom: none; }
        .item-label { color: #9ca3af; }
        .item-amount { color: #e8e3d8; font-weight: 500; }
        .todo-progress { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.82rem; color: #6b7280; }
        .progress-bar { flex: 1; height: 4px; background: #252a3a; border-radius: 99px; overflow: hidden; }
        .progress-fill { height: 100%; background: #c9a96e; border-radius: 99px; transition: width 0.4s; }
        .todo-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .todo-item { display: flex; align-items: center; gap: 0.75rem; background: #181c27; border: 1px solid #252a3a; border-radius: 10px; padding: 0.75rem 0.85rem; transition: opacity 0.2s; }
        .todo-item.done { opacity: 0.5; }
        .todo-check { width: 22px; height: 22px; border-radius: 6px; border: 2px solid #c9a96e; background: transparent; color: #0f1117; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s; }
        .todo-item.done .todo-check { background: #c9a96e; }
        .todo-text { flex: 1; font-size: 0.9rem; color: #e8e3d8; }
        .todo-item.done .todo-text { text-decoration: line-through; color: #6b7280; }
        .loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 1rem; color: #6b7280; }
        .spinner { width: 28px; height: 28px; border: 2px solid #252a3a; border-top-color: #c9a96e; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="app">
        <div className="header">
          <div className="header-title">Mon Voyage ✈️</div>
          <div className="header-sub">Planificateur collaboratif</div>
          <div className="tabs">
            {TABS.map((t, i) => (
              <button key={i} className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>{t}</button>
            ))}
          </div>
        </div>
        {tab === 0 && <Parcours stops={data.stops || []} save={save} />}
        {tab === 1 && <Budget budget={data.budget || { items: [] }} save={save} />}
        {tab === 2 && <TodoList todos={data.todos || []} save={save} />}
      </div>
    </>
  );
}
