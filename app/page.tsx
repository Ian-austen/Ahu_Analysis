'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [pA, setPA] = useState({ t: 26, rh: 50, w: 0, h: 0 });
  const [pB, setPB] = useState({ t: 16, rh: 90, w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { psychrolib.SetUnitSystem(psychrolib.SI); } catch (e) { console.error(e); }
  }, []);

  // 计算物理参数的通用函数
  const calculate = (t: number, rh: number) => {
    const p = 101325;
    const p_ws = psychrolib.GetSatVapPres(t);
    const p_w = (rh / 100) * p_ws;
    const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
    const h = psychrolib.GetMoistAirEnthalpy(t, w / 1000) / 1000;
    return { t, rh, w, h };
  };

  useEffect(() => {
    if (!mounted) return;
    setPA(prev => ({ ...prev, ...calculate(prev.t, prev.rh) }));
    setPB(prev => ({ ...prev, ...calculate(prev.t, prev.rh) }));
  }, [pA.t, pA.rh, pB.t, pB.rh, mounted]);

  const deltaH = useMemo(() => Math.abs(pA.h - pB.h).toFixed(2), [pA.h, pB.h]);
  const deltaW = useMemo(() => Math.abs(pA.w - pB.w).toFixed(2), [pA.w, pB.w]);

  const rhCurves = useMemo(() => {
    if (!mounted) return [];
    return [10, 30, 50, 70, 90, 100].map(curRh => {
      const data = [];
      for (let i = 0; i <= 50; i += 2) {
        const w = psychrolib.GetHumRatioFromVapPres((curRh / 100) * psychrolib.GetSatVapPres(i), 101325) * 1000;
        data.push([i, w]);
      }
      return {
        name: `${curRh}%`, type: 'line', data, showSymbol: false, smooth: true,
        lineStyle: { width: curRh === 100 ? 2 : 1, color: curRh === 100 ? '#2563eb' : '#cbd5e1', opacity: 0.5 }
      };
    });
  }, [mounted]);

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { top: '5%', right: '10%', bottom: '15%', left: '8%' },
    xAxis: { type: 'value', min: 0, max: 40, name: 'DB Temp (°C)', splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: { type: 'value', position: 'right', min: 0, max: 25, name: 'Ratio (g/kg)', splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      ...rhCurves,
      {
        name: 'Process Line', type: 'line', data: [[pA.t, pA.w], [pB.t, pB.w]],
        lineStyle: { width: 4, color: '#f43f5e', type: 'dashed' },
        symbol: 'circle', symbolSize: 10, zIndex: 50
      },
      {
        name: 'Points', type: 'scatter', data: [{ value: [pA.t, pA.w], itemStyle: { color: '#10b981' } }, { value: [pB.t, pB.w], itemStyle: { color: '#3b82f6' } }],
        symbolSize: 16, zIndex: 100
      }
    ]
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '15px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>HVAC Energy Analyst</h1>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b' }}>STP: 101.325 kPa</div>
        </header>

        <div style={{ display: 'flex', gap: '20px' }}>
          
          <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Point A: Room Air */}
            <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', borderLeft: '5px solid #10b981' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>POINT A: ROOM AIR</div>
              <input type="range" min="15" max="40" step="0.5" value={pA.t} onChange={e => setPA({...pA, t: +e.target.value})} style={{ width: '100%' }} />
              <input type="range" min="10" max="90" step="1" value={pA.rh} onChange={e => setPA({...pA, rh: +e.target.value})} style={{ width: '100%', marginTop: '10px' }} />
            </div>

            {/* Point B: Supply Air */}
            <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', borderLeft: '5px solid #3b82f6' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '10px' }}>POINT B: SUPPLY AIR</div>
              <input type="range" min="5" max="30" step="0.5" value={pB.t} onChange={e => setPB({...pB, t: +e.target.value})} style={{ width: '100%' }} />
              <input type="range" min="30" max="100" step="1" value={pB.rh} onChange={e => setPB({...pB, rh: +e.target.value})} style={{ width: '100%', marginTop: '10px' }} />
            </div>

            {/* Energy Summary */}
            <div style={{ background: '#0f172a', color: '#fff', padding: '20px', borderRadius: '20px' }}>
              <div style={{ fontSize: '9px', opacity: 0.5, letterSpacing: '1px' }}>ENERGY TRANSFER (A ↔ B)</div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#fbbf24' }}>Δ Enthalpy (h)</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{deltaH} <small style={{ fontSize: '12px' }}>kJ/kg</small></div>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#60a5fa' }}>Δ Humid Ratio (w)</div>
                <div style={{ fontSize: '24px', fontWeight: 900 }}>{deltaW} <small style={{ fontSize: '12px' }}>g/kg</small></div>
              </div>
            </div>
          </div>

          <div style={{ flex: '1', backgroundColor: '#fff', padding: '10px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <ReactECharts option={option} style={{ height: '560px', width: '100%' }} notMerge={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
