'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 初始静态数据 ---
const INITIAL_AHU_DATA = [
  { id: 'AHU-01', visible: true, r: { t: 26.0, rh: 57 }, o: { t: 13.3, rh: 87 }, s: { t: 15.3, rh: 90 }, load: 5.9, loadType: 'HEATING', gain: 16.5, alarm: false },
  { id: 'AHU-02', visible: true, r: { t: 25.7, rh: 53 }, o: { t: 11.6, rh: 77 }, s: { t: 16.2, rh: 94 }, load: 15.5, loadType: 'HEATING', gain: 10.0, alarm: false },
  { id: 'AHU-03', visible: true, r: { t: 23.0, rh: 42 }, o: { t: 14.1, rh: 77 }, s: { t: 12.7, rh: 80 }, load: -0.1, loadType: 'COOLING', gain: 8.2, alarm: false },
];

const COMFORT_POLYGON = [[20, 5], [26, 5], [28, 11], [22, 11]];

export default function AHUDashboard() {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'energy'>('diagnostics');
  const [ahuData, setAhuData] = useState(INITIAL_AHU_DATA);
  const [overlay, setOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);

  // 模拟30层楼的实时数据
  const floorData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      floor: 30 - i,
      load: +(10 + Math.random() * 40).toFixed(1),
      temp: +(22 + Math.random() * 4).toFixed(1),
      isHigh: Math.random() > 0.8
    }));
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
    try { psychrolib.SetUnitSystem(psychrolib.SI); } catch (e) { console.error(e); }
  }, []);

  const isInside = (point: number[], vs: number[][]) => {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  useEffect(() => {
    if (!mounted || !isSimulating) return;
    const interval = setInterval(() => {
      setAhuData(currentData => currentData.map(ahu => {
        const drift = () => (Math.random() - 0.5) * 0.4;
        const nextR = { t: ahu.r.t + drift(), rh: Math.max(20, Math.min(95, ahu.r.rh + drift() * 8)) };
        const nextO = { t: ahu.o.t + drift(), rh: Math.max(20, Math.min(95, ahu.o.rh + drift() * 8)) };
        const nextS = { t: ahu.s.t + drift(), rh: Math.max(20, Math.min(95, ahu.s.rh + drift() * 8)) };
        const p_ws = psychrolib.GetSatVapPres(nextR.t);
        const wR = psychrolib.GetHumRatioFromVapPres((nextR.rh/100)*p_ws, 101325)*1000;
        const isAlarm = !isInside([nextR.t, wR], COMFORT_POLYGON);
        const newLoad = (nextS.t - nextO.t) * 1.2;
        const newGain = (nextR.t - nextS.t) * 1.5;
        return { 
          ...ahu, r: nextR, o: nextO, s: nextS, 
          load: parseFloat(newLoad.toFixed(1)), 
          loadType: newLoad >= 0 ? 'HEATING' : 'COOLING', 
          gain: parseFloat(newGain.toFixed(1)), alarm: isAlarm 
        };
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, [mounted, isSimulating]);

  const getPoint = (t: number, rh: number) => {
    const p_ws = psychrolib.GetSatVapPres(t);
    const w = psychrolib.GetHumRatioFromVapPres((rh / 100) * p_ws, 101325) * 1000;
    return { x: t, y: w };
  };

  const option = useMemo(() => {
    if (!mounted) return {};
    const satData = [];
    for (let i = 0; i <= 45; i++) {
      const w = psychrolib.GetHumRatioFromVapPres(psychrolib.GetSatVapPres(i), 101325) * 1000;
      satData.push([i, w]);
    }
    return {
      backgroundColor: 'transparent',
      animationDuration: 800,
      grid: { top: 40, right: 60, bottom: 60, left: 50 },
      xAxis: { type: 'value', min: 0, max: 45, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#666' } },
      yAxis: { type: 'value', min: 0, max: 20, position: 'right', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#666' } },
      series: [
        { type: 'line', data: satData, showSymbol: false, lineStyle: { color: '#444', width: 1 }, z: 1 },
        ...(overlay ? [{
          type: 'custom',
          renderItem: (params: any, api: any) => ({
            type: 'polygon',
            shape: { points: COMFORT_POLYGON.map(p => api.coord(p)) },
            style: { fill: 'rgba(54, 211, 153, 0.1)', stroke: 'rgba(54, 211, 153, 0.3)', lineWidth: 1 }
          }),
          data: [0]
        }] : []),
        ...ahuData.filter(d => d.visible).flatMap(ahu => {
          const r = getPoint(ahu.r.t, ahu.r.rh);
          const o = getPoint(ahu.o.t, ahu.o.rh);
          const s = getPoint(ahu.s.t, ahu.s.rh);
          const color = ahu.id === 'AHU-01' ? '#7B61FF' : (ahu.id === 'AHU-02' ? '#3B82F6' : '#10B981');
          return [{
            name: ahu.id, type: 'line', data: [[o.x, o.y], [s.x, s.y], [r.x, r.y]],
            lineStyle: { color, width: 2 }, symbol: 'circle', symbolSize: 6,
            label: { show: true, position: 'top', color: '#fff', fontSize: 10, formatter: (p:any) => ['O','S','R'][p.dataIndex] }
          }];
        })
      ]
    };
  }, [ahuData, overlay, mounted]);

  if (!mounted) return null;

  return (
    <div style={{ height: '100vh', backgroundColor: '#121418', color: '#E0E6ED', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 顶部统一导航 */}
      <header style={{ height: '60px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: '#161B22' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#7B61FF' }}>TWIN-FLOW AI</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>ENGINEERING DASHBOARD</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
            <button 
              onClick={() => setActiveTab('diagnostics')} 
              style={{ background: activeTab === 'diagnostics' ? '#7B61FF' : 'transparent', border: '1px solid #7B61FF', color: '#fff', padding: '6px 15px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              UNIT DIAGNOSTICS
            </button>
            <button 
              onClick={() => setActiveTab('energy')} 
              style={{ background: activeTab === 'energy' ? '#3B82F6' : 'transparent', border: '1px solid #3B82F6', color: '#fff', padding: '6px 15px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ENERGY BALANCING
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: isSimulating ? '#36D399' : '#F43F5E', fontWeight: 'bold' }}>{isSimulating ? '● LIVE' : '● PAUSED'}</div>
          {activeTab === 'diagnostics' && (
            <button onClick={() => setOverlay(!overlay)} style={{ backgroundColor: overlay ? 'rgba(123, 97, 255, 0.2)' : 'transparent', border: '1px solid #7B61FF', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>
              Givoni Zone: {overlay ? 'ON' : 'OFF'}
            </button>
          )}
        </div>
      </header>

      {/* 页面内容切换 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'diagnostics' ? (
          /* --- 原封不动的 Diagnosis 页面内容 --- */
          <div style={{ display: 'flex', height: '100%' }}>
            <aside style={{ width: '320px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '20px', overflowY: 'auto' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: '20px', letterSpacing: '1px' }}>UNIT STATUS LIST</div>
              {ahuData.map((ahu) => (
                <div key={ahu.id} style={{ 
                  backgroundColor: ahu.alarm ? 'rgba(244, 63, 94, 0.15)' : '#1E2228', 
                  borderRadius: '12px', padding: '16px', marginBottom: '16px', 
                  border: ahu.alarm ? '1px solid rgba(244, 63, 94, 0.5)' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.5s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: ahu.alarm ? '#F43F5E' : '#fff' }}>{ahu.id}</span>
                    {ahu.alarm && <span style={{ fontSize: '9px', color: '#F43F5E', fontWeight: 900 }}>OUT OF RANGE</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[ {l:'R', c:'#F43F5E', v:ahu.r}, {l:'O', c:'#3B82F6', v:ahu.o}, {l:'S', c:'#10B981', v:ahu.s} ].map(s => (
                      <div key={s.l}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{s.l} UNIT</span>
                          <span style={{ fontWeight: 'bold' }}>{s.v.t.toFixed(1)}°C / {Math.round(s.v.rh)}%</span>
                        </div>
                        <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                          <div style={{ height: '100%', backgroundColor: s.c, width: `${(s.v.t/45)*100}%`, transition: 'width 0.8s' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>HVAC LOAD</div>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: ahu.loadType === 'HEATING' ? '#F59E0B' : '#06B6D4' }}>{ahu.load}kj</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>ENERGY GAIN</div>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: '#36D399' }}>{ahu.gain}kj</div>
                    </div>
                  </div>
                </div>
              ))}
            </aside>
            <main style={{ flex: 1, padding: '24px', position: 'relative', backgroundColor: '#0D0F12' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <div style={{ width: '4px', height: '16px', backgroundColor: '#7B61FF' }}></div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)' }}>PSYCHROMETRIC DIAGNOSTIC ENGINE</div>
              </div>
              <div style={{ height: 'calc(100% - 60px)', backgroundColor: 'rgba(30, 34, 40, 0.4)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', backdropFilter: 'blur(10px)' }}>
                <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
              </div>
            </main>
          </div>
        ) : (
          /* --- 新增的 Energy 页签内容：30层大楼模拟 --- */
          <div style={{ display: 'grid', gridTemplateColumns: '450px 1fr', gap: '20px', padding: '25px', height: '100%', backgroundColor: '#0D0F12' }}>
            {/* 左侧：30层大楼垂直分布图 */}
            <div style={{ backgroundColor: '#161B22', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', border: '1px solid #30363D' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3B82F6' }}>VERTICAL BUILDING LOAD (30 FLOORS)</div>
                <div style={{ fontSize: '10px', color: '#8B949E', marginTop: '4px' }}>Real-time chilled water demand per floor (kW)</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {floorData.map(f => (
                  <div key={f.floor} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px' }}>
                    <span style={{ width: '25px', color: '#484F58', fontWeight: 'bold' }}>{f.floor}F</span>
                    <div style={{ flex: 1, height: '14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${(f.load / 50) * 100}%`, 
                        backgroundColor: f.isHigh ? '#F43F5E' : '#3B82F6',
                        transition: 'width 1.5s ease-in-out'
                      }} />
                    </div>
                    <span style={{ width: '45px', textAlign: 'right', color: f.isHigh ? '#F43F5E' : '#8B949E' }}>{f.load}kW</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：能流拓扑图 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ flex: 1, backgroundColor: '#161B22', borderRadius: '20px', padding: '25px', border: '1px solid #30363D' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#36D399', marginBottom: '20px' }}>SYSTEM ENERGY FLOW TOPOLOGY</div>
                <ReactECharts option={{
                  backgroundColor: 'transparent',
                  series: [{
                    type: 'sankey',
                    layout: 'none',
                    data: [
                      { name: 'Cooling Plant' }, { name: 'Pumps' }, { name: 'F21-F30' }, { name: 'F11-F20' }, { name: 'F01-F10' }, { name: 'System Loss' }
                    ],
                    links: [
                      { source: 'Cooling Plant', target: 'F21-F30', value: 340 },
                      { source: 'Cooling Plant', target: 'F11-F20', value: 280 },
                      { source: 'Cooling Source', target: 'F01-F10', value: 220 },
                      { source: 'Cooling Plant', target: 'System Loss', value: 65 },
                      { source: 'Pumps', target: 'F21-F30', value: 45 }
                    ],
                    lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.25 },
                    label: { color: '#E0E6ED', fontSize: 10, fontWeight: 'bold' }
                  }]
                }} style={{ height: '90%' }} />
              </div>
              
              {/* 底部能效卡片 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div style={{ backgroundColor: '#161B22', padding: '20px', borderRadius: '15px', border: '1px solid #30363D' }}>
                  <div style={{ fontSize: '10px', color: '#8B949E' }}>AVG. FLOOR TEMP</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>23.4°C</div>
                </div>
                <div style={{ backgroundColor: '#161B22', padding: '20px', borderRadius: '15px', border: '1px solid #30363D' }}>
                  <div style={{ fontSize: '10px', color: '#8B949E' }}>SYSTEM COP</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#36D399' }}>5.42</div>
                </div>
                <div style={{ backgroundColor: '#161B22', padding: '20px', borderRadius: '15px', border: '1px solid #7B61FF' }}>
                  <div style={{ fontSize: '10px', color: '#7B61FF' }}>AI SAVING POTENTIAL</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>14.8%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 底部状态栏 */}
      <footer style={{ height: '30px', backgroundColor: '#0A0C10', borderTop: '1px solid #1E2228', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#484F58' }}>
        HVAC CORE MONITORING // CLOUD NODE 04 // 256-BIT ENCRYPTION ACTIVE
      </footer>
    </div>
  );
}
