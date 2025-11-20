import { type FormEvent, useMemo, useState } from 'react'
import './App.css'

type Expense = {
  id: string
  description: string
  cost: number
  createdDate: string
}

const initialExpenses: Expense[] = [
  {
    id: crypto.randomUUID(),
    description: 'Groceries - Trader Joe’s',
    cost: 56.23,
    createdDate: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    description: 'Monthly transit pass',
    cost: 89.0,
    createdDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    description: 'Coffee with friends',
    cost: 18.5,
    createdDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    description: 'Gym membership',
    cost: 42.0,
    createdDate: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
  },
]

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const diff =
        new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
      return sortOrder === 'asc' ? diff : -diff
    })
  }, [expenses, sortOrder])

  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, Expense[]>()
    sortedExpenses.forEach((expense) => {
      const dayKey = new Date(expense.createdDate).toDateString()
      if (!groups.has(dayKey)) {
        groups.set(dayKey, [])
      }
      groups.get(dayKey)?.push(expense)
    })
    return Array.from(groups.entries())
  }, [sortedExpenses])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!description.trim() || !cost) {
      return
    }

    const parsedCost = Number(cost)
    if (Number.isNaN(parsedCost) || parsedCost <= 0) {
      return
    }

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description: description.trim(),
      cost: parsedCost,
      createdDate: new Date().toISOString(),
    }

    setExpenses((prev) => [newExpense, ...prev])
    setDescription('')
    setCost('')
  }

  return (
    <main className="app">
      <header>
        <div>
          <p className="eyebrow">Expenses</p>
          <h1>Track your daily spending</h1>
          <p className="subhead">
            Add purchases as you go and see how they add up day by day.
          </p>
        </div>
      </header>

      <section className="card form-card">
        <h2>Add a new expense</h2>
        <form onSubmit={handleSubmit} className="expense-form">
          <label>
            Description
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g., Lunch with team"
              required
            />
          </label>
          <label>
            Cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="e.g., 12.50"
              required
            />
          </label>
          <button type="submit">Add</button>
        </form>
      </section>

      <div className="sort-controls">
        <label htmlFor="sort">Sort by date</label>
        <div className="select-wrapper">
          <select
            id="sort"
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value as 'asc' | 'desc')
            }
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      <section className="card">
        {groupedExpenses.length === 0 ? (
          <p>No expenses yet. Start by adding your first one!</p>
        ) : (
          groupedExpenses.map(([dateLabel, entries]) => (
            <div key={dateLabel} className="day-group">
              <div className="day-group__header">
                <p className="day-group__title">
                  {new Date(dateLabel).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <span className="day-group__total">
                  ${entries.reduce((sum, expense) => sum + expense.cost, 0).toFixed(2)}
                </span>
              </div>
              <ul className="expense-list">
                {entries.map((expense) => (
                  <li key={expense.id} className="expense-list__item">
                    <div>
                      <p className="expense__description">{expense.description}</p>
                      <p className="expense__time">
                        {new Date(expense.createdDate).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className="expense__cost">
                      ${expense.cost.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  )
}

export default App
