import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  DollarSign, Wallet, PiggyBank, Receipt, ArrowUpCircle, ArrowDownCircle,
  Edit3, Check, X, Target, BarChart3, Filter
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

// ─── Constants ──────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { name: 'Moradia', icon: '🏠', color: '#6366f1' },
  { name: 'Alimentação', icon: '🍔', color: '#f59e0b' },
  { name: 'Transporte', icon: '🚗', color: '#06b6d4' },
  { name: 'Saúde', icon: '💊', color: '#10b981' },
  { name: 'Educação', icon: '📚', color: '#8b5cf6' },
  { name: 'Lazer', icon: '🎮', color: '#ec4899' },
  { name: 'Vestuário', icon: '👕', color: '#f97316' },
  { name: 'Serviços', icon: '📱', color: '#14b8a6' },
  { name: 'Investimentos', icon: '📈', color: '#22c55e' },
  { name: 'Outros', icon: '📦', color: '#94a3b8' },
];

const INCOME_CATEGORIES = [
  { name: 'Salário', icon: '💰', color: '#10b981' },
  { name: 'Freelance', icon: '💻', color: '#06b6d4' },
  { name: 'Investimentos', icon: '📊', color: '#8b5cf6' },
  { name: 'Vendas', icon: '🛒', color: '#f59e0b' },
  { name: 'Outros', icon: '💵', color: '#22c55e' },
];

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function loadFinanceData() {
  try {
    const saved = localStorage.getItem('organizador_finances');
    if (!saved) return { fixedExpenses: [], fixedIncomes: [], transactions: [], budgets: {} };
    
    const parsed = JSON.parse(saved);
    
    // Migração automática: se houver dados antigos sem startDate, 
    // definir como o mês atual para não poluírem os meses passados
    let needsSave = false;
    if (parsed.fixedExpenses) {
      parsed.fixedExpenses.forEach(f => {
        if (!f.startDate) { f.startDate = format(new Date(), 'yyyy-MM'); needsSave = true; }
      });
    }
    if (parsed.fixedIncomes) {
      parsed.fixedIncomes.forEach(f => {
        if (!f.startDate) { f.startDate = format(new Date(), 'yyyy-MM'); needsSave = true; }
      });
    }
    
    if (needsSave) {
      localStorage.setItem('organizador_finances', JSON.stringify(parsed));
    }
    
    return parsed;
  } catch { return { fixedExpenses: [], fixedIncomes: [], transactions: [], budgets: {} }; }
}

function saveFinanceData(data) {
  localStorage.setItem('organizador_finances', JSON.stringify(data));
}

// ─── Format currency ────────────────────────────────────────
const formatCurrency = (v) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};

// ─── Transaction Modal ──────────────────────────────────────
function TransactionModal({ transaction, type, onSave, onClose }) {
  const isExpense = type === 'expense';
  const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const [description, setDescription] = useState(transaction?.description || '');
  const [amount, setAmount] = useState(transaction?.amount || '');
  const [category, setCategory] = useState(transaction?.category || categories[0].name);
  const [date, setDate] = useState(transaction?.date || format(new Date(), 'yyyy-MM-dd'));
  const [isFixed, setIsFixed] = useState(transaction?.isFixed || false);
  const [notes, setNotes] = useState(transaction?.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    onSave({
      id: transaction?.id || Date.now(),
      description,
      amount: parseFloat(amount),
      category,
      date,
      type,
      isFixed,
      notes,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card finance-modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">
          {isExpense ? (
            <><ArrowDownCircle size={20} style={{ color: '#f43f5e', marginRight: 8, verticalAlign: 'middle' }} />
              {transaction ? 'Editar Despesa' : 'Nova Despesa'}</>
          ) : (
            <><ArrowUpCircle size={20} style={{ color: '#10b981', marginRight: 8, verticalAlign: 'middle' }} />
              {transaction ? 'Editar Receita' : 'Nova Receita'}</>
          )}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Aluguel, Supermercado..." autoFocus required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Data</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} onClick={e => { try { e.target.showPicker(); } catch(err){} }} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <div className="fin-category-selector">
              {categories.map(cat => (
                <button
                  type="button"
                  key={cat.name}
                  className={`fin-category-chip ${category === cat.name ? 'selected' : ''}`}
                  style={{ '--chip-color': cat.color }}
                  onClick={() => setCategory(cat.name)}
                >
                  <span className="fin-cat-icon">{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações (opcional)</label>
            <input className="form-input" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
          </div>
          <div className="fin-fixed-toggle">
            <label className="fin-toggle-label">
              <input type="checkbox" checked={isFixed} onChange={e => setIsFixed(e.target.checked)} />
              <span className="fin-toggle-switch" />
              <span>{isExpense ? 'Despesa fixa (recorrente mensal)' : 'Receita fixa (recorrente mensal)'}</span>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save" style={{ background: isExpense ? 'linear-gradient(135deg, #f43f5e, #fb7185)' : 'linear-gradient(135deg, #10b981, #34d399)' }}>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Finances Component ────────────────────────────────
export default function Financas() {
  const [data, setData] = useState(loadFinanceData);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [modal, setModal] = useState(null); // { type: 'expense'|'income', transaction? }
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'fixed' | 'variable'
  const [editingId, setEditingId] = useState(null);

  // Save on changes
  useEffect(() => {
    saveFinanceData(data);
  }, [data]);

  const currentMonthKey = format(currentMonth, 'yyyy-MM');

  // Memoize Date objects to avoid unstable references in dependency arrays
  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonthKey]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonthKey]);

  // ─── Filter transactions for current month ──────────────
  const monthTransactions = useMemo(() => {
    // Get variable transactions for this month
    const variable = data.transactions.filter(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      return isWithinInterval(tDate, { start: monthStart, end: monthEnd });
    });

    // Generate fixed entries for this month (if not already added manually)
    const fixedExpenses = data.fixedExpenses
      .filter(f => (!f.startDate || f.startDate <= currentMonthKey) && (!f.endDate || f.endDate >= currentMonthKey))
      .map(f => ({
        ...f,
        type: 'expense',
        isFixed: true,
        date: currentMonthKey + '-' + (f.dayOfMonth || '01').toString().padStart(2, '0'),
      }));

    const fixedIncomes = data.fixedIncomes
      .filter(f => (!f.startDate || f.startDate <= currentMonthKey) && (!f.endDate || f.endDate >= currentMonthKey))
      .map(f => ({
      ...f,
      type: 'income',
      isFixed: true,
      date: currentMonthKey + '-' + (f.dayOfMonth || '01').toString().padStart(2, '0'),
    }));

    return [...variable, ...fixedExpenses, ...fixedIncomes].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data, currentMonthKey, monthStart, monthEnd]);

  // ─── Apply filters ────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter(t => {
      if (filterCategory !== 'Todas' && t.category !== filterCategory) return false;
      if (filterType === 'fixed' && !t.isFixed) return false;
      if (filterType === 'variable' && t.isFixed) return false;
      return true;
    });
  }, [monthTransactions, filterCategory, filterType]);

  // ─── Financial calculations ───────────────────────────────
  const totals = useMemo(() => {
    const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const fixedIncome = monthTransactions.filter(t => t.type === 'income' && t.isFixed).reduce((s, t) => s + t.amount, 0);
    const fixedExpenses = monthTransactions.filter(t => t.type === 'expense' && t.isFixed).reduce((s, t) => s + t.amount, 0);
    const variableIncome = income - fixedIncome;
    const variableExpenses = expenses - fixedExpenses;
    return { income, expenses, balance: income - expenses, fixedIncome, fixedExpenses, variableIncome, variableExpenses };
  }, [monthTransactions]);

  // ─── Historical data for charts (last 6 months) ──────────
  const historicalData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(currentMonth, i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const mKey = format(m, 'yyyy-MM');

      const variable = data.transactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        return isWithinInterval(tDate, { start: mStart, end: mEnd });
      });

      const fixedExp = data.fixedExpenses
        .filter(f => (!f.startDate || f.startDate <= mKey) && (!f.endDate || f.endDate >= mKey))
        .reduce((s, f) => s + f.amount, 0);
      const fixedInc = data.fixedIncomes
        .filter(f => (!f.startDate || f.startDate <= mKey) && (!f.endDate || f.endDate >= mKey))
        .reduce((s, f) => s + f.amount, 0);

      const varIncome = variable.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const varExpense = variable.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      const totalIncome = fixedInc + varIncome;
      const totalExpense = fixedExp + varExpense;

      months.push({
        month: MONTHS_PT[m.getMonth()],
        fullDate: format(m, 'MMM yyyy', { locale: ptBR }),
        income: totalIncome,
        expenses: totalExpense,
        balance: totalIncome - totalExpense,
      });
    }
    return months;
  }, [data, currentMonthKey]);

  // ─── Expense by category (pie chart) ─────────────────────
  const categoryBreakdown = useMemo(() => {
    const expenses = monthTransactions.filter(t => t.type === 'expense');
    const grouped = {};
    expenses.forEach(t => {
      if (!grouped[t.category]) grouped[t.category] = 0;
      grouped[t.category] += t.amount;
    });
    return Object.entries(grouped)
      .map(([name, value]) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.name === name);
        return { name, value, color: cat?.color || '#94a3b8', icon: cat?.icon || '📦' };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  // ─── Average and forecast ────────────────────────────────
  const forecast = useMemo(() => {
    const pastMonths = historicalData.slice(0, -1); // exclude current
    if (pastMonths.length === 0) return { avgExpense: 0, avgIncome: 0, projectedBalance: 0 };
    const avgExpense = pastMonths.reduce((s, m) => s + m.expenses, 0) / pastMonths.length;
    const avgIncome = pastMonths.reduce((s, m) => s + m.income, 0) / pastMonths.length;
    return {
      avgExpense,
      avgIncome,
      projectedBalance: avgIncome - avgExpense,
    };
  }, [historicalData]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleSaveTransaction = useCallback((transaction) => {
    if (transaction.isFixed) {
      // Save as fixed
      const day = new Date(transaction.date + 'T00:00:00').getDate();
      const fixedEntry = { ...transaction, dayOfMonth: day, startDate: transaction.date.substring(0, 7) };
      delete fixedEntry.type;
      delete fixedEntry.date;

      if (transaction.type === 'expense') {
        setData(prev => {
          const exists = prev.fixedExpenses.find(f => f.id === transaction.id);
          if (exists) {
            return { ...prev, fixedExpenses: prev.fixedExpenses.map(f => f.id === transaction.id ? fixedEntry : f) };
          }
          return { ...prev, fixedExpenses: [...prev.fixedExpenses, fixedEntry] };
        });
      } else {
        setData(prev => {
          const exists = prev.fixedIncomes.find(f => f.id === transaction.id);
          if (exists) {
            return { ...prev, fixedIncomes: prev.fixedIncomes.map(f => f.id === transaction.id ? fixedEntry : f) };
          }
          return { ...prev, fixedIncomes: [...prev.fixedIncomes, fixedEntry] };
        });
      }
    } else {
      // Save as regular transaction
      setData(prev => {
        const exists = prev.transactions.find(t => t.id === transaction.id);
        if (exists) {
          return { ...prev, transactions: prev.transactions.map(t => t.id === transaction.id ? transaction : t) };
        }
        return { ...prev, transactions: [...prev.transactions, transaction] };
      });
    }
    setModal(null);
  }, []);

  const handleDeleteTransaction = useCallback((id, isFixed, type) => {
    if (isFixed) {
      const prevMonthKey = format(subMonths(currentMonth, 1), 'yyyy-MM');
      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      
      const archiveOrDelete = (list) => {
        const item = list.find(f => f.id === id);
        if (!item) return list;
        // If it was created in the same month we are deleting it, just remove it entirely
        if (item.startDate === currentMonthStr) {
          return list.filter(f => f.id !== id);
        }
        // Otherwise, mark it as ended in the previous month
        return list.map(f => f.id === id ? { ...f, endDate: prevMonthKey } : f);
      };

      if (type === 'expense') {
        setData(prev => ({ ...prev, fixedExpenses: archiveOrDelete(prev.fixedExpenses) }));
      } else {
        setData(prev => ({ ...prev, fixedIncomes: archiveOrDelete(prev.fixedIncomes) }));
      }
    } else {
      setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
    }
  }, [currentMonth]);

  // ─── All unique categories from transactions ─────────────
  const allCategories = useMemo(() => {
    const cats = new Set();
    monthTransactions.forEach(t => cats.add(t.category));
    return ['Todas', ...cats];
  }, [monthTransactions]);

  // ─── Custom chart tooltip ─────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="fin-chart-tooltip">
        <p className="fin-tooltip-label">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="fin-container">
      {/* ── Month Navigator ── */}
      <div className="fin-month-nav">
        <button className="fin-nav-btn" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="fin-month-title">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <button className="fin-nav-btn" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="fin-summary-grid">
        <div className="fin-summary-card fin-income-card">
          <div className="fin-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div className="fin-card-info">
            <span className="fin-card-label">Receitas</span>
            <span className="fin-card-value" style={{ color: '#10b981' }}>{formatCurrency(totals.income)}</span>
            <div className="fin-card-sub">
              <span>Fixa: {formatCurrency(totals.fixedIncome)}</span>
              <span>Variável: {formatCurrency(totals.variableIncome)}</span>
            </div>
          </div>
        </div>

        <div className="fin-summary-card fin-expense-card">
          <div className="fin-card-icon" style={{ background: 'rgba(244, 63, 94, 0.15)' }}>
            <TrendingDown size={20} color="#f43f5e" />
          </div>
          <div className="fin-card-info">
            <span className="fin-card-label">Despesas</span>
            <span className="fin-card-value" style={{ color: '#f43f5e' }}>{formatCurrency(totals.expenses)}</span>
            <div className="fin-card-sub">
              <span>Fixa: {formatCurrency(totals.fixedExpenses)}</span>
              <span>Variável: {formatCurrency(totals.variableExpenses)}</span>
            </div>
          </div>
        </div>

        <div className="fin-summary-card fin-balance-card">
          <div className="fin-card-icon" style={{ background: totals.balance >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)' }}>
            <Wallet size={20} color={totals.balance >= 0 ? '#10b981' : '#f43f5e'} />
          </div>
          <div className="fin-card-info">
            <span className="fin-card-label">Saldo do Mês</span>
            <span className="fin-card-value" style={{ color: totals.balance >= 0 ? '#10b981' : '#f43f5e' }}>
              {formatCurrency(totals.balance)}
            </span>
            <div className="fin-card-sub">
              <span>{totals.balance >= 0 ? '✨ Mês positivo!' : '⚠️ Mês negativo'}</span>
            </div>
          </div>
        </div>

        <div className="fin-summary-card fin-forecast-card">
          <div className="fin-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
            <Target size={20} color="#6366f1" />
          </div>
          <div className="fin-card-info">
            <span className="fin-card-label">Previsão (Média)</span>
            <span className="fin-card-value" style={{ color: '#6366f1' }}>
              {formatCurrency(forecast.projectedBalance)}
            </span>
            <div className="fin-card-sub">
              <span>Média gasto: {formatCurrency(forecast.avgExpense)}</span>
              <span>Média receita: {formatCurrency(forecast.avgIncome)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="fin-charts-row">
        {/* Bar Chart - Historical */}
        <div className="fin-chart-card">
          <h3 className="fin-chart-title">
            <BarChart3 size={16} /> Receitas vs Despesas
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={historicalData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Categories */}
        <div className="fin-chart-card">
          <h3 className="fin-chart-title">
            <Receipt size={16} /> Despesas por Categoria
          </h3>
          {categoryBreakdown.length > 0 ? (
            <div className="fin-pie-layout">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="fin-pie-legend">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="fin-legend-item">
                    <span className="fin-legend-dot" style={{ background: cat.color }} />
                    <span className="fin-legend-name">{cat.icon} {cat.name}</span>
                    <span className="fin-legend-value">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="fin-empty-chart">Nenhuma despesa registrada neste mês.</div>
          )}
        </div>

        {/* Area Chart - Balance evolution */}
        <div className="fin-chart-card">
          <h3 className="fin-chart-title">
            <TrendingUp size={16} /> Evolução do Saldo
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="balance" name="Saldo" stroke="#6366f1" fill="url(#balanceGrad)" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Actions Bar ── */}
      <div className="fin-actions-bar">
        <div className="fin-action-buttons">
          <button className="fin-add-btn fin-add-income" onClick={() => setModal({ type: 'income' })}>
            <ArrowUpCircle size={16} /> Nova Receita
          </button>
          <button className="fin-add-btn fin-add-expense" onClick={() => setModal({ type: 'expense' })}>
            <ArrowDownCircle size={16} /> Nova Despesa
          </button>
        </div>

        <div className="fin-filters">
          <div className="fin-filter-group">
            <Filter size={14} />
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="fin-filter-select">
              <option value="all">Todos</option>
              <option value="fixed">Fixos</option>
              <option value="variable">Variáveis</option>
            </select>
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="fin-filter-select">
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Fixed Items Section ── */}
      <div className="fin-fixed-section">
        <div className="fin-fixed-column">
          <h4 className="fin-section-title">
            <PiggyBank size={14} /> Receitas Fixas Mensais
          </h4>
          {(() => {
            const activeIncomes = data.fixedIncomes.filter(f => (!f.startDate || f.startDate <= currentMonthKey) && (!f.endDate || f.endDate >= currentMonthKey));
            if (activeIncomes.length === 0) return <div className="fin-empty-state">Nenhuma receita fixa ativa neste mês.</div>;
            return (
              <div className="fin-fixed-list">
                {activeIncomes.map(item => (
                  <div key={item.id} className="fin-fixed-item fin-income-item">
                    <span className="fin-item-icon">{INCOME_CATEGORIES.find(c => c.name === item.category)?.icon || '💰'}</span>
                    <div className="fin-item-info">
                      <span className="fin-item-desc">{item.description}</span>
                      <span className="fin-item-cat">{item.category} · Dia {item.dayOfMonth}</span>
                    </div>
                    <span className="fin-item-amount fin-amount-positive">{formatCurrency(item.amount)}</span>
                    <button className="fin-item-delete" onClick={() => handleDeleteTransaction(item.id, true, 'income')} title="Encerrar/Remover">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="fin-fixed-column">
          <h4 className="fin-section-title">
            <Receipt size={14} /> Despesas Fixas Mensais
          </h4>
          {(() => {
            const activeExpenses = data.fixedExpenses.filter(f => (!f.startDate || f.startDate <= currentMonthKey) && (!f.endDate || f.endDate >= currentMonthKey));
            if (activeExpenses.length === 0) return <div className="fin-empty-state">Nenhuma despesa fixa ativa neste mês.</div>;
            return (
              <div className="fin-fixed-list">
                {activeExpenses.map(item => (
                  <div key={item.id} className="fin-fixed-item fin-expense-item">
                    <span className="fin-item-icon">{EXPENSE_CATEGORIES.find(c => c.name === item.category)?.icon || '📦'}</span>
                    <div className="fin-item-info">
                      <span className="fin-item-desc">{item.description}</span>
                      <span className="fin-item-cat">{item.category} · Dia {item.dayOfMonth}</span>
                    </div>
                    <span className="fin-item-amount fin-amount-negative">{formatCurrency(item.amount)}</span>
                    <button className="fin-item-delete" onClick={() => handleDeleteTransaction(item.id, true, 'expense')} title="Encerrar/Remover">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Transactions List ── */}
      <div className="fin-transactions-section">
        <h4 className="fin-section-title">
          <DollarSign size={14} /> Transações do Mês
        </h4>
        {filteredTransactions.length === 0 ? (
          <div className="fin-empty-state">
            Nenhuma transação encontrada para este mês com os filtros selecionados.
          </div>
        ) : (
          <div className="fin-transactions-list">
            {filteredTransactions.map(t => {
              const isExpense = t.type === 'expense';
              const cats = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
              const cat = cats.find(c => c.name === t.category);
              return (
                <div key={t.id + (t.isFixed ? '-fixed' : '')} className={`fin-transaction-row ${isExpense ? 'fin-row-expense' : 'fin-row-income'}`}>
                  <div className="fin-tx-icon-wrap" style={{ background: `${cat?.color || '#94a3b8'}20` }}>
                    <span>{cat?.icon || '📦'}</span>
                  </div>
                  <div className="fin-tx-info">
                    <span className="fin-tx-desc">
                      {t.description}
                      {t.isFixed && <span className="fin-badge-fixed">Fixo</span>}
                    </span>
                    <span className="fin-tx-meta">
                      {t.category} · {format(new Date(t.date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                      {t.notes && ` · ${t.notes}`}
                    </span>
                  </div>
                  <span className={`fin-tx-amount ${isExpense ? 'fin-amount-negative' : 'fin-amount-positive'}`}>
                    {isExpense ? '- ' : '+ '}{formatCurrency(t.amount)}
                  </span>
                  {!t.isFixed && (
                    <div className="fin-tx-actions">
                      <button className="fin-item-action" onClick={() => setModal({ type: t.type, transaction: t })} title="Editar">
                        <Edit3 size={13} />
                      </button>
                      <button className="fin-item-delete" onClick={() => handleDeleteTransaction(t.id, false, t.type)} title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <TransactionModal
          type={modal.type}
          transaction={modal.transaction}
          onSave={handleSaveTransaction}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
