'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const [result, setResult] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);

  // 1. 初始化计算引擎
  useEffect(() => {
    setMounted(true);
    try {
      psychrolib.SetUnitSystem(psychrolib.SI);
    } catch (e) {
      console.error("初始化失败:", e);
    }
  }, []);

  // 2. 物理计算
  useEffect(() => {
    if (!mounted) return;
    try {
      const p = 101325; 
      const p_ws = psychrolib.GetSatVapPres(t);
      const p_w = (rh / 100) * p_ws;
      const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000; 
      const h = psychrolib.GetMoistAirEnthalpy(t, w / 1000) / 1000; 
      setResult({ w, h });
    } catch (e) {
      console.error("计算错误:", e);
    }
  }, [t, rh, mounted]);

  // 3. 构造背景曲线 (等相对湿度线)
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
          color: currentRh === 100 ? '#2563eb' : '#94a3b8'
        }
      });
    }
    return curves;
  }, [mounted]);

  // 4. ECharts 配置
  const option = {
    title: { text: '空气焓湿图 (Psychrometric Chart)', left: 'center', textStyle: { fontSize: 16 } },
    grid: { top: '15%', right: '10%', bottom: '10%', left: '8%', containLabel: true },
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => params.seriesName === '当前状态点' ? 
        `温度: ${params.value[0]}℃<br/>含湿量: ${params.value[1].toFixed(2)}g/kg` : params.seriesName
    },
    xAxis: { name: '干球温度 (℃)', type: 'value', min: 0, max: 50, splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { name: '含湿量 (g/kg)', type: 'value', position: 'right', min: 0, max: 30, splitLine: { lineStyle: { type: 'dashed' } } },
    series: [
      ...rhCurves,
      {
        name: '当前状态点',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 18,
        itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 3, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        label: { show: true, formatter: '当前状态', position: 'top', backgroundColor: '#ef4444', color: '#fff', padding: [4, 8], borderRadius: 4 },
        zIndex: 100
      }
    ]
  };

  if (!mounted) return <div className="flex h-screen items-center justify-center animate-pulse text-slate-500">初始化引擎中...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200">
        
        {/* 页眉 */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">HVAC 智能焓湿计算终端</h1>
            <p className="opacity-70 text-sm mt-1">标准大气压: 101.325 kPa | 物理引擎: PsychroLib SI</p>
          </div>
          <div className="hidden md:block bg-white/10 px-4 py-2 rounded-lg">
            <p className="text-xs opacity-60 uppercase font-bold">System Status</p>
            <p className="text-sm text-emerald-400 font-mono">● Operational</p>
          </div>
        </div>
        
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* 左侧控制 */}
          <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-2xl border shadow-inner">
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-bold text-slate-600">干球温度 (DB)</label>
                <span className="text-3xl font-light text-blue-600">{t}<small className="text-lg">℃</small></span>
              </div>
              <input type="range" min="0" max="50" step="0.5" value={t} onChange={e => setT(+e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border shadow-inner">
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-bold text-slate-600">相对湿度 (RH)</label>
                <span className="text-3xl font-light text-blue-600">{rh}<small className="text-lg">%</small></span>
              </div>
              <input type="range" min="0" max="100" step="1" value={rh} onChange={e => setRh(+e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-5 bg-blue-600 rounded-2xl text-white shadow-lg">
                <p className="text-xs opacity-70 uppercase mb-1">空气焓值 (Enthalpy)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{result.h.toFixed(2)}</span>
                  <span className="text-sm opacity-80 font-medium">kJ/kg</span>
                </div>
              </div>
              <div className="p-5 bg-emerald-500 rounded-2xl text-white shadow-lg">
                <p className="text-xs opacity-70 uppercase mb-1">含湿量 (Humidity Ratio)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{result.w.toFixed(2)}</span>
                  <span className="text-sm opacity-80 font-medium">g/kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧图表 */}
          <div className="lg:col-span-2 h-[500px] bg-white rounded-2xl border p-2 shadow-sm">
             <ReactECharts option={option} style={{height: '100%', width: '100%'}} notMerge={true} />
          </div>
        </div>
      </div>
      
      <div className="text-center mt-8 text-slate-400 text-[10px] uppercase tracking-widest">
        © 2026 HVAC OP-ASSISTANT | Powered by Gemini 2.0 Flash
      </div>
    </div>
  );
}
