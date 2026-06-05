import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
  } from 'chart.js';
  import { Line } from 'react-chartjs-2';
  import ChartCard from './ChartCard';
  
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);
  
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
        },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 100,
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
    },
  };
  
  function LineChartCard({ data, options, ...cardProps }) {
    return (
      <ChartCard {...cardProps}>
        <Line data={data} options={{ ...defaultOptions, ...options }} />
      </ChartCard>
    );
  }
  
  export default LineChartCard;