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

  // 背景等相对湿度线
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
          color: currentRh === 100 ? '#3b82f6' : '#e2e8f0',
        },
        emphasis: { lineStyle: { width: 4, color: '#60a5fa' } },
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
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#1e293b' } },
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#334155', fontSize: 13 },
      formatter: (params: any) => {
        const point = params.find((p: any) => p.seriesName === '当前状态点');
        const db = params[0].value[0];
        const w = params[0].value[1].toFixed(2);
        return `
          <div style="box-shadow: 0 4px 12px rgba(0,0,0,0.1)">
            <b style="color:#1e40af; font-size:14px">坐标读数</b><br/>
            <hr style="margin: 8px 0; border:0; border-top:1px solid #eee" />
            干球温度: <b style="float:right; margin-left:15px">${db} ℃</b><br/>
            含湿量: <b style="float:right; margin-left:15px">${w} g/kg</b>
          </div>
        `;
      }
    },
    grid: { top: '8%', right: '10%', bottom: '10%', left: '8%', containLabel: true },
    xAxis: { 
      name: 'Temp ℃', 
      type: 'value', 
      min: 0, max: 50,
      axisLine: { lineStyle: { color: '#94a3b8' } },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    yAxis: { 
      name: 'g/kg', 
      type: 'value', 
      position: 'right', 
      min: 0, max: 30,
      axisLine: { lineStyle: { color: '#94a3b8' } },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [
      ...rhCurves,
      {
        name: '当前状态点',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 22,
        itemStyle: { 
          color: '#f43f5e', 
          borderColor: '#fff', 
          borderWidth: 4, 
          shadowBlur: 20, 
          shadowColor: 'rgba(244, 63, 94, 0.6)' 
        },
        label: { 
          show: true, 
          formatter: 'TARGET', 
          position: 'right', 
          backgroundColor: '#1e293b', 
          color: '#fff', 
          padding: [4, 8], 
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 'bold'
        },
        zIndex: 1000
      }
    ]
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 lg:p-10 font-sans text-slate-800">
      <div className="max-w-[1500px] mx-auto overflow-hidden">
        
        {/* 玻璃感顶部 */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-300 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-blue-600 text-white p-2 rounded-lg shadow-lg shadow-blue-200 text-xl font-serif">P</span>
              HVAC PSYCHROMETRIC HUB
            </h1>
            <p className="text-slate-500 font-mono text-xs mt-2 uppercase tracking-widest">Atmospheric Pressure: 101.325 kPa</p>
          </div>
          <div className="flex gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-2"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Engine Ready</span>
          </div>
        </header>

        <main className="flex flex-col lg:flex-row gap-8 items-stretch">
          
          {/* 左侧控制区 (拟物化设计) */}
          <aside className="lg:w-[400px] space-y-6 flex-shrink-0">
            <div className="bg-white/70 backdrop-blur-md p-8 rounded-[2rem] border border-white shadow-2xl shadow-slate-200 space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-6xl">AIR</div>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="bg-slate-100 px-3 py-1 rounded text-[10px] font-black text-slate-500 uppercase">Dry Bulb Temp</span>
                  <span className="text-4xl font-mono font-bold text-blue-700">{t.toFixed(1)}<small className="text-sm italic ml-1">℃</small></span>
                </div>
                <input type="range" min="0" max="50" step="0.1" value={t} onChange={e => setT(+e.target.value)} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all" />
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="bg-slate-100 px-3 py-1 rounded text-[10px] font-black text-slate-500 uppercase">Relative Humidity</span>
                  <span className="text-4xl font-mono font-bold text-blue-700">{rh}<small className="text-sm italic ml-1">%</small></span>
                </div>
                <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all" />
              </div>
            </div>

            {/* 数据结果卡片 (3D 悬浮感) */}
            <div className="space-y-4">
              <div className="group bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all">
                <div className="flex justify-between items-start mb-2 text-blue-200 text-[10px] font-black uppercase tracking-widest">
                  <span>Enthalpy (h)</span>
                  <svg className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="text-4xl font-black">{result.h.toFixed(2)} <span className="text-sm font-normal opacity-60 ml-1">kJ/kg</span></div>
              </div>

              <div className="group bg-white p-6 rounded-[2rem] text-slate-800 border border-slate-100 shadow-xl shadow-slate-200 hover:-translate-y-1 transition-all">
                <div className="flex justify-between items-start mb-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <span>Humid Ratio (w)</span>
                  <svg className="h-4 w-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <div className="text-4xl font-black text-slate-700">{result.w.toFixed(2)} <span className="text-sm font-normal opacity-40 ml-1">g/kg</span></div>
              </div>
            </div>
          </aside>

          {/* 右侧：大型 3D 渲染感图表容器 */}
          <section className="flex-grow bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-slate-300 border border-white relative">
             {/* 装饰
