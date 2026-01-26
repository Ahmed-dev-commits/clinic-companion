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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Plus, Trash2, RefreshCw, Loader2, FileText, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { ServicesState } from '@/types/services';

interface MedicineEntry {
  stockId: string;
  name: string;
  quantity: number;
  price: number;
}

// Helper function to convert number to words
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  
  return convert(Math.floor(num));
};

export function FeesPage() {
  const { patients } = useAccessPatients();
  const { payments, loading, addPayment, refetch } = usePayments();
  const { services: patientServices, loading: servicesLoading, refetch: refetchServices } = usePatientServices();
  const { stock, reduceStock } = useStock();
  const { settings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('payments');
  
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [consultationFee, setConsultationFee] = useState('500');
  const [labFee, setLabFee] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card'>('Cash');
  const [selectedMedicines, setSelectedMedicines] = useState<MedicineEntry[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

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

    // Check if already added
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
      // Reduce stock for medicines
      for (const m of selectedMedicines) {
        await reduceStock(m.stockId, m.quantity);
      }

      // Create payment record
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
      setLastPayment({ ...paymentData, patient, createdAt: new Date().toISOString() });
      setShowReceipt(true);
      toast.success('Payment recorded successfully');

      // Reset form
      setSelectedPatientId('');
      setConsultationFee('500');
      setLabFee('0');
      setSelectedMedicines([]);
    } catch (err) {
      toast.error('Failed to process payment');
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('receipt-print');
    if (element) {
      element.classList.add('print-content');
      window.print();
      element.classList.remove('print-content');
    }
  };

  return (
    <div>
      <PageHeader
        title="Fee Collection"
        description="Process payments and generate receipts"
        action={
          <div className="flex items-center gap-3">
            <ConnectionStatus />
            <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fee Form */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
          
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

        {/* Receipt Preview / Payment History */}
        <div className="space-y-6">
          {showReceipt && lastPayment && (
            <Card id="receipt-print">
              {/* ===== SCREEN LAYOUT ===== */}
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 print:hidden">
                <CardTitle className="text-lg">Receipt Preview</CardTitle>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </CardHeader>
              <CardContent className="print:hidden">
                <div className="receipt-container">
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-lg">{settings.clinicName}</h3>
                    <p className="text-xs">Payment Receipt</p>
                  </div>
                  
                  <div className="border-t border-dashed pt-2 mb-2">
                    <p><strong>Patient:</strong> {lastPayment.patient.name}</p>
                    <p><strong>ID:</strong> {lastPayment.patientId}</p>
                    <p><strong>Date:</strong> {format(new Date(lastPayment.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  
                  <div className="border-t border-dashed pt-2 mb-2">
                    <p><strong>Consultation:</strong> Rs. {lastPayment.consultationFee}</p>
                    <p><strong>Lab Fee:</strong> Rs. {lastPayment.labFee}</p>
                    <p><strong>Medicines:</strong> Rs. {lastPayment.medicineFee}</p>
                    
                    {lastPayment.medicines && lastPayment.medicines.length > 0 && (
                      <div className="mt-2 pl-4">
                        <p className="text-sm font-medium">Medicine Details:</p>
                        <ul className="text-sm list-disc list-inside">
                          {lastPayment.medicines.map((m: any, i: number) => (
                            <li key={i}>{m.name} × {m.quantity} = Rs. {m.price * m.quantity}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-dashed pt-2 font-bold">
                    <p className="text-lg">Total: Rs. {lastPayment.totalAmount}</p>
                    <p>Paid via: {lastPayment.paymentMode}</p>
                  </div>
                  
                  <p className="text-center text-xs mt-4">Thank you for choosing {settings.clinicName}!</p>
                </div>
              </CardContent>

              {/* ===== PRINT LAYOUT - Professional Receipt Template ===== */}
              <div className="hidden print:block p-8">
                {/* Header with Logo and Clinic Info */}
                <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-4">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    {settings.logo ? (
                      <img src={settings.logo} alt="Clinic Logo" className="w-16 h-16 object-contain rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        LOGO
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-primary">{settings.clinicName}</h1>
                      <p className="text-sm text-muted-foreground">{settings.address}</p>
                      <p className="text-sm text-muted-foreground">{settings.city}</p>
                      <p className="text-sm text-muted-foreground">Phone: {settings.phone} | Email: {settings.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-primary">PAYMENT RECEIPT</h2>
                    <p className="text-sm text-muted-foreground">Receipt No: RCP-{lastPayment.patientId.slice(-4)}-{Date.now().toString().slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">Date: {format(new Date(lastPayment.createdAt), 'MMMM dd, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">Time: {format(new Date(lastPayment.createdAt), 'hh:mm a')}</p>
                  </div>
                </div>
                
                {/* Patient Details Section */}
                <div className="bg-muted/50 p-4 rounded-lg mb-4 border">
                  <h2 className="font-bold text-sm mb-2 text-primary">PATIENT INFORMATION</h2>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <p><span className="font-medium">Patient Name:</span> {lastPayment.patient.name}</p>
                    <p><span className="font-medium">Patient ID:</span> {lastPayment.patientId}</p>
                    <p><span className="font-medium">Age / Gender:</span> {lastPayment.patient.age} years / {lastPayment.patient.gender}</p>
                    <p><span className="font-medium">Contact:</span> {lastPayment.patient.phone}</p>
                  </div>
                </div>

                {/* Charges Breakdown */}
                <div className="mb-4">
                  <h2 className="font-bold text-sm mb-2 text-primary">CHARGES BREAKDOWN</h2>
                  <table className="w-full border-collapse border text-sm">
                    <thead>
                      <tr className="bg-primary/10">
                        <th className="border p-2 text-left font-semibold">#</th>
                        <th className="border p-2 text-left font-semibold">Description</th>
                        <th className="border p-2 text-center font-semibold">Qty</th>
                        <th className="border p-2 text-right font-semibold">Rate (Rs.)</th>
                        <th className="border p-2 text-right font-semibold">Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-2">1</td>
                        <td className="border p-2">Consultation Fee</td>
                        <td className="border p-2 text-center">1</td>
                        <td className="border p-2 text-right">{lastPayment.consultationFee.toFixed(2)}</td>
                        <td className="border p-2 text-right">{lastPayment.consultationFee.toFixed(2)}</td>
                      </tr>
                      {lastPayment.labFee > 0 && (
                        <tr>
                          <td className="border p-2">2</td>
                          <td className="border p-2">Laboratory Fee</td>
                          <td className="border p-2 text-center">1</td>
                          <td className="border p-2 text-right">{lastPayment.labFee.toFixed(2)}</td>
                          <td className="border p-2 text-right">{lastPayment.labFee.toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Medicines Table */}
                {lastPayment.medicines && lastPayment.medicines.length > 0 && (
                  <div className="mb-4">
                    <h2 className="font-bold text-sm mb-2 text-primary">MEDICINES DISPENSED</h2>
                    <table className="w-full border-collapse border text-sm">
                      <thead>
                        <tr className="bg-primary/10">
                          <th className="border p-2 text-left font-semibold">#</th>
                          <th className="border p-2 text-left font-semibold">Medicine Name</th>
                          <th className="border p-2 text-center font-semibold">Quantity</th>
                          <th className="border p-2 text-right font-semibold">Unit Price (Rs.)</th>
                          <th className="border p-2 text-right font-semibold">Amount (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastPayment.medicines.map((m: any, index: number) => (
                          <tr key={index}>
                            <td className="border p-2">{index + 1}</td>
                            <td className="border p-2">{m.name}</td>
                            <td className="border p-2 text-center">{m.quantity}</td>
                            <td className="border p-2 text-right">{m.price.toFixed(2)}</td>
                            <td className="border p-2 text-right">{(m.price * m.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Total Summary */}
                <div className="flex justify-end mb-6">
                  <div className="w-64 border rounded">
                    <div className="flex justify-between p-2 border-b text-sm">
                      <span>Consultation Fee:</span>
                      <span>Rs. {lastPayment.consultationFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 border-b text-sm">
                      <span>Lab Fee:</span>
                      <span>Rs. {lastPayment.labFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 border-b text-sm">
                      <span>Medicine Fee:</span>
                      <span>Rs. {lastPayment.medicineFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-primary/10 font-bold">
                      <span>TOTAL AMOUNT:</span>
                      <span>Rs. {lastPayment.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 text-sm bg-muted/50">
                      <span>Payment Mode:</span>
                      <span className="font-medium">{lastPayment.paymentMode}</span>
                    </div>
                  </div>
                </div>

                {/* Amount in Words */}
                <div className="mb-6 p-3 border rounded bg-muted/30">
                  <p className="text-sm">
                    <span className="font-medium">Amount in Words:</span> Rupees {numberToWords(lastPayment.totalAmount)} Only
                  </p>
                </div>

                {/* Signature and Stamp Section */}
                <div className="grid grid-cols-2 gap-8 mt-8 mb-6">
                  <div className="text-center">
                    <div className="border-2 border-dashed border-muted-foreground/30 h-20 mb-2 flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Patient Signature</span>
                    </div>
                    <p className="text-sm font-medium">Received By</p>
                  </div>
                  <div className="text-center">
                    <div className="border-2 border-dashed border-muted-foreground/30 h-20 mb-2 flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Authorized Signature & Stamp</span>
                    </div>
                    <p className="text-sm font-medium">For {settings.clinicName}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t pt-4 text-center text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Thank you for choosing {settings.clinicName}!</p>
                  <p>This is a computer-generated receipt and is valid without signature.</p>
                  <p className="mt-1">For any queries, please contact: {settings.phone} | {settings.email}</p>
                </div>
              </div>
            </Card>
          )}

          {/* All Records with Tabs */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Payment Records</CardTitle>
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
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="payments" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payments ({payments.length})
                  </TabsTrigger>
                  <TabsTrigger value="services" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Services ({patientServices.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="payments" className="space-y-3 max-h-[400px] overflow-y-auto">
                  {payments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No payment records found</p>
                  ) : (
                    payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
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
                        <div className="text-right">
                          <p className="font-bold text-primary">Rs. {payment.totalAmount}</p>
                          <Badge variant={payment.paymentMode === 'Card' ? 'default' : 'secondary'}>
                            {payment.paymentMode}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="services" className="space-y-3 max-h-[400px] overflow-y-auto">
                  {patientServices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No service records found</p>
                  ) : (
                    patientServices.map((service) => {
                      const servicesData: ServicesState = typeof service.services === 'string' 
                        ? JSON.parse(service.services) 
                        : service.services as ServicesState;
                      
                      const enabledServices: string[] = [];
                      if (servicesData?.consultation?.enabled) enabledServices.push('Consultation');
                      if (servicesData?.ultrasound?.enabled) enabledServices.push('Ultrasound');
                      if (servicesData?.ecg?.enabled) enabledServices.push('ECG');
                      if (servicesData?.bpReading?.enabled) enabledServices.push('BP');
                      if (servicesData?.injection?.enabled) enabledServices.push('Injection');
                      if (servicesData?.retention?.enabled) enabledServices.push('Retention');
                      if (servicesData?.surgery?.enabled) enabledServices.push('Surgery');
                      if (servicesData?.feeCollection?.labFee > 0) enabledServices.push('Lab Fee');
                      if (servicesData?.feeCollection?.medicines?.length > 0) enabledServices.push('Medicines');

                      const patient = patients.find(p => p.id === service.patientId);

                      return (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
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
                          <div className="text-right">
                            <p className="font-bold text-primary">Rs. {service.grandTotal}</p>
                            <Badge variant={service.status === 'Completed' ? 'default' : 'secondary'}>
                              {service.status}
                            </Badge>
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
      </div>
    </div>
  );
}
