'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 初始静态数据 ---
const INITIAL_AHU_DATA = [
  { id: 'AHU-01', r: { t: 26.0, rh: 57 }, o: { t: 13.3, rh: 87 }, s: { t: 15.3, rh: 90 }, load: 5.9, alarm: false },
  { id: 'AHU-02', r: { t: 25.7, rh: 53 }, o: { t: 11.6, rh: 77 }, s: { t: 16.2, rh: 94 }, load: 15.5, alarm: false },
  { id: 'AHU-03', r: { t: 23.0, rh: 42 }, o: { t: 14.1, rh: 77 }, s: { t: 12.7, rh: 80 }, load: -0.1, alarm: false },
];

export default function IntegratedDashboard() {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'energy'>('diagnostics');
  const [ahuData, setAhuData] = useState(INITIAL_AHU_DATA);
  const [mounted, setMounted] = useState(false);

  // 模拟30层楼的实时冷量需求 (kW)
  const floorData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      floor: 30 - i,
      load: +(10 + Math.random() * 40).toFixed(1),
      status: Math.random() > 0.8 ? 'OVERLOAD' : 'NORMAL'
    }));
  }, []);

  useEffect(() => {
    setMounted(true);
    try { psychrolib.SetUnitSystem(psychrolib.SI); } catch (e) {}
  }, []);

  // ----------------------------------------------------------------
  // 页面 A: Unit Diagnostics (还原成功方案)
  // ----------------------------------------------------------------
  const renderDiagnostics = () => {
    const getPoint = (t: number, rh: number) => {
      const p_ws = psychrolib.GetSatVapPres(t);
      const w = psychrolib.GetHumRatioFromVapPres((rh / 100) * p_ws, 101325) * 1000;
      return { x: t, y: w };
    };

    const chartOption = {
      backgroundColor: 'transparent',
      grid: { top: 40, right: 60, bottom: 60, left: 50 },
      xAxis: { type: 'value', min: 0, max: 45, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#666' } },
      yAxis: { type: 'value', min: 0, max: 20, position: 'right', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#666' } },
      series: ahuData.flatMap(ahu => {
        const r = getPoint(ahu.r.t, ahu.r.rh);
        const o = getPoint(ahu.o.t, ahu.o.rh);
        const s = getPoint(ahu.s.t, ahu.s.rh);
        const color = ahu.id === 'AHU-01' ? '#7B61FF' : (ahu.id === 'AHU-02' ? '#3B82F6' : '#10B981');
        return [{
          name: ahu.id, type: 'line', data: [[o.x, o.y], [s.x, s.y], [r.x, r.y]],
          lineStyle: { color, width: 2 }, symbol: 'circle', symbolSize: 6,
          label: { show: true, position: 'top', color: '#fff', fontSize: 10, formatter: (p: any) => ['O', 'S', 'R'][p.dataIndex] }
        }];
      })
    };

    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <aside style={{ width: '320px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '20px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>AHU LIVE STATE</div>
          {ahuData.map((ahu) => (
            <div key={ahu.id} style={{ backgroundColor: '#1E2228', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{ahu.id}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[ {l:'R', v:ahu.r, c:'#F43F5E'}, {l:'O', v:ahu.o, c:'#3B82F6'}, {l:'S', v:ahu.s, c:'#10B981'} ].map(pt => (
                  <div key={pt.l}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{pt.l} Point</span>
                      <span>{pt.v.t.toFixed(1)}°C / {Math.round(pt.v.rh)}%</span>
                    </div>
                    <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ height: '100%', backgroundColor: pt.c, width: `${(pt.v.t / 45) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>
        <main style={{ flex: 1, padding: '24px' }}>
          <div style={{ height: '100%', backgroundColor: 'rgba(30, 34, 40, 0.5)', borderRadius: '20px', padding: '20px' }}>
            <ReactECharts option={chartOption} style={{ height: '100%' }} />
          </div>
        </main>
      </div>
    );
  };

  // ----------------------------------------------------------------
  // 页面 B: Energy Balancing (30层大楼模拟)
  // ----------------------------------------------------------------
  const renderEnergy = () => {
    const totalLoad = floorData.reduce((acc, curr) => acc + curr.load, 0).toFixed(1);
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', height: '100%', padding: '20px', gap: '20px', overflow: 'hidden' }}>
        {/* 左侧：30层大楼垂直负载图 */}
        <section style={{ backgroundColor: '#161B22', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#7B61FF' }}>VERTICAL LOAD PROFILE</div>
            <div style={{ fontSize: '10px', color: '#8B949E' }}>Total Demand: {totalLoad} kW</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '10px' }}>
            {floorData.map(f => (
              <div key={f.floor} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px' }}>
                <span style={{ width: '30px', textAlign: 'right', color: '#484F58' }}>F{f.floor}</span>
                <div style={{ flex: 1, height: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '2px', position: 'relative' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${(f.load / 50) * 100}%`, 
                    backgroundColor: f.status === 'OVERLOAD' ? '#F43F5E' : '#3B82F6',
                    transition: 'width 1s ease'
                  }} />
                </div>
                <span style={{ width: '40px', color: f.status === 'OVERLOAD' ? '#F43F5E' : '#8B949E' }}>{f.load}kW</span>
              </div>
            ))}
          </div>
        </section>

        {/* 右侧：全系统桑基图能流分析 */}
        <section style={{ backgroundColor: '#161B22', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#36D399', marginBottom: '20px' }}>SYSTEM ENERGY FLOW BALANCING</div>
          <div style={{ flex: 1 }}>
            <ReactECharts option={{
              backgroundColor: 'transparent',
              series: [{
                type: 'sankey',
                layout: 'none',
                data: [
                  { name: 'Cooling Source' }, { name: 'Primary Pumps' }, { name: 'Losses' },
                  { name: 'F20-F30 (High)' }, { name: 'F10-F19 (Mid)' }, { name: 'F01-F09 (Low)' }
                ],
                links: [
                  { source: 'Cooling Source', target: 'F20-F30 (High)', value: 450 },
                  { source: 'Cooling Source', target: 'F10-F19 (Mid)', value: 380 },
                  { source: 'Cooling Source', target: 'F01-F09 (Low)', value: 290 },
                  { source: 'Cooling Source', target: 'Losses', value: 95 },
                  { source: 'Primary Pumps', target: 'F20-F30 (High)', value: 40 }
                ],
                lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.2 },
                label: { color: '#E0E6ED', fontSize: 10 }
              }]
            }} style={{ height: '100%' }} />
          </div>
        </section>
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div style={{ height: '100vh', backgroundColor: '#0A0C10', color: '#E0E6ED', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'monospace' }}>
      <nav style={{ height: '60px', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', padding: '0 30px', gap: '40px', backgroundColor: '#161B22' }}>
        <div style={{ fontWeight: 900, color: '#7B61FF', fontSize: '18px' }}>TWIN-FLOW AI</div>
        <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
          {(['diagnostics', 'energy'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ 
              background: 'none', border: 'none', color: activeTab === tab ? '#fff' : '#8B949E',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase',
              borderBottom: activeTab === tab ? '2px solid #7B61FF' : 'none', padding: '0 10px'
            }}>
              {tab === 'diagnostics' ? 'Unit Diagnostics' : 'Energy balancing'}
            </button>
          ))}
        </div>
      </nav>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'diagnostics' ? renderDiagnostics() : renderEnergy()}
      </div>

      <footer style={{ height: '30px', backgroundColor: '#0D1117', borderTop: '1px solid #1E2228', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#484F58' }}>
        SYSTEM STATUS: ONLINE // DATA REFRESH: 2S // 30F-BUILDING-S-01
      </footer>
    </div>
  );
}
