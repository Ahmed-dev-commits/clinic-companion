import { useState, useMemo } from 'react';
import { useAccessPatients } from '@/hooks/useAccessPatients';
import { usePayments } from '@/hooks/usePayments';
import { usePatientServices } from '@/hooks/usePatientServices';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, RefreshCw, FileText, CreditCard, CalendarIcon, X } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ServicesState, PatientServices } from '@/types/services';
import { Payment } from '@/types/hospital';
import { ServiceReceiptDialog } from '@/components/fees/ServiceReceiptDialog';
import { PaymentReceiptDialog } from '@/components/fees/PaymentReceiptDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export function FeesPage() {
  const { patients } = useAccessPatients();
  const { payments, loading, refetch } = usePayments();
  const { services: patientServices, loading: servicesLoading, refetch: refetchServices } = usePatientServices();
  const [activeTab, setActiveTab] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [quickFilter, setQuickFilter] = useState<string>('');

  // Receipt dialog states
  const [selectedService, setSelectedService] = useState<PatientServices | null>(null);
  const [serviceReceiptOpen, setServiceReceiptOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentReceiptOpen, setPaymentReceiptOpen] = useState(false);

  // Filter function for date range
  const isInDateRange = (dateString: string) => {
    if (!startDate && !endDate) return true;
    const recordDate = new Date(dateString);
    if (startDate && endDate) {
      return isWithinInterval(recordDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
    }
    if (startDate) return recordDate >= startOfDay(startDate);
    if (endDate) return recordDate <= endOfDay(endDate);
    return true;
  };

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setQuickFilter('');
  };

  const handleQuickFilter = (value: string) => {
    setQuickFilter(value);
    const today = new Date();
    
    switch (value) {
      case 'today':
        setStartDate(startOfDay(today));
        setEndDate(endOfDay(today));
        break;
      case 'last7days':
        setStartDate(startOfDay(subDays(today, 6)));
        setEndDate(endOfDay(today));
        break;
      case 'week':
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      default:
        setStartDate(undefined);
        setEndDate(undefined);
    }
  };

  const handleManualDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    setQuickFilter(''); // Clear quick filter when manually selecting dates
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  // Merged records for "All" tab with date filtering
  const mergedRecords = useMemo(() => {
    const paymentRecords = payments
      .filter(p => isInDateRange(p.createdAt))
      .map(p => ({
        type: 'payment' as const,
        id: p.id,
        patientId: p.patientId,
        patientName: p.patientName,
        amount: p.totalAmount,
        date: p.createdAt,
        data: p
      }));

    const serviceRecords = patientServices
      .filter(s => isInDateRange(s.createdAt))
      .map(s => {
        const patient = patients.find(p => p.id === s.patientId);
        return {
          type: 'service' as const,
          id: s.id,
          patientId: s.patientId,
          patientName: patient?.name || s.patientId,
          amount: s.grandTotal,
          date: s.createdAt,
          data: s
        };
      });

    return [...paymentRecords, ...serviceRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, patientServices, patients, startDate, endDate]);

  // Filtered payments for Payments tab
  const filteredPayments = useMemo(() => 
    payments.filter(p => isInDateRange(p.createdAt)), 
    [payments, startDate, endDate]
  );

  // Filtered services for Services tab
  const filteredServices = useMemo(() => 
    patientServices.filter(s => isInDateRange(s.createdAt)), 
    [patientServices, startDate, endDate]
  );

  // Today's totals (from filtered records)
  const filteredTotal = useMemo(() => {
    const paymentTotal = filteredPayments.reduce((sum, p) => sum + p.totalAmount, 0);
    const serviceTotal = filteredServices.reduce((sum, s) => sum + s.grandTotal, 0);
    return paymentTotal + serviceTotal;
  }, [filteredPayments, filteredServices]);

  const handleViewPaymentReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentReceiptOpen(true);
  };

  const handleViewServiceReceipt = (service: PatientServices) => {
    setSelectedService(service);
    setServiceReceiptOpen(true);
  };

  const getEnabledServices = (servicesData: ServicesState): string[] => {
    const enabled: string[] = [];
    if (servicesData?.consultation?.enabled) enabled.push('Consultation');
    if (servicesData?.ultrasound?.enabled) enabled.push('Ultrasound');
    if (servicesData?.ecg?.enabled) enabled.push('ECG');
    if (servicesData?.bpReading?.enabled) enabled.push('BP');
    if (servicesData?.injection?.enabled) enabled.push('Injection');
    if (servicesData?.retention?.enabled) enabled.push('Retention');
    if (servicesData?.surgery?.enabled) enabled.push('Surgery');
    if (servicesData?.feeCollection?.labFee > 0) enabled.push('Lab Fee');
    if (servicesData?.feeCollection?.medicines?.length > 0) enabled.push('Medicines');
    return enabled;
  };

  return (
    <div>
      <PageHeader
        title="Transaction Section"
        description="View and manage all transaction records"
        action={
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <Button variant="outline" size="icon" onClick={() => { refetch(); refetchServices(); }} disabled={loading || servicesLoading}>
              <RefreshCw className={`h-4 w-4 ${(loading || servicesLoading) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Quick filters:</span>
              <ToggleGroup type="single" value={quickFilter} onValueChange={handleQuickFilter}>
                <ToggleGroupItem value="today" aria-label="Today" className="text-xs px-3">
                  Today
                </ToggleGroupItem>
                <ToggleGroupItem value="last7days" aria-label="Last 7 Days" className="text-xs px-3">
                  Last 7 Days
                </ToggleGroupItem>
                <ToggleGroupItem value="week" aria-label="This Week" className="text-xs px-3">
                  This Week
                </ToggleGroupItem>
                <ToggleGroupItem value="month" aria-label="This Month" className="text-xs px-3">
                  This Month
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Custom:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM dd, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => handleManualDateChange('start', date)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={(date) => handleManualDateChange('end', date)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(startDate || endDate) && (
                <Button variant="ghost" size="icon" onClick={clearDateFilter} title="Clear filter">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {startDate || endDate ? 'Filtered Total' : "Today's Collection"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Rs. {filteredTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredServices.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* All Records with Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Transaction Records</CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { refetch(); refetchServices(); }}
              disabled={loading || servicesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${(loading || servicesLoading) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="all" className="text-xs">
                All ({mergedRecords.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1 text-xs">
                <CreditCard className="h-3 w-3" />
                Payments ({filteredPayments.length})
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-1 text-xs">
                <FileText className="h-3 w-3" />
                Services ({filteredServices.length})
              </TabsTrigger>
            </TabsList>

            {/* All Records Tab */}
            <TabsContent value="all" className="space-y-3 max-h-[500px] overflow-y-auto">
              {mergedRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No records found</p>
              ) : (
                mergedRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={record.type === 'payment' ? 'default' : 'secondary'} className="text-xs">
                          {record.type === 'payment' ? 'Payment' : 'Service'}
                        </Badge>
                        <span className="font-medium truncate">{record.patientName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.date), 'MMM dd, yyyy HH:mm')}
                      </p>
                      {record.type === 'service' && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(() => {
                            const svc = (record.data as PatientServices).services;
                            const parsed: ServicesState = typeof svc === 'string' ? JSON.parse(svc) : svc as unknown as ServicesState;
                            return getEnabledServices(parsed).slice(0, 3).map((s) => (
                              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-primary">Rs. {record.amount.toFixed(2)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (record.type === 'payment') {
                            handleViewPaymentReceipt(record.data as Payment);
                          } else {
                            handleViewServiceReceipt(record.data as PatientServices);
                          }
                        }}
                        title="View Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No payment records found</p>
              ) : (
                filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{payment.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {payment.consultationFee > 0 && (
                          <Badge variant="outline" className="text-xs">Consult: Rs.{payment.consultationFee}</Badge>
                        )}
                        {payment.labFee > 0 && (
                          <Badge variant="outline" className="text-xs">Lab: Rs.{payment.labFee}</Badge>
                        )}
                        {payment.medicineFee > 0 && (
                          <Badge variant="outline" className="text-xs">Med: Rs.{payment.medicineFee}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-primary">Rs. {payment.totalAmount}</p>
                        <Badge variant={payment.paymentMode === 'Card' ? 'default' : 'secondary'}>
                          {payment.paymentMode}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewPaymentReceipt(payment)}
                        title="View Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredServices.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No service records found</p>
              ) : (
                filteredServices.map((service) => {
                  const servicesData: ServicesState = typeof service.services === 'string' 
                    ? JSON.parse(service.services) 
                    : service.services as ServicesState;
                  
                  const enabledServices = getEnabledServices(servicesData);
                  const patient = patients.find(p => p.id === service.patientId);

                  return (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{patient?.name || service.patientId}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(service.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {enabledServices.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-primary">Rs. {service.grandTotal}</p>
                          <Badge variant={service.status === 'Completed' ? 'default' : 'secondary'}>
                            {service.status}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewServiceReceipt(service)}
                          title="View Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Receipt Dialogs */}
      <ServiceReceiptDialog
        open={serviceReceiptOpen}
        onOpenChange={setServiceReceiptOpen}
        service={selectedService}
        patient={patients.find(p => p.id === selectedService?.patientId) || null}
      />
      
      <PaymentReceiptDialog
        open={paymentReceiptOpen}
        onOpenChange={setPaymentReceiptOpen}
        payment={selectedPayment}
        patient={patients.find(p => p.id === selectedPayment?.patientId) || null}
      />
    </div>
  );
}
