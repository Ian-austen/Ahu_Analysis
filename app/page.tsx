'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 初始静态数据 ---
const INITIAL_AHU_DATA = [
  { id: 'AHU-01', visible: true, r: { t: 26.0, rh: 57 }, o: { t: 13.3, rh: 87 }, s: { t: 15.3, rh: 90 }, load: 5.9, loadType: 'HEATING', gain: 16.5 },
  { id: 'AHU-02', visible: true, r: { t: 25.7, rh: 53 }, o: { t: 11.6, rh: 77 }, s: { t: 16.2, rh: 94 }, load: 15.5, loadType: 'HEATING', gain: 10.0 },
  { id: 'AHU-03', visible: true, r: { t: 23.0, rh: 42 }, o: { t: 14.1, rh: 77 }, s: { t: 12.7, rh: 80 }, load: -0.1, loadType: 'COOLING', gain: 8.2 },
];

export default function AHUDashboard() {
  const [ahuData, setAhuData] = useState(INITIAL_AHU_DATA);
  const [overlay, setOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    setMounted(true);
    psychrolib.SetUnitSystem(psychrolib.SI);
  }, []);

  // 模拟逻辑保持不变
  useEffect(() => {
    if (!mounted || !isSimulating) return;
    const interval = setInterval(() => {
      setAhuData(currentData => currentData.map(ahu => {
        const drift = () => (Math.random() - 0.5) * 0.2;
        const nextR = { t: ahu.r.t + drift(), rh: Math.max(30, Math.min(95, ahu.r.rh + drift() * 5)) };
        const nextO = { t: ahu.o.t + drift(), rh: Math.max(30, Math.min(95, ahu.o.rh + drift() * 5)) };
        const nextS = { t: ahu.s.t + drift(), rh: Math.max(30, Math.min(95, ahu.s.rh + drift() * 5)) };
        const newLoad = (nextS.t - nextO.t) * 1.2;
        const newGain = (nextR.t - nextS.t) * 1.5;
        return { ...ahu, r: nextR, o: nextO, s: nextS, load: parseFloat(newLoad.toFixed(1)), loadType: newLoad >= 0 ? 'HEATING' : 'COOLING', gain: parseFloat(newGain.toFixed(1)) };
      }));
    }, 1500);
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
    const comfortZone = [[20, 5], [26, 5], [28, 11], [22, 11], [20, 5]];

    return {
      backgroundColor: 'transparent',
      animationDuration: 1000,
      grid: { top: 40, right: 60, bottom: 60, left: 50 },
      xAxis: { type: 'value', min: 0, max: 45, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#666' } },
      yAxis: { type: 'value', min: 0, max: 20, position: 'right', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#666' } },
      series: [
        { type: 'line', data: satData, showSymbol: false, lineStyle: { color: '#444', width: 1 }, z: 1 },
        ...(overlay ? [{
          type: 'custom',
          renderItem: (params: any, api: any) => ({
            type: 'polygon',
            shape: { points: comfortZone.map(p => api.coord(p)) },
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
    <div style={{ height: '100vh', backgroundColor: '#121418', color: '#E0E6ED', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <header style={{ height: '60px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-1px' }}>MULTI-AHU PROCESS CHART</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>REAL-TIME DIAGNOSTICS</div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={() => setOverlay(!overlay)} style={{ backgroundColor: overlay ? '#7B61FF' : 'transparent', border: '1px solid #7B61FF', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>GIVONI: {overlay ? 'ON' : 'OFF'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 'bold' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#36D399' }}></span>LINKED</div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{ width: '320px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '20px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', letterSpacing: '2px' }}>AHU LIVE STATE</div>
          {ahuData.map((ahu, idx) => (
            <div key={ahu.id} style={{ backgroundColor: '#1E2228', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)', opacity: ahu.visible ? 1 : 0.4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{ahu.id}</span>
                <button onClick={() => { const d = [...ahuData]; d[idx].visible = !d[idx].visible; setAhuData(d); }} style={{ fontSize: '9px', color: '#7B61FF', background: 'none', border: '1px solid #7B61FF', padding: '2px 8px', borderRadius: '10px', cursor: 'pointer' }}>{ahu.visible ? 'HIDE' : 'SHOW'}</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[ {l:'R', c:'#F43F5E', v:ahu.r}, {l:'O', c:'#3B82F6', v:ahu.o}, {l:'S', c:'#10B981', v:ahu.s} ].map(s => (
                  <div key={s.l}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>{s.l}0{idx+1}</span><span>{s.v.t.toFixed(1)}°C / {Math.round(s.v.rh)}%</span></div>
                    <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}><div style={{ height: '100%', backgroundColor: s.c, width: `${(s.v.t/40)*100}%`, transition: 'width 1s' }}></div></div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div><div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>LOAD</div><div style={{ fontSize: '12px', fontWeight: 'bold', color: ahu.loadType === 'HEATING' ? '#F59E0B' : '#06B6D4' }}>{ahu.load}kJ</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>GAIN</div><div style={{ fontSize: '12px', fontWeight: 'bold', color: '#36D399' }}>{ahu.gain}kJ</div></div>
              </div>
            </div>
          ))}
        </aside>

        {/* Main Chart */}
        <main style={{ flex: 1, padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '4px', height: '16px', backgroundColor: '#7B61FF' }}></div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>PSYCHROMETRIC ANALYSIS</div>
          </div>
          <div style={{ height: 'calc(100% - 60px)', backgroundColor: 'rgba(30, 34, 40, 0.5)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px' }}>
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
          </div>
          <div style={{ position: 'absolute', bottom: '40px', left: '40px', fontSize: '80px', fontWeight: 900, color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', fontStyle: 'italic' }}>DIAGNOSTICS</div>
        </main>
      </div>
    </div>
  );
}
