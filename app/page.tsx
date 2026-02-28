'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const [result, setResult] = useState({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);

  // 1. 初始化计算引擎，确保仅在客户端运行
  useEffect(() => {
    setMounted(true);
    try {
      psychrolib.SetUnitSystem(psychrolib.SI);
    } catch (e) {
      console.error("初始化引擎失败:", e);
    }
  }, []);

  // 2. 核心物理计算逻辑
  useEffect(() => {
    if (!mounted) return;
    try {
      const p = 101325; // 标准大气压
      const p_ws = psychrolib.GetSatVapPres(t);
      const p_w = (rh / 100) * p_ws;
      const w = psychrolib.GetHumRatioFromVapPres(p_w, p) * 1000; // 单位转为 g/kg
      const h = psychrolib.GetMoistAirEnthalpy(t, w / 1000) / 1000; // 单位转为 kJ/kg
      setResult({ w, h });
    } catch (e) {
      console.error("计算过程错误:", e);
    }
  }, [t, rh, mounted]);

  // 3. 生成背景相对湿度曲线 (RH 10% - 100%)
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
        // 修正后的标签逻辑，只在曲线末尾显示百分比
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

  // 4. ECharts 配置对象
  const option = {
    title: { 
      text: '空气焓湿图 (Psychrometric Chart)', 
      left: 'center',
      textStyle: { color: '#1e293b', fontSize: 16 }
    },
    grid: { 
      top: '12%',
      right: '10%', 
      bottom: '10%', 
      left: '8%',
      containLabel: true 
    },
    tooltip: { 
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      formatter: (params: any) => {
        if (params.seriesName === '当前状态点') {
          return `<div style="padding:4px">
                    <b>当前状态</b><br/>
                    温度: ${params.value[0]} ℃<br/>
                    含湿量: ${params.value[1].toFixed(2)} g/kg
                  </div>`;
        }
        return params.seriesName;
      }
    },
    xAxis: { 
      name: '干球温度 (℃)', 
      type: 'value', 
      min: 0, 
      max: 50, 
      interval: 5,
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#e2e8f0' } } 
    },
    yAxis: { 
      name: '含湿量 (g/kg)', 
      type: 'value', 
      position: 'right', 
      min: 0, 
      max: 30, 
      interval: 5,
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#e2e8f0' } } 
    },
    series: [
      ...rhCurves,
      {
        name: '当前状态点',
        type: 'scatter',
        data: [[t, result.w]],
        symbolSize: 16,
        itemStyle: { 
          color: '#ef4444', 
          borderColor: '#fff', 
          borderWidth: 3,
          shadowBlur: 10,
          shadowColor: 'rgba(239, 68, 68, 0.5)' 
        },
        label: { 
          show: true, 
          formatter: '当前点', 
          position: 'top', 
          backgroundColor: '#ef4444', 
          color: '#fff',
          padding: [4, 8], 
          borderRadius: 4,
          fontSize: 12
        },
        zIndex: 100
      }
    ]
  };

  // 5. 渲染逻辑
  if (!mounted) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-lg font-medium text-slate-500 animate-pulse">正在初始化 HVAC 计算引擎...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200">
        
        {/* 页眉 */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">HVAC 智能焓湿计算终端</h1>
            <p className="opacity-70 text-sm mt-1">标准大气压: 101.325
