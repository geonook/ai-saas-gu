'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export const SearchBar = ({ 
  query, 
  onQueryChange, 
  onSearch, 
  isLoading = false 
}: SearchBarProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="flex gap-3 mb-1">
      <Input
        type="text"
        placeholder="輸入要爬取的 Youtube 影片關鍵字"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyPress={handleKeyPress}
        className="max-w-xs w-full"
        disabled={isLoading}
      />
      <Button 
        onClick={onSearch} 
        disabled={isLoading || !query.trim()}
        className="flex items-center gap-2"
      >
        <Search className="h-4 w-4" />
        開始爬取資料
      </Button>
    </div>
  );
};