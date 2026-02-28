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
      const safeT = Math.max(0, Math.min(50, t));
      const safeRh = Math.max(0.1, Math.min(100, rh));
      const p_ws = psychrolib.GetSatVapPres(safeT);
      const p_w = (safeRh / 100) * p_ws;
      const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
      const h = psychrolib.GetMoistAirEnthalpy(safeT, w / 1000) / 1000;
      setResult({ w, h });
    } catch (e) { console.error(e); }
  }, [t, rh, mounted]);

  const rhCurves = useMemo(() => {
    if (!mounted) return [];
    const curves = [];
    const rhs = [10, 30, 50, 70, 90, 100];
    const p = 101325;
    for (const curRh of rhs) {
      const data = [];
      for (let i = 0; i <= 50; i += 2) {
        const p_ws = psychrolib.GetSatVapPres(i);
        const p_w = (curRh / 100) * p_ws;
        const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
        data.push([i, w]);
      }
      curves.push({
        name: `RH ${curRh}%`,
        type: 'line',
        data: data,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: curRh === 100 ? 2 : 1, color: curRh === 100 ? '#2563eb' : '#cbd5e1' },
        label: {
          show: true,
          position: 'end',
          formatter: (p: any) => p.dataIndex === p.data.length - 1 ? `${curRh}%` : '',
          fontSize: 10,
          color: '#94a3b8'
        }
      });
    }
    return curves;
  }, [mounted]);

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { top: '10%', right: '10%', bottom: '10%', left: '8%', containLabel: true },
    xAxis: { type: 'value', min: 0, max: 50, name: '℃' },
    yAxis: { type: 'value', position: 'right', min: 0, max: 30, name: 'g/kg' },
    series: [
      ...rhCurves,
      {
        name: 'Target',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 18,
        itemStyle: { color: '#f43f5e', borderColor: '#fff', borderWidth: 3 },
        zIndex: 100
      }
    ]
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">HVAC HUB</h1>
          <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live
          </div>
        </header>

        <main className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-80 space-y-4 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">TEMP: {t}℃</label>
                <input type="range" min="0" max="50" step="0.5" value={t} onChange={e => setT(+e.target.value)} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">HUMIDITY: {rh}%</label>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-slate-900 p-5 rounded-2xl text-white">
                <p className="text-[10px] opacity-50 font-bold">ENTHALPY</p>
                <p className="text-2xl font-black">{result.h.toFixed(2)} <span className="text-xs font-normal opacity-40">kJ/kg</span></p>
              </div>
              <div className="bg-blue-600 p-5 rounded-2xl text-white">
                <p className="text-[10px] opacity-50 font-bold">RATIO</p>
                <p className="text-2xl font-black">{result.w.toFixed(2)} <span className="text-xs font-normal opacity-40">g/kg</span></p>
              </div>
            </div>
          </aside>

          <section className="flex-grow bg-white p-4 rounded-3xl shadow-sm border min-h-[600px] relative">
            <ReactECharts option={option} style={{ height: '650px', width: '100%' }} notMerge={true} />
            <div className="absolute bottom-6 right-6 text-slate-100 font-black text-6xl pointer-events-none select-none">101.3</div>
          </section>
        </main>
      </div>
    </div>
  );
}
