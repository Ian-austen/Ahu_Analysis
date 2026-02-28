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
    const curves = [];
    const rhs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const p = 101325;
    for (let currentRh of rhs) {
      const data = [];
      for (let t_val = 0; t_val <= 50; t_val += 1) {
        const p_ws = psychrolib.GetSatVapPres(t_val);
        const p_w = (currentRh / 100) * p_ws;
        const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
        data.push([t_val, w]);
      }
      curves.push({
        name: `RH ${currentRh}%`,
        type: 'line',
        data: data,
        showSymbol: false,
        smooth: true,
        lineStyle: { 
          width: currentRh === 100 ? 3 : 1, 
          color: currentRh === 100 ? '#3b82f6' : '#e2e8f0'
        },
        label: { 
          show: true, position: 'end', 
          formatter: (params: any) => params.dataIndex === data.length - 1 ? `${currentRh}%` : '',
          fontSize: 10, color: '#94a3b8'
        }
      });
    }
    return curves;
  }, [mounted]);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#1e293b' } },
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      formatter: (params: any) => {
        const db = params[0].value[0];
        const w = params[0].value[1].toFixed(2);
        return `<div style="padding:8px"><b>数值读数</b><br/>温度: ${db} ℃<br/>含湿量: ${w} g/kg</div>`;
      }
    },
    grid: { top: '8%', right: '8%', bottom: '10%', left: '8%', containLabel: true },
    xAxis: { name: 'Temp ℃', type: 'value', min: 0, max: 50, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: { name: 'g/kg', type: 'value', position: 'right', min: 0, max: 30, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      ...rhCurves,
      {
        name: '当前状态点',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 22,
        itemStyle: { color: '#f43f5e', borderColor: '#fff', borderWidth: 4, shadowBlur: 20, shadowColor: 'rgba(244,63,94,0.6)' },
        label: { show: true, formatter: 'TARGET', position: 'right', backgroundColor: '#1e293b', color: '#fff', padding: [4, 8], borderRadius: 4, fontWeight: 'bold' },
        zIndex: 1000
      }
    ]
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 lg:p-10 font-sans text-slate-800">
      <div className="max-w-[1500px] mx-auto">
        <header className="mb-8 flex justify-between items-end border-b border-slate-300 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-blue-600 text-white p-2 rounded-lg shadow-lg text-xl">P</span>
              HVAC PSYCHRO HUB
            </h1>
            <p className="text-slate-500 font-mono text-xs mt-2 uppercase tracking-widest text-slate-400">Pressure: 101.325 kPa</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Engine Ready</span>
          </div>
        </header>

        <main className="flex flex-col lg:flex-row gap-8 items-stretch">
          <aside className="lg:w-[380px] space-y-6 flex-shrink-0">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2rem] border border-white shadow-2xl space-y-10">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Dry Bulb</span>
                  <span className="text-4xl font-mono font-bold text-blue-700">{t.toFixed(1)}<small className="text-sm italic ml-1">℃</small></span>
                </div>
                <input type="range" min="0" max="50" step="0.1" value={t} onChange={e => setT(+e.target.value)} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Humidity</span>
                  <span className="text-4xl font-mono font-bold text-blue-700">{rh}<small className="text-sm italic ml-1">%</small></span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2rem] text-white shadow-xl">
                <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Enthalpy (h)</p>
                <div className="text-4xl font-black">{result.h.toFixed(2)} <span className="text-sm font-normal opacity-60">kJ/kg</span></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] text-slate-800 border border-slate-100 shadow-xl">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Humid Ratio (w)</p>
                <div className="text-4xl font-black text-slate-700">{result.w.toFixed(2)} <span className="text-sm font-normal opacity-40">g/kg</span></div>
              </div>
            </div>
          </aside>

          <section className="flex-grow bg-white p-6 rounded-[2.5rem] shadow-2xl border border-white flex items-center justify-center min-h-[750px] relative">
             <ReactECharts option={option} style={{ height: '700px', width: '10
