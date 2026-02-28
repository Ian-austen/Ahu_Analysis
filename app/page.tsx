'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const [result, setResult] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);

  // Initialize PsychroLib SI Units
  useEffect(() => {
    setMounted(true);
    try { 
      psychrolib.SetUnitSystem(psychrolib.SI); 
    } catch (e) { 
      console.error("Library Init Error:", e); 
    }
  }, []);

  // Core Physics Calculation
  useEffect(() => {
    if (!mounted) return;
    try {
      const p = 101325; // Standard Atmospheric Pressure (Pa)
      const p_ws = psychrolib.GetSatVapPres(t);
      const p_w = (rh / 100) * p_ws;
      const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000; // g/kg
      const h = psychrolib.GetMoistAirEnthalpy(t, w / 1000) / 1000; // kJ/kg
      setResult({ w, h });
    } catch (e) { 
      console.error("Calculation Error:", e); 
    }
  }, [t, rh, mounted]);

  // Generate Relative Humidity Background Curves
  const rhCurves = useMemo(() => {
    if (!mounted) return [];
    const rhs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    return rhs.map(curRh => {
      const data = [];
      for (let i = 0; i <= 50; i += 2) {
        const p_ws = psychrolib.GetSatVapPres(i);
        const w = psychrolib.GetHumRatioFromVapPres((curRh / 100) * p_ws, 101325) * 1000;
        data.push([i, w]);
      }
      return {
        name: `RH ${curRh}%`, 
        type: 'line', 
        data, 
        showSymbol: false, 
        smooth: true,
        lineStyle: { 
          width: curRh === 100 ? 3 : 1, 
          color: curRh === 100 ? '#2563eb' : '#cbd5e1',
          opacity: curRh === 100 ? 1 : 0.6
        },
        label: {
          show: true,
          position: 'end',
          formatter: (p: any) => p.dataIndex === p.data.length - 1 ? `${curRh}%` : '',
          fontSize: 10,
          color: '#94a3b8'
        }
      };
    });
  }, [mounted]);

  // ECharts Configuration
  const option = {
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'cross', label: { backgroundColor: '#1e293b' } },
      formatter: (p: any) => `DB Temp: ${p[0].value[0]}°C<br/>Hum Ratio: ${p[0].value[1].toFixed(2)} g/kg`
    },
    grid: { top: '8%', right: '12%', bottom: '10%', left: '8%' },
    xAxis: { 
      type: 'value', 
      min: 0, 
      max: 50, 
      name: 'DB Temp (°C)', 
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } 
    },
    yAxis: { 
      type: 'value', 
      position: 'right', 
      min: 0, 
      max: 30, 
      name: 'Hum Ratio (g/kg)', 
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } 
    },
    series: [
      ...rhCurves, 
      {
        name: 'Current State', 
        type: 'scatter', 
        data: [[t, result.w]], 
        symbolSize: 24,
        itemStyle: { 
          color: '#ef4444', 
          borderColor: '#fff', 
          borderWidth: 4, 
          shadowBlur: 15, 
          shadowColor: 'rgba(239, 68, 68, 0.5)' 
        },
        zIndex: 100
      }
    ]
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: 0, tracking: '-0.025em' }}>HVAC Psychrometric Chart</h1>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>ATMOSPHERIC PRESSURE: 101.325 kPa // SI UNITS</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800, fontSize: '11px', letterSpacing: '1px' }}>
            <span style={{ height: '8px', width: '8px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
            SYSTEM OPERATIONAL
          </div>
        </div>

        {/* Dashboard Content */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          
          {/* Left Panel: Controls & Metrics */}
          <div style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Input Card */}
            <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '28px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #edf2f7' }}>
              <div style={{ marginBottom: '35px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>DRY BULB TEMP (DB)</span>
                  <span style={{ color: '#2563eb', fontWeight: 900, fontSize: '24px' }}>{t} <small style={{ fontSize: '14px' }}>°C</small></span>
                </div>
                <input type="range" min="0" max="50" step="0.5" value={t} onChange={e => setT(+e.target.value)} style={{ width: '100%', cursor: 'pointer', height: '6px' }} />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>RELATIVE HUMIDITY (RH)</span>
                  <span style={{ color: '#2563eb', fontWeight: 900, fontSize: '24px' }}>{rh} <small style={{ fontSize: '14px' }}>%</small></span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} style={{ width: '100%', cursor: 'pointer', height: '6px' }} />
              </div>
            </div>

            {/* Metrics Display */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '28px', borderRadius: '28px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.5, marginBottom: '8px', letterSpacing: '1.5px' }}>ENTHALPY (h)</div>
                <div style={{ fontSize: '38px', fontWeight: 900 }}>{result.h.toFixed(2)} <small style={{ fontSize: '16px', opacity: 0.4, fontWeight: 400 }}>kJ/kg</small></div>
              </div>
              
              <div style={{ background: '#2563eb', padding: '28px', borderRadius: '28px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(37,99,235,0.2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8, marginBottom: '8px', letterSpacing: '1.5px' }}>HUMIDITY RATIO (w)</div>
                <div style={{ fontSize: '38px', fontWeight: 900 }}>{result.w.toFixed(2)} <small style={{ fontSize: '16px', opacity: 0.6, fontWeight: 400 }}>g/kg</small></div>
              </div>
            </div>
          </div>

          {/* Right Panel: Large Chart */}
          <div style={{ flex: '1', minWidth: '700px', backgroundColor: '#fff', padding: '30px', borderRadius: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.03)', border: '1px solid #edf2f7', position: 'relative', overflow: 'hidden' }}>
            <ReactECharts option={option} style={{ height: '750px', width: '100%' }} notMerge={true} />
            <div style={{ position: 'absolute', bottom: '40px', right: '50px', fontSize: '80px', fontWeight: 950, color: '#f8fafc', pointerEvents: 'none', zIndex: 0, userSelect: 'none' }}>
              1
