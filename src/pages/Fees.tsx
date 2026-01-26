import { useState, useMemo } from 'react';
import { useAccessPatients } from '@/hooks/useAccessPatients';
import { usePayments } from '@/hooks/usePayments';
import { usePatientServices } from '@/hooks/usePatientServices';
import { useStock } from '@/hooks/useStock';
import { useSettingsStore } from '@/store/settingsStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Plus, Trash2, RefreshCw, FileText, CreditCard, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ServicesState, PatientServices } from '@/types/services';
import { Payment } from '@/types/hospital';
import { ServiceReceiptDialog } from '@/components/fees/ServiceReceiptDialog';
import { PaymentReceiptDialog } from '@/components/fees/PaymentReceiptDialog';

interface MedicineEntry {
  stockId: string;
  name: string;
  quantity: number;
  price: number;
}

export function FeesPage() {
  const { patients } = useAccessPatients();
  const { payments, loading, addPayment, refetch } = usePayments();
  const { services: patientServices, loading: servicesLoading, refetch: refetchServices } = usePatientServices();
  const { stock, reduceStock } = useStock();
  const { settings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('all');
  
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [consultationFee, setConsultationFee] = useState('500');
  const [labFee, setLabFee] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card'>('Cash');
  const [selectedMedicines, setSelectedMedicines] = useState<MedicineEntry[]>([]);

  // Receipt dialog states
  const [selectedService, setSelectedService] = useState<PatientServices | null>(null);
  const [serviceReceiptOpen, setServiceReceiptOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentReceiptOpen, setPaymentReceiptOpen] = useState(false);

  // Medicine selection state
  const [selectedStockId, setSelectedStockId] = useState('');
  const [medicineQuantity, setMedicineQuantity] = useState('1');

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const medicineFee = useMemo(() => {
    return selectedMedicines.reduce((sum, m) => sum + m.price * m.quantity, 0);
  }, [selectedMedicines]);

  const totalAmount = useMemo(() => {
    return parseFloat(consultationFee || '0') + parseFloat(labFee || '0') + medicineFee;
  }, [consultationFee, labFee, medicineFee]);

  // Merged records for "All" tab
  const mergedRecords = useMemo(() => {
    const paymentRecords = payments.map(p => ({
      type: 'payment' as const,
      id: p.id,
      patientId: p.patientId,
      patientName: p.patientName,
      amount: p.totalAmount,
      date: p.createdAt,
      data: p
    }));

    const serviceRecords = patientServices.map(s => {
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
  }, [payments, patientServices, patients]);

  // Today's totals
  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const paymentTotal = payments
      .filter(p => p.createdAt.split('T')[0] === today)
      .reduce((sum, p) => sum + p.totalAmount, 0);
    const serviceTotal = patientServices
      .filter(s => s.createdAt.split('T')[0] === today)
      .reduce((sum, s) => sum + s.grandTotal, 0);
    return paymentTotal + serviceTotal;
  }, [payments, patientServices]);

  const handleAddMedicine = () => {
    if (!selectedStockId) {
      toast.error('Please select a medicine');
      return;
    }

    const stockItem = stock.find(s => s.id === selectedStockId);
    if (!stockItem) return;

    const qty = parseInt(medicineQuantity) || 1;
    if (qty > stockItem.quantity) {
      toast.error(`Only ${stockItem.quantity} units available`);
      return;
    }

    const existingIndex = selectedMedicines.findIndex(m => m.stockId === selectedStockId);
    if (existingIndex >= 0) {
      const newMedicines = [...selectedMedicines];
      const newQty = newMedicines[existingIndex].quantity + qty;
      if (newQty > stockItem.quantity) {
        toast.error(`Only ${stockItem.quantity} units available`);
        return;
      }
      newMedicines[existingIndex].quantity = newQty;
      setSelectedMedicines(newMedicines);
    } else {
      setSelectedMedicines([
        ...selectedMedicines,
        { stockId: selectedStockId, name: stockItem.name, quantity: qty, price: stockItem.price },
      ]);
    }

    setSelectedStockId('');
    setMedicineQuantity('1');
  };

  const handleRemoveMedicine = (stockId: string) => {
    setSelectedMedicines(selectedMedicines.filter(m => m.stockId !== stockId));
  };

  const handleSubmitPayment = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    try {
      for (const m of selectedMedicines) {
        await reduceStock(m.stockId, m.quantity);
      }

      const paymentData = {
        patientId: selectedPatientId,
        patientName: patient.name,
        consultationFee: parseFloat(consultationFee) || 0,
        labFee: parseFloat(labFee) || 0,
        medicineFee,
        totalAmount,
        paymentMode,
        medicines: selectedMedicines,
      };

      await addPayment(paymentData);
      toast.success('Payment recorded successfully');

      // Reset form
      setSelectedPatientId('');
      setConsultationFee('500');
      setLabFee('0');
      setSelectedMedicines([]);
      
      // Refresh data
      refetch();
    } catch (err) {
      toast.error('Failed to process payment');
    }
  };

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
        title="Fee Collection"
        description="Process payments and generate receipts"
        action={
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <Button variant="outline" size="icon" onClick={() => { refetch(); refetchServices(); }} disabled={loading || servicesLoading}>
              <RefreshCw className={`h-4 w-4 ${(loading || servicesLoading) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Rs. {todayTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientServices.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fee Form */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">New Payment</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Select Patient *</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} ({patient.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Consultation Fee (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                />
              </div>
              <div>
                <Label>Lab Fee (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  value={labFee}
                  onChange={(e) => setLabFee(e.target.value)}
                />
              </div>
            </div>

            {/* Add Medicine */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Add Medicines</Label>
              <div className="flex gap-2">
                <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {stock.filter(s => s.quantity > 0).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (Rs. {item.price}) - {item.quantity} left
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={medicineQuantity}
                  onChange={(e) => setMedicineQuantity(e.target.value)}
                  className="w-20"
                  placeholder="Qty"
                />
                <Button type="button" variant="secondary" onClick={handleAddMedicine}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected Medicines */}
            {selectedMedicines.length > 0 && (
              <div className="space-y-2">
                {selectedMedicines.map((m) => (
                  <div
                    key={m.stockId}
                    className="flex items-center justify-between p-2 rounded bg-muted"
                  >
                    <span className="text-sm">
                      {m.name} × {m.quantity}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Rs. {m.price * m.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleRemoveMedicine(m.stockId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={(v: 'Cash' | 'Card') => setPaymentMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Consultation:</span>
                <span>Rs. {parseFloat(consultationFee) || 0}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Lab Fee:</span>
                <span>Rs. {parseFloat(labFee) || 0}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Medicines:</span>
                <span>Rs. {medicineFee}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-primary">Rs. {totalAmount}</span>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmitPayment}>
              Process Payment
            </Button>
          </div>
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
                  Payments ({payments.length})
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center gap-1 text-xs">
                  <FileText className="h-3 w-3" />
                  Services ({patientServices.length})
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
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No payment records found</p>
                ) : (
                  payments.map((payment) => (
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
                {patientServices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No service records found</p>
                ) : (
                  patientServices.map((service) => {
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
      </div>

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
