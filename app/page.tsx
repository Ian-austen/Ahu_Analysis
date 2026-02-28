'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const [result, setResult] = useState({ w: 0, h: 0 });
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
      setResult({ w, h });
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
    grid: { top: '8%', right: '12%', bottom: '10%', left: '8%' },
    xAxis: { type: 'value', min: 0, max: 50, name: '℃', splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { type: 'value', position: 'right', min: 0, max: 30, name: 'g/kg', splitLine: { lineStyle: { type: 'dashed' } } },
    series: [...rhCurves, {
      name: '当前点', type: 'scatter', data: [[t, result.w]], symbolSize: 20,
      itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 3, shadowBlur: 10 }
    }]
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0 }}>HVAC 智能焓湿终端</h1>
          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '12px' }}>● 系统运行正常</div>
        </div>

        {/* Main Content: Flex 布局确保左右分开 */}
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          {/* Left Panel: 400px width */}
          <div style={{ flex: '0 0 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Control Box */}
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #fff' }}>
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>干球温度 (DB)</span>
                  <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{t} ℃</span>
                </div>
                <input type="range" min="0" max="50" step="0.5" value={t} onChange={e => setT(+e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>相对湿度 (RH)</span>
                  <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{rh} %</span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
              </div>
            </div>

            {/* Result Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '25px', borderRadius: '24px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '5px', letterSpacing: '1px' }}>空气焓值 ENTHALPY</div>
                <div style={{ fontSize: '32px', fontWeight: 'black' }}>{result.h.toFixed(2)} <small style={{ fontSize: '14px', opacity: 0.5 }}>kJ/kg</small></div>
              </div>
              <div style={{ background: '#2563eb', padding: '25px', borderRadius: '24px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(37,99,235,0.3)' }}>
                <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '5px', letterSpacing: '1px' }}>含湿量 HUMID RATIO</div>
                <div style={{ fontSize: '32px', fontWeight: 'black' }}>{result.w.toFixed(2)} <small style={{ fontSize: '14px', opacity: 0.5 }}>g/kg</small></div>
              </div>
            </div>
          </div>

          {/* Right Panel: Chart Area */}
          <div style={{ flex: '1', minWidth: '600px', backgroundColor: '#fff', padding: '20px', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.05)', border: '1px solid #fff', position: 'relative' }}>
            <ReactECharts option={option} style={{ height: '700px', width: '100%' }} notMerge={true} />
            <div style={{ position: 'absolute', bottom: '30px', right: '40px', fontSize: '60px', fontWeight: 900, color: '#f1f5f9', pointerEvents: 'none', zIndex: 0 }}>101.325 kPa</div>
          </div>

        </div>

        <footer style={{ marginTop: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '10px', letterSpacing: '2px' }}>
          NEURAL OPS SYSTEM // GEMINI 2.0 FLASH // SI ENGINE
        </footer>
      </div>
    </div>
  );
}
