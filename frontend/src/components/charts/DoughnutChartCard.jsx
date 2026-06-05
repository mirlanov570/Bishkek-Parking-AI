import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import ChartCard from './ChartCard';

ChartJS.register(ArcElement, Tooltip, Legend);

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
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
};

function DoughnutChartCard({ data, options, ...cardProps }) {
  return (
    <ChartCard {...cardProps}>
      <Doughnut data={data} options={{ ...defaultOptions, ...options }} />
    </ChartCard>
  );
}

export default DoughnutChartCard;