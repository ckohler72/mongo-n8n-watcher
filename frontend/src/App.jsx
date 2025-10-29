import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE = 'http://localhost:3330/api'

function App() {
    const [databases, setDatabases] = useState([])
    const [watchers, setWatchers] = useState([])
    const [activeTab, setActiveTab] = useState('databases')
    const [showAddDatabase, setShowAddDatabase] = useState(false)
    const [showAddWatcher, setShowAddWatcher] = useState(false)
    const [editingWatcher, setEditingWatcher] = useState(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [dbRes, watchersRes] = await Promise.all([
                axios.get(`${API_BASE}/databases`),
                axios.get(`${API_BASE}/watchers`)
            ])
            setDatabases(dbRes.data)
            setWatchers(watchersRes.data)
        } catch (error) {
            console.error('Error loading data:', error)
        }
    }

    const toggleDatabase = async (id, enabled) => {
        try {
            await axios.put(`${API_BASE}/databases/${id}`, { enabled: !enabled })
            loadData()
        } catch (error) {
            console.error('Error toggling database:', error)
        }
    }

    const toggleWatcher = async (id, enabled) => {
        try {
            await axios.put(`${API_BASE}/watchers/${id}`, { enabled: !enabled })
            loadData()
        } catch (error) {
            console.error('Error toggling watcher:', error)
        }
    }

    return (
        <div className="app">
            <header>
                <h1>🗄️ Database Watcher</h1>
                <p>Manage database watchers and n8n webhooks</p>
            </header>

            <nav>
                <button onClick={() => setActiveTab('databases')}>Databases</button>
                <button onClick={() => setActiveTab('watchers')}>Watchers</button>
            </nav>

            {activeTab === 'databases' && (
                <DatabasesTab
                    databases={databases}
                    onToggle={toggleDatabase}
                    onAdd={() => setShowAddDatabase(true)}
                    onRefresh={loadData}
                />
            )}

            {activeTab === 'watchers' && (
                <WatchersTab
                    watchers={watchers}
                    databases={databases}
                    onToggle={toggleWatcher}
                    onAdd={() => setShowAddWatcher(true)}
                    onRefresh={loadData}
                    onEdit={(watcher) => {
                        setEditingWatcher(watcher)
                        setShowAddWatcher(true)
                    }}
                    onViewLogs={(watcherId) => {
                        // TODO: Implement log viewer modal
                        console.log('View logs for watcher:', watcherId)
                    }}
                />
            )}

            {showAddDatabase && (
                <AddDatabaseModal
                    onClose={() => setShowAddDatabase(false)}
                    onSave={loadData}
                />
            )}

            {showAddWatcher && (
                <AddWatcherModal
                    databases={databases}
                    editingWatcher={editingWatcher}
                    onClose={() => {
                        setShowAddWatcher(false)
                        setEditingWatcher(null)
                    }}
                    onSave={loadData}
                />
            )}
        </div>
    )
}

function DatabasesTab({ databases, onToggle, onAdd, onRefresh }) {
    return (
        <div>
            <div className="toolbar">
                <button onClick={onAdd}>+ Add Database</button>
                <button onClick={onRefresh}>🔄 Refresh</button>
            </div>

            <div className="card-list">
                {databases.map(db => (
                    <div key={db._id} className="card">
                        <h3>{db.name}</h3>
                        <div className="info">
                            <span className="badge">{db.type}</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={db.enabled}
                                    onChange={() => onToggle(db._id, db.enabled)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function WatchersTab({ watchers, databases, onToggle, onAdd, onRefresh, onEdit, onViewLogs }) {
    const getDatabaseName = (dbId) => {
        const db = databases.find(d => d._id === dbId)
        return db ? db.name : 'Unknown'
    }

    return (
        <div>
            <div className="toolbar">
                <button onClick={onAdd}>+ Add Watcher</button>
                <button onClick={onRefresh}>🔄 Refresh</button>
            </div>

            <div className="card-list">
                {watchers.map(watcher => (
                    <div key={watcher._id} className="card">
                        <div className="card-header">
                            <h3>{watcher.name}</h3>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={watcher.enabled}
                                    onChange={() => onToggle(watcher._id, watcher.enabled)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="card-details">
                            <p><strong>Database:</strong> {getDatabaseName(watcher.databaseId)}</p>
                            <p><strong>Collection/Table:</strong> {watcher.collection || watcher.table}</p>
                            <p><strong>Operations:</strong> {watcher.operations.join(', ')}</p>
                            <p><strong>Webhook:</strong> <span className="webhook-url">{watcher.webhookUrl}</span></p>
                            <p><strong>Triggered:</strong> {watcher.triggerCount || 0} times</p>
                        </div>
                        <div className="card-actions">
                            <button onClick={() => onEdit(watcher)} className="btn-small">✏️ Edit</button>
                            <button onClick={() => onViewLogs(watcher._id)} className="btn-small">📋 Logs</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AddDatabaseModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        name: '',
        type: 'mongodb',
        connectionString: '',
        enabled: true
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await axios.post(`${API_BASE}/databases`, form)
            onSave()
            onClose()
        } catch (error) {
            console.error('Error adding database:', error)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>Add Database</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        placeholder="Database Name"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <select
                        value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                    >
                        <option value="mongodb">MongoDB</option>
                        <option value="postgresql">PostgreSQL</option>
                        <option value="mysql">MySQL</option>
                    </select>
                    <input
                        placeholder="Connection String"
                        value={form.connectionString}
                        onChange={e => setForm({ ...form, connectionString: e.target.value })}
                        required
                    />
                    <div className="modal-actions">
                        <button type="submit">Add</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function AddWatcherModal({ databases, editingWatcher, onClose, onSave }) {
    const [form, setForm] = useState({
        name: '',
        databaseId: databases[0]?._id || '',
        mongoDb: '', // Selected MongoDB database name
        collection: '',
        webhookUrl: '',
        webhookMethod: 'POST', // HTTP method for webhook
        operations: ['insert'],
        enabled: true
    })

    // Populate form if editing
    useEffect(() => {
        if (editingWatcher) {
            setForm({
                name: editingWatcher.name,
                databaseId: editingWatcher.databaseId,
                collection: editingWatcher.collection,
                webhookUrl: editingWatcher.webhookUrl,
                webhookMethod: editingWatcher.webhookMethod || 'POST',
                operations: editingWatcher.operations,
                enabled: editingWatcher.enabled,
                mongoDb: editingWatcher.mongoDatabase || ''
            })
        }
    }, [editingWatcher])
    const [availableDatabases, setAvailableDatabases] = useState([])
    const [collections, setCollections] = useState([])
    const [loadingDatabases, setLoadingDatabases] = useState(false)
    const [loadingCollections, setLoadingCollections] = useState(false)

    // Fetch MongoDB databases when connection changes
    useEffect(() => {
        const fetchMongoDatabases = async () => {
            if (!form.databaseId) {
                setAvailableDatabases([])
                return
            }

            const selectedDb = databases.find(db => db._id === form.databaseId)

            // Only fetch if it's a MongoDB connection
            if (selectedDb && selectedDb.type === 'mongodb') {
                setLoadingDatabases(true)
                try {
                    const response = await axios.get(`${API_BASE}/databases/${form.databaseId}/databases`)
                    setAvailableDatabases(response.data)
                } catch (error) {
                    console.error('Error fetching MongoDB databases:', error)
                    setAvailableDatabases([])
                } finally {
                    setLoadingDatabases(false)
                }
            } else {
                setAvailableDatabases([])
            }
        }

        fetchMongoDatabases()
    }, [form.databaseId, databases])

    // Fetch collections when database or mongoDb changes
    useEffect(() => {
        const fetchCollections = async () => {
            if (!form.databaseId) {
                setCollections([])
                return
            }

            // For MongoDB, require database selection
            const selectedDb = databases.find(db => db._id === form.databaseId)
            if (selectedDb && selectedDb.type === 'mongodb' && !form.mongoDb) {
                setCollections([])
                return
            }

            setLoadingCollections(true)
            try {
                // Pass MongoDB database name as query param if MongoDB
                const url = selectedDb && selectedDb.type === 'mongodb' && form.mongoDb
                    ? `${API_BASE}/databases/${form.databaseId}/collections?database=${form.mongoDb}`
                    : `${API_BASE}/databases/${form.databaseId}/collections`

                console.log('Fetching collections from:', url)
                const response = await axios.get(url)
                console.log('Collections response:', response.data)
                setCollections(response.data)
            } catch (error) {
                console.error('Error fetching collections:', error.response || error.message)
                setCollections([])
            } finally {
                setLoadingCollections(false)
            }
        }

        fetchCollections()
    }, [form.databaseId, form.mongoDb, databases])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            // Prepare form data - include mongoDatabase if MongoDB
            const selectedDb = databases.find(db => db._id === form.databaseId)
            const formData = { ...form }
            
            // If MongoDB, include the selected database name
            if (selectedDb && selectedDb.type === 'mongodb' && form.mongoDb) {
                formData.mongoDatabase = form.mongoDb
            }
            
            // Don't send mongoDb field to backend
            delete formData.mongoDb
            
            if (editingWatcher) {
                // Update existing watcher
                await axios.put(`${API_BASE}/watchers/${editingWatcher._id}`, formData)
            } else {
                // Create new watcher
                await axios.post(`${API_BASE}/watchers`, formData)
            }
            onSave()
            onClose()
        } catch (error) {
            console.error('Error saving watcher:', error)
        }
    }

    const toggleOperation = (op) => {
        setForm({
            ...form,
            operations: form.operations.includes(op)
                ? form.operations.filter(o => o !== op)
                : [...form.operations, op]
        })
    }

    const availableOperations = ['insert', 'update', 'delete', 'replace']

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>{editingWatcher ? 'Edit Watcher' : 'Add Watcher'}</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        placeholder="Watcher Name"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <select
                        value={form.databaseId}
                        onChange={e => setForm({
                            ...form,
                            databaseId: e.target.value,
                            mongoDb: '', // Reset MongoDB database
                            collection: '' // Reset collection
                        })}
                        required
                    >
                        <option value="">Select Database Connection</option>
                        {databases.map(db => (
                            <option key={db._id} value={db._id}>{db.name} ({db.type})</option>
                        ))}
                    </select>

                    {loadingDatabases ? (
                        <div className="loading">Loading databases...</div>
                    ) : availableDatabases.length > 0 && (
                        <select
                            value={form.mongoDb}
                            onChange={e => setForm({
                                ...form,
                                mongoDb: e.target.value,
                                collection: '' // Reset collection when MongoDB database changes
                            })}
                            required
                        >
                            <option value="">Select MongoDB Database</option>
                            {availableDatabases.map(db => (
                                <option key={db.name} value={db.name}>
                                    {db.name}
                                </option>
                            ))}
                        </select>
                    )}
                    {loadingCollections ? (
                        <div className="loading">Loading collections...</div>
                    ) : collections.length > 0 ? (
                        <select
                            value={form.collection}
                            onChange={e => setForm({ ...form, collection: e.target.value })}
                            required
                        >
                            <option value="">Select Collection/Table</option>
                            {collections.map(col => (
                                <option key={col.name} value={col.name}>
                                    {col.name}
                                </option>
                            ))}
                        </select>
                    ) : form.databaseId ? (
                        <input
                            placeholder="Collection/Table Name (or type manually)"
                            value={form.collection}
                            onChange={e => setForm({ ...form, collection: e.target.value })}
                            required
                        />
                    ) : (
                        <input
                            placeholder="Collection/Table Name"
                            value={form.collection}
                            onChange={e => setForm({ ...form, collection: e.target.value })}
                            required
                            disabled
                        />
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            value={form.webhookMethod}
                            onChange={e => setForm({ ...form, webhookMethod: e.target.value })}
                            style={{ flex: '0 0 120px' }}
                        >
                            <option value="POST">POST</option>
                            <option value="GET">GET</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                        </select>
                        <input
                            placeholder="Webhook URL"
                            value={form.webhookUrl}
                            onChange={e => setForm({ ...form, webhookUrl: e.target.value })}
                            required
                            style={{ flex: '1' }}
                        />
                    </div>
                    <div className="checkbox-group">
                        <label>Operations:</label>
                        <div className="checkbox-grid">
                            {availableOperations.map(op => (
                                <label key={op} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={form.operations.includes(op)}
                                        onChange={() => toggleOperation(op)}
                                    />
                                    <span>{op}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="submit">Add</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default App

