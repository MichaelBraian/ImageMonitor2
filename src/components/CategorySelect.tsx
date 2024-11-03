import React from 'react';
import { useCategories } from '../hooks/useCategories';
import { Loader2 } from 'lucide-react';

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  className?: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange, className = '' }) => {
  const { categories, loading } = useCategories();
  const defaultGroups = ['Before', 'After', 'Unsorted'];

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading categories...</span>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
    >
      <optgroup label="Default Categories">
        {defaultGroups.map(group => (
          <option key={group} value={group}>{group}</option>
        ))}
      </optgroup>
      {categories.length > 0 && (
        <optgroup label="Custom Categories">
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
};

export default CategorySelect;