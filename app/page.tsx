'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const [result, setResult] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);

  // 初始化引擎
  useEffect(() => {
    setMounted(true);
    try {
      psychrolib.SetUnitSystem(psychrolib.SI);
    } catch (err) {
      console.error("PsychroLib Init Error", err);
    }
  }, []);

  // 物理计算逻辑（带安全校验）
  useEffect(() => {
    if (!mounted) return;
    try {
      const p = 101325;
      const safeT = Math.max(0, Math.min(50, t));
      const safeRh = Math.max(0.01, Math.min(100, rh));
      
      const p_ws = psychrolib.GetSatVapPres(safeT);
      const p_w = (safeRh / 100) * p_ws;
      const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
      const h = psychrolib.GetMoistAirEnthalpy(safeT, w / 1000) / 1000;
      
      setResult({ w, h });
    } catch (err) {
      setResult({ w: 0, h: 0 });
    }
  }, [t, rh, mounted]);

  // 生成背景曲线
  const rhCurves = useMemo(() => {
    if (!mounted) return [];
    const curves = [];
    const rhs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const p = 101325;
    
    for (const currentRh of rhs) {
      const data = [];
      for (let i = 0; i <= 50; i += 2) {
        const p_ws = psychrolib.GetSatVapPres(i);
        const p_w = (currentRh / 100) * p_ws;
        const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
        data.push([i, w]);
      }
      curves.push({
        name: `RH ${currentRh}%`,
        type: 'line',
        data,
        showSymbol: false,
        smooth: true,
        lineStyle: { 
          width: currentRh === 100 ? 3 : 1, 
          color: currentRh === 100 ? '#3b82f6' : '#e2e8f0' 
        },
        label: {
          show: true,
          position: 'end',
          formatter: (p: any) => p.dataIndex === p.data.length - 1 ? `${currentRh}%` : '',
          fontSize: 9,
          color: '#94a3b8'
        }
      });
    }
    return curves;
  }, [mounted]);

  const option = {
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      formatter: (params: any) => {
        const d = params[0].value;
        return `Temp: ${d[0]}℃<br/>Hum: ${d[1].toFixed(2)}g/kg`;
      }
    },
    grid: { top: '10%', right: '10%', bottom: '10%', left: '8%', containLabel: true },
    xAxis: { type: 'value', min: 0, max: 50, name: '℃', splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: { type: 'value', position: 'right', min: 0, max: 30, name: 'g/kg', splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      ...rhCurves,
      {
        name: 'Target',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 20,
        itemStyle: { color: '#f43f5e', borderColor: '#fff', borderWidth: 3, shadowBlur: 10 },
        zIndex: 10
      }
    ]
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-10 text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-8 border-b pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-800">PSYCHRO-HUB</h1>
            <p className="text-xs font-mono text-slate-400">P = 101.325 kPa</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Engine Ready
          </div>
        </header>

        <main className="flex flex-col lg:flex-row gap-10">
          <aside className="lg:w-[350px] flex-shrink-0 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-white space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between font-bold text-xs text-slate-400">
                  <span>DRY BULB</span>
                  <span className="text-blue-600 text-xl font-mono">{t.toFixed(1)}℃</span>
                </div>
                <input type="range" min="0" max="50" step="0.5" value={t} onChange={(e) => setT(+e.target.value)} className="w-full accent-blue-600" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between font-bold text-xs text-slate-400">
                  <span>HUMIDITY</span>
                  <span className="text-blue-600 text-xl font-mono">{rh}%</span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={(e) => setRh(+e.target.value)} className="w-full accent-blue-600" />
              </div>
            </div>

            <div className="space-y-4 text-white">
              <div className="bg-slate-900 p-6 rounded-3xl shadow-lg">
                <p className="text-[10px] font-bold opacity-50 mb-1 tracking-widest text-white">ENTHALPY (H)</p>
                <p className="text-4xl font-black font-mono">{result.h.toFixed(2)}<span className="text-xs ml-2 opacity-40 uppercase">kJ/kg</span></p>
              </div>
              <div className="bg-blue-600 p-6 rounded-3xl shadow-lg">
                <p className="text-[10px] font-bold opacity-50 mb-1 tracking-widest text-white">RATIO (W)</p>
                <p className="text-4xl font-black font-mono">{result.w.toFixed(2)}<span className="text-xs ml-2 opacity-40 uppercase">g/kg</span></p>
              </div>
            </div>
          </aside>

          <section className="flex-grow bg
