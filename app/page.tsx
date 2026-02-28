'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const [result, setResult] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);

  // 确保仅在客户端运行，避免 Vercel SSR 报错
  useEffect(() => {
    setMounted(true);
    psychrolib.SetUnitSystem(psychrolib.SI);
  }, []);

  // 实时计算状态点
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

  // 生成背景相对湿度曲线 (RH 10% - 100%)
  const rhCurves = useMemo(() => {
    if (!mounted) return [];
    const curves = [];
    const rhs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const p = 101325;
    
    for (let currentRh of rhs) {
      const data = [];
      for (let temp = 0; temp <= 50; temp += 2) {
        const p_ws = psychrolib.GetSatVapPres(temp);
        const p_w = (currentRh / 100) * p_ws;
        const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000;
        data.push([temp, w]);
      }
      curves.push({
        name: `RH ${currentRh}%`,
        type: 'line',
        data: data,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 1, color: currentRh === 100 ? '#2563eb' : '#cbd5e1' },
        label: { show: temp === 50, position: 'end', formatter: `${currentRh}%`, fontSize: 10 }
      });
    }
    return curves;
  }, [mounted]);

  const option = {
    title: { text: '专业空气焓湿图 (101.325 kPa)', left: 'center' },
    grid: { right: '10%', bottom: '10%', left: '10%' },
    tooltip: { trigger: 'axis', formatter: (params: any) => `温度: ${params[0].value[0]}℃<br/>含湿量: ${params[0].value[1].toFixed(2)}g/kg` },
    xAxis: { name: '干球温度 (℃)', type: 'value', min: 0, max: 50, splitLine: { show: true } },
    yAxis: { name: '含湿量 (g/kg)', type: 'value', position: 'right', min: 0, max: 30, splitLine: { show: true } },
    series: [
      ...rhCurves,
      {
        name: '当前状态点',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 15,
        itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '当前状态', position: 'top', backgroundColor: '#fff', padding: [2, 4], borderRadius: 4, shadowBlur: 5, shadowColor: '#ccc' },
        zIndex: 10
      }
    ]
  };

  if (!mounted) return <div className="p-10 text-center">正在加载计算引擎...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">HVAC 智能焓湿计算终端</h1>
            <p className="opacity-80 text-sm">基于 Gemini 2.0 & PsychroLib</p>
          </div>
          <div className="text-right">
            <span className="text-xs bg-blue-800 px-2 py-1 rounded">LIVE MODE</span>
          </div>
        </div>
        
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-8">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-4 flex justify-between">
                <span>干球温度 (Dry Bulb)</span>
                <span className="text-blue-600 text-lg">{t} ℃</span>
              </label>
              <input type="range" min="0" max="50" step="0.5" value={t} onChange={e => setT(+e.target.value)} className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-4 flex justify-between">
                <span>相对湿度 (RH)</span>
                <span className="text-blue-600 text-lg">{rh} %</span>
              </label>
              <input type="range" min="0" max="100" value={rh} onChange={e => setRh(+e.target.value)} className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 text-center">
                <p className="text-xs opacity-80 uppercase tracking-widest mb-1">焓值 (Enthalpy)</p>
                <p className="text-3xl font-black">{result.h.toFixed(2)} <span className="text-sm font-normal">kJ/kg</span></p>
              </div>
              <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-200 text-center">
                <p className="text-xs opacity-80 uppercase tracking-widest mb-1">含湿量 (Humidity Ratio)</p>
                <p className="text-3xl font-black">{result.w.toFixed(2)} <span className="text-sm font-normal">g/kg</span></p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 h-[500px] bg-slate-50 rounded-2xl border border-slate-100 p-2">
             <ReactECharts option={option} style={{height: '100%', width: '100%'}} />
          </div>
        </div>
      </div>
      <p className="text-center mt-6 text-slate-400 text-xs">标准大气压: 101.325 kPa | 物理引擎: PsychroLib SI</p>
    </div>
  );
}