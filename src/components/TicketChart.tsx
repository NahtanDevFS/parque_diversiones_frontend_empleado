import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type TicketChartProps = {
  data: { [date: string]: number };
};

const TicketChart = ({ data }: TicketChartProps) => {
  const labels = Object.keys(data);
  const datasetData = Object.values(data);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ingresos Totales',
        data: datasetData,
        backgroundColor: 'rgba(255, 115, 0, 1)',
        borderColor: 'rgba(255, 115, 0, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <Bar data={chartData} width={900} height={450} />
    </div>
  );
};

export default TicketChart;