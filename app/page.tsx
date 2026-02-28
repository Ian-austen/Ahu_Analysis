'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const [result, setResult] = useState({ w: 0, h: 0, dp: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { psychrolib.SetUnitSystem(psychrolib.SI); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const p = 101325;
      const p_ws = psychrolib.GetSatVapPres(t);
      const p_w = (rh / 100) * p_ws;
      const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
      const h = psychrolib.GetMoistAirEnthalpy(t, w / 1000) / 1000;
      const dp = psychrolib.GetTDewPointFromVapPres(t, p_w);
      setResult({ w, h, dp });
    } catch (e) { console.error(e); }
  }, [t, rh, mounted]);

  const rhCurves = useMemo(() => {
    if (!mounted) return [];
    const rhs = [10, 30, 50, 70, 90, 100];
    return rhs.map(curRh => {
      const data = [];
      for (let i = 0; i <= 50; i += 2) {
        const p_ws = psychrolib.GetSatVapPres(i);
        const w = psychrolib.GetHumRatioFromVapPres((curRh / 100) * p_ws, 101325) * 1000;
        data.push([i, w]);
      }
      return {
        name: `${curRh}%`, type: 'line', data, showSymbol: false, smooth: true,
        lineStyle: { width: curRh === 100 ? 2 : 1, color: curRh === 100 ? '#2563eb' : '#cbd5e1' }
      };
    });
  }, [mounted]);

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { top: '8%', right: '10%', bottom: '10%', left: '8%' },
    xAxis: { type: 'value', min: 0, max: 50, name: 'DB Temp (°C)' },
    yAxis: { type: 'value', position: 'right', min: 0, max: 30, name: 'Ratio (g/kg)' },
    series: [...rhCurves, {
      name: 'Current', type: 'scatter', data: [[t, result.w]], symbolSize: 20,
      itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 3 }
    }]
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '30px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0 }}>HVAC Psychrometric Chart</h1>
            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginTop: '5px' }}>101.325 kPa // SI ENGINE</p>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981' }}>● SYSTEM OPERATIONAL</div>
        </header>

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>
                  <span>DB TEMPERATURE</span>
                  <span style={{ color: '#2563eb' }}>{t}°C</span>
                </div>
                <input type="range" min="0" max="50" step="0.5" value={t} onChange={e => setT(+e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>
                  <span>HUMIDITY (RH)</span>
                  <span style={{ color: '#2563eb' }}>{rh}%</span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '20px', color: '#fff' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.5, marginBottom: '5px' }}>ENTHALPY (h)</div>
                <div style={{ fontSize: '32px', fontWeight: 900 }}>{result.h.toFixed(2)} <small style={{ fontSize: '14px', opacity: 0.5 }}>kJ/kg</small></div>
              </div>
              <div style={{ background: '#2563eb', padding: '20px', borderRadius: '20px', color: '#fff' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.8, marginBottom: '5px' }}>HUMIDITY RATIO (w)</div>
                <div style={{ fontSize: '32px', fontWeight: 900 }}>{result.w.toFixed(2)} <small style={{ fontSize: '14px', opacity: 0.6 }}>g/kg</small></div>
              </div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '20px', color: '#1e293b', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>DEW POINT (dp)</div>
                <div style={{ fontSize: '32px', fontWeight: 900 }}>{result.dp.toFixed(1)} <small style={{ fontSize: '14px', opacity: 0.5 }}>°C</small></div>
              </div>
            </div>
          </div>

          <div style={{ flex: '1', minWidth: '600px', backgroundColor: '#fff', padding: '20px', borderRadius: '30px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', position: 'relative' }}>
            <ReactECharts option={option} style={{ height: '700px', width: '100%' }} notMerge={true} />
            <div style={{ position: 'absolute', bottom: '30px', right: '40px', fontSize: '60px', fontWeight: 900, color: '#f1f5f9', pointerEvents: 'none', zIndex: 0 }}>101.325</div>
          </div>

        </div>

        <footer style={{ marginTop: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '9px', letterSpacing: '2px' }}>
          ENGINEERING DASHBOARD // SI SYSTEM // 2026
        </footer>
      </div>
    </div>
  );
}
