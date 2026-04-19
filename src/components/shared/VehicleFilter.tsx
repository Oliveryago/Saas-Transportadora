import React from 'react';
import { Truck } from 'lucide-react';
import { useVehicles } from '../../hooks/useVehicles';

interface VehicleFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  showIcon?: boolean;
}

const VehicleFilter: React.FC<VehicleFilterProps> = ({ 
  value, 
  onChange, 
  className = "",
  showIcon = true 
}) => {
  const { vehicles, loading } = useVehicles();

  return (
    <div className={`relative flex items-center ${className}`}>
      {showIcon && (
        <Truck className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className={`
          appearance-none bg-white border border-gray-300 rounded-lg 
          ${showIcon ? 'pl-10' : 'pl-3'} pr-10 py-2 text-sm font-medium 
          text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 
          focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto
        `}
      >
        <option value="">Todos os Veículos</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.license_plate} - {v.model}
          </option>
        ))}
      </select>
      <div className="absolute right-3 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default VehicleFilter;
