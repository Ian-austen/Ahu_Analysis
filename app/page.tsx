'use client';
import { useState } from 'react';
import { calculateState } from '../lib/psychrometrics';
import ReactECharts from 'echarts-for-react';

export default function Home() {
  const [t, setT] = useState(25);
  const [rh, setRh] = useState(50);
  const state = calculateState(t, rh);

  const option = {
    title: { text: '实时焓湿状态' },
    xAxis: { name: '干球温度 ℃', min: 0, max: 50 },
    yAxis: { name: '含湿量 g/kg', position: 'right', min: 0, max: 30 },
    series: [{
      type: 'scatter',
      data: [[t, state.w]],
      symbolSize: 20,
      itemStyle: { color: '#ef4444' }
    }]
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">HVAC 焓湿图在线调试版</h1>
      <div className="grid grid-cols-2 gap-8 bg-slate-50 p-6 rounded-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm">温度: {t} ℃</label>
            <input type="range" min="0" max="50" value={t} onChange={e => setT(+e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="block text-sm">湿度: {rh} %</label>
            <input type="range" min="0" max="100" value={rh} onChange={e => setRh(+e.target.value)} className="w-full" />
          </div>
          <div className="pt-4 border-t text-sm space-y-2">
            <p>焓值: <span className="font-bold text-blue-600">{state.h.toFixed(2)} kJ/kg</span></p>
            <p>含湿量: <span className="font-bold text-green-600">{state.w.toFixed(2)} g/kg</span></p>
          </div>
        </div>
        <div className="h-64 bg-white border rounded shadow-inner">
          <ReactECharts option={option} style={{height: '100%'}} />
        </div>
      </div>
    </div>
  );

}
