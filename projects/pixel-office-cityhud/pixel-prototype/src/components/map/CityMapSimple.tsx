/**
 * Ultra-simple CityMap for debugging
 */
export function CityMap() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      color: '#fff',
      padding: '40px',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '32px' }}>
        🏙️ Living City - Pixel Office
      </h1>

      <div style={{ marginTop: '20px', fontSize: '18px' }}>
        <p>✅ Component is rendering!</p>
        <p style={{ color: '#4ade80' }}>✅ Background color: #1a1a2e (deep blue)</p>
        <p style={{ color: '#fbbf24' }}>📍 Location: /map/prod route</p>
      </div>

      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#0f172a',
        border: '2px solid #3b82f6',
        borderRadius: '8px'
      }}>
        <h2 style={{ color: '#60a5fa' }}>Districts will appear here:</h2>
        <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
          {/* Sample district card */}
          <div style={{
            width: '200px',
            height: '150px',
            backgroundColor: '#1e293b',
            border: '3px solid #22c55e',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              👨‍💼 运营总监
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              监控服务健康度
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px' }}>
              🟢 15个实例运行中
            </div>
          </div>

          {/* Sample district card 2 */}
          <div style={{
            width: '200px',
            height: '150px',
            backgroundColor: '#1e293b',
            border: '3px solid #3b82f6',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              👨‍💻 数据管家
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
              管理数据库/数据制品
            </div>
            <div style={{ marginTop: '12px', fontSize: '11px' }}>
              📊 85%容量
            </div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        fontSize: '12px',
        color: '#94a3b8'
      }}>
        💡 This is a static preview. The full version will have:
        <ul>
          <li>Moving pixel-art agents</li>
          <li>Interactive district cards</li>
          <li>View switcher (environment/resource/application)</li>
          <li>Office panel with agent management</li>
        </ul>
      </div>
    </div>
  )
}
