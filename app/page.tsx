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
        data: data,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: currentRh === 100 ? 2 : 1, color: currentRh === 100 ? '#2563eb' : '#e2e8f0' },
        label: {
          show: true,
          position: 'end',
          formatter: (p: any) => p.dataIndex === p.data.length - 1 ? `${currentRh}%` : '',
          fontSize: 10,
          color: '#94a3b8'
        }
      });
    }
    return curves;
  }, [mounted]);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (p: any) => `T: ${p[0].value[0]}℃<br/>W: ${p[0].value[1].toFixed(2)}g/kg`
    },
    grid: { top: '10%', right: '10%', bottom: '10%', left: '8%', containLabel: true },
    xAxis: { type: 'value', min: 0, max: 50, name: '℃', splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { type: 'value', position: 'right', min: 0, max: 30, name: 'g/kg', splitLine: { lineStyle: { type: 'dashed' } } },
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
      <div className="max-w-[1400px] mx-auto space-y-6">
        <header className="flex justify-between items-end border-b pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">HVAC PSYCHRO-HUB</h1>
            <p className="text-[10px] font-mono text-slate-400 uppercase">Pressure: 101.325 kPa</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
          </div>
        </header>

        <main className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-[350px] flex-shrink-0 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl border space-y-8">
              <div>
                <div className="flex justify-between text-xs font-bold mb-4">
                  <span>TEMP (DB)</span>
                  <span className="text-blue-600 text-lg">{t}℃</span>
                </div>
                <input type="range" min="0" max="50" step="0.5" value={t} onChange={(e) => setT(+e.target.value)} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-4">
                  <span>HUMIDITY (RH)</span>
                  <span className="text-blue-600 text-lg">{rh}%</span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={(e) => setRh(+e.target.value)} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
                <p className="text-[10px] font-bold opacity-50 mb-1">ENTHALPY (H)</p>
                <p className="text-3xl font-black">{result.h.toFixed(2)} <span className="text-xs font-normal opacity-40">kJ/kg</span></p>
              </div>
              <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
                <p className="text-[10px] font-bold opacity-50 mb-1">RATIO (W)</p>
                <p className="text-3xl font-black">{result.w.toFixed(2)} <span className="text-xs font-normal opacity-40">g/kg</span></p>
              </div>
            </div>
          </aside>

          <section className="flex-grow bg-white p-4 rounded-3xl shadow-2xl border min-h-[600px] flex items-center justify-center relative">
            <ReactECharts option={option} style={{ height: '650px', width: '100%' }} notMerge={true} />
            <div className="absolute bottom-8 right-8 text-slate-50 font-black text-6xl select-none pointer-events-none uppercase">101.3</div>
          </section>
        </main>

        <footer className="text-center text-[9px] font-mono text-slate-300 uppercase tracking-widest pt-8">
          Neural Ops // SI Unit // Gemini-2.0-Flash
        </footer>
      </div>
    </div>
  );
}
