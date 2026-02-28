'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const [result, setResult] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);

  // 1. 初始化引擎
  useEffect(() => {
    setMounted(true);
    try { psychrolib.SetUnitSystem(psychrolib.SI); } catch (e) { console.error(e); }
  }, []);

  // 2. 物理参数实时计算
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

  // 3. 构造等相对湿度线背景
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

  // 4. ECharts 3D 感看板配置
  const option = {
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#1e293b' } },
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [12, 16],
      formatter: (params: any) => {
        const db = params[0].value[0];
        const w = params[0].value[1].toFixed(2);
        return `<div style="min-width:120px"><b style="color:#1e40af">坐标读数</b><hr style="margin:8px 0;border:0;border-top:1px solid #eee" />温度: <b>${db} ℃</b><br/>含湿量: <b>${w} g/kg</b></div>`;
      }
    },
    grid: { top: '8%', right: '8%', bottom: '10%', left: '8%', containLabel: true },
    xAxis: { name: 'Temp ℃', type: 'value', min: 0, max: 50, axisLine: { lineStyle: { color: '#94a3b8' } }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    yAxis: { name: 'g/kg', type: 'value', position: 'right', min: 0, max: 30, axisLine: { lineStyle: { color: '#94a3b8' } }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [
      ...rhCurves,
      {
        name: '当前状态点',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 22,
        itemStyle: { color: '#f43f5e', borderColor: '#fff', borderWidth: 4, shadowBlur: 20, shadowColor: 'rgba(244, 63, 94, 0.6)' },
        label: { show: true, formatter: 'TARGET', position: 'right', backgroundColor: '#1e293b', color: '#fff', padding: [4, 8], borderRadius: 4, fontSize: 10, fontWeight: 'bold' },
        zIndex: 1000
      }
    ]
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 lg:p-10 font-sans text-slate-800">
      <div className="max-w-[1500px] mx-auto">
        
        {/* 专业顶部标题栏 */}
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
            <span className="text-xs font-bold text
