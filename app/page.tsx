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
    grid: { top: '8%', right: '10%', bottom: '15%', left: '8%' },
    xAxis: { 
      type: 'value', min: 0, max: 50, name: 'Dry Bulb Temp (°C)',
      nameLocation: 'center', nameGap: 30,
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    yAxis: { 
      type: 'value', position: 'right', min: 0, max: 30, 
      name: 'Humidity Ratio (g/kg)',
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [...rhCurves, {
      name: 'State Point', type: 'scatter', data: [[t, result.w]], symbolSize: 18,
      itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 3 }
    }]
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '25px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #cbd5e1', paddingBottom: '15px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0 }}>HVAC Psychrometric Chart</h1>
            <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>101.325 kPa // SI SYSTEM</p>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '4px 10px', borderRadius: '10px' }}>● ACTIVE</div>
        </header>

        <div style={{ display: 'flex', gap: '25px', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          
          {/* Controls Side */}
          <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>
                  <span>DB TEMP</span>
                  <span style={{ color: '#2563eb', fontSize: '16px' }}>{t}°C</span>
                </div>
                <input type="range" min="0" max="50" step="0.5" value={t} onChange={e => setT(+e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>
                  <span>HUMIDITY</span>
                  <span style={{ color: '#2563eb', fontSize: '16px' }}>{rh}%</span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#0f172a', padding: '18px', borderRadius: '20px', color: '#fff' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', opacity: 0.5, marginBottom: '4px' }}>ENTHALPY (h)</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{result.h.toFixed(2)} <small style={{ fontSize: '12px', opacity: 0.5 }}>kJ/kg</small></div>
              </div>
              <div style={{ background: '#2563eb', padding: '18px', borderRadius: '20px', color: '#fff' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', opacity: 0.8, marginBottom: '4px' }}>RATIO (w)</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{result.w.toFixed(2)} <small style={{ fontSize: '12px', opacity: 0.6 }}>g/kg</small></div>
              </div>
              <div style={{ background: '#fff', padding: '18px', borderRadius: '20px', color: '#1e293b', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>DEW POINT (dp)</div>
                <div style={{ fontSize: '28px', fontWeight: 900 }}>{result.dp.toFixed(1)} <small style={{ fontSize: '12px', opacity: 0.5 }}>°C</small></div>
              </div>
            </div>
          </div>

          {/* Chart Side - HEIGHT REDUCED BY 20% */}
          <div style={{ flex: '1', backgroundColor: '#fff', padding: '15px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <ReactECharts option={option} style={{ height: '560px', width: '100%' }} notMerge={true} />
          </div>

        </div>

        <footer style={{ marginTop: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '8px', letterSpacing: '2px' }}>
          HVAC DESIGNER // SI ENGINE // V4.0 COMPACT
        </footer>
      </div>
    </div>
  );
}
