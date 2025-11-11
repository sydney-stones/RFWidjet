import { useEffect, useState } from 'react'

interface Stats {
  totalTryOns: number
  todayTryOns: number
  activeApiKeys: number
}

function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTryOns: 0,
    todayTryOns: 0,
    activeApiKeys: 0
  })

  useEffect(() => {
    // TODO: Fetch actual stats from API
    setStats({
      totalTryOns: 1234,
      todayTryOns: 45,
      activeApiKeys: 2
    })
  }, [])

  return (
    <div>
      <h1>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '14px', fontWeight: 'normal' }}>Total Try-Ons</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '10px 0 0 0' }}>
            {stats.totalTryOns}
          </p>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '14px', fontWeight: 'normal' }}>Today's Try-Ons</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '10px 0 0 0' }}>
            {stats.todayTryOns}
          </p>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '14px', fontWeight: 'normal' }}>Active API Keys</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '10px 0 0 0' }}>
            {stats.activeApiKeys}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
