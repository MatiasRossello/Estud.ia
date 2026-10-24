import { useEffect, useState } from 'react'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Filler)

function readTheme() {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    s1: v('--series-1'),
    s2: v('--series-2'),
    grid: v('--grid'),
    text: v('--text-2'),
    surface: v('--surface'),
  }
}

function useTheme() {
  const [theme, setTheme] = useState(readTheme)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setTheme(readTheme())
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return theme
}

function baseOptions(t: ReturnType<typeof readTheme>, yMax?: number, ySuffix = ''): ChartOptions<'line' | 'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (c) => ` ${c.dataset.label}: ${c.formattedValue}${ySuffix}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.text, font: { family: 'Atkinson Hyperlegible Next, system-ui' } }, border: { color: t.grid } },
      y: {
        min: 0,
        max: yMax,
        ticks: { color: t.text, precision: 0, callback: (v) => `${v}${ySuffix}` },
        grid: { color: t.grid },
        border: { display: false },
      },
    },
  }
}

/** Primer intento vs. resultado final (después de repasar las falladas) en cada sesión. */
export function SessionsChart({ labels, first, final }: { labels: string[]; first: number[]; final: number[] }) {
  const t = useTheme()
  const point = { pointRadius: 4, pointHoverRadius: 6, pointBorderWidth: 2, pointBorderColor: t.surface, borderWidth: 2 }
  return (
    <>
      <div className="legend">
        <span><i style={{ background: t.s1 }} />Primer intento</span>
        <span><i style={{ background: t.s2 }} />Después de repasar</span>
      </div>
      <div className="chart-box">
        <Line
          aria-label="Gráfico de progreso por sesión"
          options={baseOptions(t, 100, '%') as ChartOptions<'line'>}
          data={{
            labels,
            datasets: [
              { label: 'Primer intento', data: first, borderColor: t.s1, backgroundColor: t.s1, ...point },
              { label: 'Después de repasar', data: final, borderColor: t.s2, backgroundColor: t.s2, ...point },
            ],
          }}
        />
      </div>
    </>
  )
}

/** Preguntas acertadas acumuladas al terminar cada ronda de una sesión. */
export function RoundsChart({ labels, values, total }: { labels: string[]; values: number[]; total: number }) {
  const t = useTheme()
  return (
    <div className="chart-box" style={{ height: 220 }}>
      <Bar
        aria-label="Gráfico de respuestas correctas por ronda"
        options={baseOptions(t, total) as ChartOptions<'bar'>}
        data={{
          labels,
          datasets: [
            {
              label: 'Correctas acumuladas',
              data: values,
              backgroundColor: t.s1,
              borderRadius: { topLeft: 4, topRight: 4 },
              borderSkipped: 'bottom',
              maxBarThickness: 56,
            },
          ],
        }}
      />
    </div>
  )
}
