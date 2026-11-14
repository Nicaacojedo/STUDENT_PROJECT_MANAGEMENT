import { ChartConfiguration, ChartType } from 'chart.js';

export const CHART_COLORS = [
  '#24498f',
  '#3b82f6',
  '#0f766e',
  '#d97706',
  '#b91c1c',
  '#7c3aed',
  '#db2777',
  '#0891b2',
];

export const STATUS_COLORS: Record<string, string> = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  'For Review': '#7c3aed',
  Completed: '#16a34a',
  Overdue: '#dc2626',
  Planning: '#94a3b8',
  'Revision Required': '#d97706',
  Archived: '#64748b',
  Low: '#94a3b8',
  Medium: '#3b82f6',
  High: '#d97706',
  Urgent: '#dc2626',
};

export function baseOptions(extra: Record<string, unknown> = {}): ChartConfiguration['options'] {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 16,
          color: '#5b6478',
          font: { size: 11, family: 'Inter' },
        },
      },
      tooltip: {
        backgroundColor: '#14244a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12, family: 'Inter' },
        bodyFont: { size: 12, family: 'Inter' },
      },
    },
    ...extra,
  };
}

export function doughnutConfig(labels: string[], values: number[], colors?: string[]): {
  type: ChartType;
  data: ChartConfiguration['data'];
  options: ChartConfiguration['options'];
} {
  return {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors || labels.map((label) => STATUS_COLORS[label] || CHART_COLORS[labels.indexOf(label) % CHART_COLORS.length]),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: baseOptions({ cutout: '68%' }),
  };
}

export function barConfig(
  labels: string[],
  values: number[],
  label: string,
  color = '#24498f',
  horizontal = false,
): {
  type: ChartType;
  data: ChartConfiguration['data'];
  options: ChartConfiguration['options'];
} {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: color,
          borderRadius: 6,
          maxBarThickness: 38,
        },
      ],
    },
    options: baseOptions({
      indexAxis: horizontal ? 'y' : 'x',
      legend: { display: false },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: horizontal, color: '#eef1f6' },
          ticks: { color: '#7b8598', font: { size: 10.5 } },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { display: !horizontal, color: '#eef1f6' },
          ticks: { color: '#7b8598', font: { size: 10.5 }, precision: 0 },
          border: { display: false },
        },
      },
    }),
  };
}

export function lineConfig(
  labels: string[],
  values: number[],
  label: string,
): {
  type: ChartType;
  data: ChartConfiguration['data'];
  options: ChartConfiguration['options'];
} {
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: '#24498f',
          backgroundColor: 'rgba(36, 73, 143, 0.10)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#24498f',
          borderWidth: 2,
        },
      ],
    },
    options: baseOptions({
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#7b8598', font: { size: 10.5 } },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#eef1f6' },
          ticks: { color: '#7b8598', font: { size: 10.5 }, precision: 0 },
          border: { display: false },
        },
      },
    }),
  };
}

export function multiBarConfig(
  labels: string[],
  series: { label: string; values: number[]; color: string }[],
): {
  type: ChartType;
  data: ChartConfiguration['data'];
  options: ChartConfiguration['options'];
} {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: series.map((item) => ({
        label: item.label,
        data: item.values,
        backgroundColor: item.color,
        borderRadius: 6,
        maxBarThickness: 28,
      })),
    },
    options: baseOptions({
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#7b8598', font: { size: 10.5 } },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#eef1f6' },
          ticks: { color: '#7b8598', font: { size: 10.5 }, precision: 0 },
          border: { display: false },
        },
      },
    }),
  };
}
