import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import './App.css'
import { BASE_URL } from './consts'

type Expense = {
  _id: string
  description: string
  cost: number
  createdDate: string
}

type ExpenseAddRequest = Pick<Expense, "description" | "cost">

function App() {
  const queryClient = useQueryClient()

  const { data: expenses, isPending: isExpensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/expenses`)
      const data = await res.json()

      if (!res.ok) {
        console.log("Error fetching data: " + data.message)
        return []
      }

      return data
    }
  })

  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editCost, setEditCost] = useState('')

  const sortedExpenses = useMemo(() => {
    if (!expenses) return []
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

  const { mutate: addExpense } = useMutation({
    mutationFn: async (requestData: ExpenseAddRequest) => {
      const res = await fetch(`${BASE_URL}/expenses`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      const data = await res.json()

      if (!res.ok) {
        console.log("Error adding expense: ", data.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
    }
  })

  const handleAddExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!description.trim() || !cost) {
      return
    }

    const parsedCost = Number(cost)
    if (Number.isNaN(parsedCost) || parsedCost <= 0) {
      return
    }

    const newExpense: ExpenseAddRequest = {
      description: description.trim(),
      cost: parsedCost
    }
    addExpense(newExpense)

    setDescription('')
    setCost('')
  }

  const { mutate: removeExpense } = useMutation({
    mutationFn: async (expenseId: string) => {
      const res = await fetch(`${BASE_URL}/expenses/${expenseId}`, {
        method: "DELETE"
      })
      const data = await res.json()

      if (!res.ok) {
        console.log("Error adding expense: ", data.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
    }
  })

  const handleRemoveExpense = (expenseId: string) => {
    removeExpense(expenseId)

    if (expenseId === editingExpenseId) {
      handleCancelEdit()
    }
  }

  const handleStartEdit = (expense: Expense) => {
    setEditingExpenseId(expense._id)
    setEditDescription(expense.description)
    setEditCost(expense.cost.toString())
  }

  const handleCancelEdit = () => {
    setEditingExpenseId(null)
    setEditDescription('')
    setEditCost('')
  }

  const { mutate: updateExpense } = useMutation({
    mutationFn: async ({ expenseId, requestData }: { expenseId: string, requestData: Partial<ExpenseAddRequest> }) => {
      const res = await fetch(`${BASE_URL}/expenses/${expenseId}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      const data = await res.json()

      if (!res.ok) {
        console.log("Error adding expense: ", data.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
    }
  })

  const handleUpdateExpense = (
    event: FormEvent<HTMLFormElement>,
    expenseId: string,
  ) => {
    event.preventDefault()
    if (!editDescription.trim()) {
      return
    }

    const parsedCost = Number(editCost)
    if (Number.isNaN(parsedCost) || parsedCost <= 0) {
      return
    }

    updateExpense({
      expenseId,
      requestData: {
        description: editDescription,
        cost: parsedCost
      }
    })

    handleCancelEdit()
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
        <form onSubmit={handleAddExpense} className="expense-form">
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
        {isExpensesLoading ? (
          <p>Loading expenses...</p>
        ) : groupedExpenses.length === 0 ? (
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
                  <li key={expense._id} className="expense-list__item">
                    {editingExpenseId === expense._id ? (
                      <form
                        className="expense-edit-form"
                        onSubmit={(event) => handleUpdateExpense(event, expense._id)}
                      >
                        <label className="expense-edit__field">
                          Description
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                            required
                          />
                        </label>
                        <label className="expense-edit__field">
                          Cost
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editCost}
                            onChange={(event) => setEditCost(event.target.value)}
                            required
                          />
                        </label>
                        <div className="expense-edit__actions">
                          <button
                            type="submit"
                            className="expense__action-button expense__save"
                            aria-label={`Save changes for ${expense.description}`}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="expense__action-button expense__cancel"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="expense__info">
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
                        </div>
                        <div className="expense__actions">
                          <button
                            type="button"
                            className="expense__action-button expense__edit"
                            onClick={() => handleStartEdit(expense)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="expense__action-button expense__remove"
                            onClick={() => handleRemoveExpense(expense._id)}
                            aria-label={`Remove expense ${expense.description} `}
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
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
