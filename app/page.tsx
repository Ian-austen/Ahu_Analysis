'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 类型与常量 ---
interface AHUState {
  id: string;
  r: { t: number; rh: number };
  aiPredict: number;
}

const AHUS: AHUState[] = [
  { id: 'AHU-01', r: { t: 24.5, rh: 55 }, aiPredict: 12 },
  { id: 'AHU-02', r: { t: 26.1, rh: 48 }, aiPredict: 45 },
  { id: 'AHU-03', r: { t: 23.8, rh: 62 }, aiPredict: 88 },
];

// --- 子组件：实时诊断页面 ---
const DiagnosticsView = ({ data }: { data: AHUState[] }) => {
  const getW = (t: number, rh: number) => {
    try {
      const p_ws = psychrolib.GetSatVapPres(t);
      return psychrolib.GetHumRatioFromVapPres((rh / 100) * p_ws, 101325) * 1000;
    } catch { return 0; }
  };

  const chartOption = {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 40, bottom: 40, left: 40 },
    xAxis: { type: 'value', min: 10, max: 40, splitLine: { lineStyle: { color: '#21262D' } } },
    yAxis: { type: 'value', min: 0, max: 20, position: 'right', splitLine: { lineStyle: { color: '#21262D' } } },
    series: data.map(ahu => ({
      name: ahu.id, type: 'scatter', 
      data: [[ahu.r.t, getW(ahu.r.t, ahu.r.rh)]],
      symbolSize: 15, itemStyle: { color: ahu.aiPredict > 70 ? '#F43F5E' : '#7B61FF', shadowBlur: 10, shadowColor: '#7B61FF' }
    }))
  };

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', height: 'calc(100vh - 90px)' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
        {data.map(ahu => (
          <div key={ahu.id} style={{ background: '#161B22', padding: '15px', borderRadius: '10px', border: ahu.aiPredict > 70 ? '1px solid #F43F5E' : '1px solid #30363D' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
              <span style={{ color: '#7B61FF' }}>{ahu.id}</span>
              <span style={{ color: ahu.aiPredict > 70 ? '#F43F5E' : '#36D399' }}>{ahu.aiPredict > 70 ? 'CRITICAL' : 'OPTIMAL'}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, margin: '10px 0' }}>{ahu.r.t.toFixed(1)}°C</div>
            <div style={{ height: '4px', background: '#30363D', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: ahu.aiPredict > 70 ? '#F43F5E' : '#7B61FF', width: `${ahu.aiPredict}%`, transition: 'width 1s ease' }} />
            </div>
          </div>
        ))}
      </aside>
      <div style={{ background: '#0D1117', borderRadius: '15px', border: '1px solid #30363D', padding: '20px' }}>
        <ReactECharts option={chartOption} style={{ height: '100%' }} />
      </div>
    </div>
  );
};

// --- 子组件：能流平衡页面 ---
const EnergyFlowView = ({ metrics }: { metrics: any }) => {
  const sankeyOption = {
    backgroundColor: 'transparent',
    series: [{
      type: 'sankey',
      layout: 'none',
      emphasis: { focus: 'adjacency' },
      data: [{ name: 'Cooling Plant' }, { name: 'Pumps' }, { name: 'Floor A' }, { name: 'Floor B' }, { name: 'Losses' }],
      links: [
        { source: 'Cooling Plant', target: 'Floor A', value: 25 },
        { source: 'Cooling Plant', target: 'Floor B', value: 15 },
        { source: 'Cooling Plant', target: 'Losses', value: 8 },
        { source: 'Pumps', target: 'Floor A', value: 3 },
        { source: 'Pumps', target: 'Floor B', value: 2 },
      ],
      lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.2 },
      label: { color: '#8B949E', fontSize: 10 }
    }]
  };

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <div style={{ fontSize: '10px', color: '#8B949E' }}>PLANT COP</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#36D399' }}>{metrics.chillerCOP}</div>
        </div>
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D' }}>
          <div style={{ fontSize: '10px', color: '#8B949E' }}>SYSTEM LOAD</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#7B61FF' }}>{metrics.totalLoad} kW</div>
        </div>
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #7B61FF' }}>
          <div style={{ fontSize: '10px', color: '#7B61FF', fontWeight: 'bold' }}>ANNUAL SAVING</div>
          <div style={{ fontSize: '32px', fontWeight: 900 }}>{metrics.savingPotential}%</div>
        </div>
      </div>
      <div style={{ flex: 1, background: '#0D1117', borderRadius: '15px', border: '1px solid #30363D', padding: '20px' }}>
        <ReactECharts option={sankeyOption} style={{ height: '100%' }} />
      </div>
    </div>
  );
};

// --- 主页面 ---
export default function MainApp() {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'energy'>('diagnostics');
  const [mounted, setMounted] = useState(false);
  const [data, setData
