import { useState } from 'react'

interface ApiKey {
  id: string
  key: string
  name: string
  createdAt: string
}

function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  const handleCreateKey = async () => {
    // TODO: Implement actual API call
    const newKey: ApiKey = {
      id: Date.now().toString(),
      key: `rfts_${Math.random().toString(36).substring(2, 15)}`,
      name: newKeyName,
      createdAt: new Date().toISOString()
    }
    setApiKeys([...apiKeys, newKey])
    setNewKeyName('')
    setShowCreateForm(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>API Keys</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Create New Key
        </button>
      </div>

      {showCreateForm && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Create New API Key</h3>
          <input
            type="text"
            placeholder="Key name (e.g., Production Store)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCreateKey}
              disabled={!newKeyName}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: newKeyName ? 'pointer' : 'not-allowed',
                opacity: newKeyName ? 1 : 0.5
              }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false)
                setNewKeyName('')
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {apiKeys.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Key</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px' }}>{key.name}</td>
                  <td style={{ padding: '15px', fontFamily: 'monospace', fontSize: '14px' }}>{key.key}</td>
                  <td style={{ padding: '15px' }}>{new Date(key.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ApiKeys
