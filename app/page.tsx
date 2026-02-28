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
          width: currentRh === 100 ? 2 : 1, 
          color: currentRh === 100 ? '#2563eb' : '#cbd5e1',
          opacity: currentRh === 100 ? 1 : 0.6
        },
        label: { 
          show: true, 
          position: 'end', 
          formatter: (params: any) => params.dataIndex === data.length - 1 ? `${currentRh}%` : '',
          fontSize: 10,
          color: '#94a3b8'
        }
      });
    }
    return curves;
  }, [mounted]);

  const option = {
    backgroundColor: 'transparent',
    title: { text: 'Psychrometric Chart', left: 'center', textStyle: { fontSize: 14, color: '#64748b' } },
    grid: { top: '10%', right: '8%', bottom: '8%', left: '8%', containLabel: true },
    tooltip: { 
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      formatter: (p: any) => p.seriesName === '当前状态点' ? `T: ${p.value[0]}℃<br/>W: ${p.value[1].toFixed(2)}g/kg` : p.seriesName
    },
    xAxis: { name: 'DB Temp (℃)', type: 'value', min: 0, max: 50, splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } } },
    yAxis: { name: 'Humidity Ratio (g/kg)', type: 'value', position: 'right', min: 0, max: 30, splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } } },
    series: [
      ...rhCurves,
      {
        name: '当前状态点',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 20,
        itemStyle: { color: '#f43f5e', borderColor: '#fff', borderWidth: 4, shadowBlur: 15, shadowColor: 'rgba(244, 63, 94, 0.4)' },
        label: { show: true, formatter: 'CURRENT', position: 'top', backgroundColor: '#f43f5e', color: '#fff', padding: [4, 8], borderRadius: 4, fontSize: 11 },
        zIndex: 100
      }
    ]
  };

  if (!mounted) return <div className="h-screen flex items-center justify-center text-slate-400">Loading Engineering Engine...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* 顶部导航栏 - Flex 布局优化 */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">HVAC 智能焓湿计算终端</h1>
            <p className="text-slate-400 text-sm font-medium">101.325 kPa | PsychroLib® SI Edition</p>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
            <span className="text-emerald-700 text-sm font-bold tracking-widest uppercase">System Operational</span>
          </div>
        </header>

        {/* 主交互区 - Grid 布局优化 */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左侧：控制与数据展示 (占 4/12) */}
          <section className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-10">
              {/* 滑块 1 */}
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">干球温度 (Dry Bulb)</span>
                  <span className="text-4xl font-light text-slate-800">{t}<small className="text-lg ml-1 font-medium">℃</small></span>
                </div>
                <input type="range" min="0" max="50" step="0.1" value={t} onChange={e => setT(+e.target.value)} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>

              {/* 滑块 2 */}
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">相对湿度 (RH)</span>
                  <span className="text-4xl font-light text-slate-800">{rh}<small className="text-lg ml-1 font-medium">%</small></span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            </div>

            {/* 数据卡片并排显示 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-100">
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-tighter mb-1">Enthalpy (h)</p>
                <p className="text-3xl font-black italic">{result.h.toFixed(2)}<span className="text-xs ml-1 not-italic opacity-80">kJ/kg</span></p>
              </div>
              <div className="bg-slate-800 p-6 rounded-3xl text-white shadow-lg shadow-slate-200">
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-tighter mb-1">Humid Ratio (w)</p>
                <p className="text-3xl font-black italic">{result.w.toFixed(2)}<span className="text-xs ml-1 not-italic opacity-80">g/kg</span></p>
              </div>
            </div>
          </section>

          {/* 右侧：大型焓湿图 (占 8/12) */}
          <section className="lg:col-span-8 bg-white p-4 rounded-3xl shadow-sm border border-slate-200 min-h-[650px] flex items-center justify-center">
             <ReactECharts 
               option={option} 
               style={{ height: '600px', width: '100%' }} // 强制 600px 高度
               notMerge={true} 
             />
          </section>
        </main>

        <footer className="py-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] gap-4">
          <p>© 2026 HVAC OP-ASSISTANT | ENGINEERING READY</p>
          <div className="flex gap-6">
            <span className="text-blue-500">Node: Gemini-2.0-Flash</span>
            <span>Vercel Edge Network</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
