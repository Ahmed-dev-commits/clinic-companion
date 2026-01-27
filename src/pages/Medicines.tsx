import { useState } from 'react';
import { useStock } from '@/hooks/useStock';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Pill, AlertTriangle, Package, RefreshCw, Loader2 } from 'lucide-react';
import { StockItem } from '@/types/hospital';
import { ConnectionStatus } from '@/components/ConnectionStatus';

const CATEGORIES = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Liquid', 'Cream', 'Supplies', 'Equipment', 'Other'];

export function MedicinesPage() {
  const { stock, loading, getLowStockItems, refetch } = useStock();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedMedicine, setSelectedMedicine] = useState<StockItem | null>(null);

  const lowStockItems = getLowStockItems();

  // Filter medicines - only show when 3+ characters typed or no search
  const filteredMedicines = stock.filter((item) => {
    const matchesSearch = searchQuery.length < 3 || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Show hint when typing less than 3 characters
  const showSearchHint = searchQuery.length > 0 && searchQuery.length < 3;

  // Stats
  const totalMedicines = stock.length;
  const totalCategories = new Set(stock.map(s => s.category)).size;
  const totalValue = stock.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div>
      <PageHeader
        title="Medicines"
        description="View and search available medicines from pharmacy"
        action={
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMedicines}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <span className="text-sm font-medium text-muted-foreground">Rs.</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicine (type 3+ characters)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search hint */}
      {showSearchHint && (
        <p className="text-sm text-muted-foreground mb-4">
          Type {3 - searchQuery.length} more character{3 - searchQuery.length !== 1 ? 's' : ''} to search...
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Medicines Table */}
        <div className="lg:col-span-2">
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Price (Rs.)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredMedicines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchQuery.length >= 3 
                        ? `No medicines found for "${searchQuery}"`
                        : 'No medicines available'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedicines.map((item) => {
                    const isLowStock = item.quantity <= item.lowStockThreshold;
                    const isSelected = selectedMedicine?.id === item.id;
                    return (
                      <TableRow 
                        key={item.id}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                        onClick={() => setSelectedMedicine(item)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Pill className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${isLowStock ? 'text-destructive' : ''}`}>
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">Rs. {item.price}</TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Low Stock
                            </span>
                          ) : (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-0">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Medicine Details Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medicine Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMedicine ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Pill className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedMedicine.name}</h3>
                      <Badge variant="outline">{selectedMedicine.category}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Item ID</p>
                      <p className="font-mono text-sm">{selectedMedicine.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                      <p className="text-sm font-medium">{selectedMedicine.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Stock</p>
                      <p className={`text-lg font-bold ${selectedMedicine.quantity <= selectedMedicine.lowStockThreshold ? 'text-destructive' : 'text-green-600'}`}>
                        {selectedMedicine.quantity} units
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Unit Price</p>
                      <p className="text-lg font-bold">Rs. {selectedMedicine.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Low Stock Alert</p>
                      <p className="text-sm">{selectedMedicine.lowStockThreshold} units</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
                      <p className="text-sm font-medium">Rs. {(selectedMedicine.price * selectedMedicine.quantity).toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedMedicine.quantity <= selectedMedicine.lowStockThreshold && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Low Stock Warning</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Stock is below the threshold of {selectedMedicine.lowStockThreshold} units. Please reorder soon.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Pill className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a medicine to view details</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Items Quick View */}
          {lowStockItems.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Low Stock Alert ({lowStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                      onClick={() => setSelectedMedicine(item)}
                    >
                      <span className="text-sm font-medium truncate">{item.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        {item.quantity} left
                      </Badge>
                    </div>
                  ))}
                  {lowStockItems.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{lowStockItems.length - 5} more items
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
