import { useState, useMemo } from 'react';
import { useHospitalStore } from '@/store/hospitalStore';
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
import { Printer, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MedicineEntry {
  stockId: string;
  name: string;
  quantity: number;
  price: number;
}

export function FeesPage() {
  const { patients, payments, stock, addPayment, reduceStock } = useHospitalStore();
  
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

  const handleSubmitPayment = () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    // Reduce stock for medicines
    selectedMedicines.forEach(m => {
      reduceStock(m.stockId, m.quantity);
    });

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

    addPayment(paymentData);
    setLastPayment({ ...paymentData, patient, createdAt: new Date().toISOString() });
    setShowReceipt(true);
    toast.success('Payment recorded successfully');

    // Reset form
    setSelectedPatientId('');
    setConsultationFee('500');
    setLabFee('0');
    setSelectedMedicines([]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <PageHeader
        title="Fee Collection"
        description="Process payments and generate receipts"
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
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">Receipt Preview</CardTitle>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </CardHeader>
              <CardContent>
                <div className="receipt-container">
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-lg">MediCare Hospital</h3>
                    <p className="text-xs">Payment Receipt</p>
                  </div>
                  <div className="border-t border-dashed pt-2 mb-2">
                    <p>Patient: {lastPayment.patient.name}</p>
                    <p>ID: {lastPayment.patientId}</p>
                    <p>Date: {format(new Date(lastPayment.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div className="border-t border-dashed pt-2 mb-2">
                    <p>Consultation: Rs. {lastPayment.consultationFee}</p>
                    <p>Lab Fee: Rs. {lastPayment.labFee}</p>
                    <p>Medicines: Rs. {lastPayment.medicineFee}</p>
                  </div>
                  <div className="border-t border-dashed pt-2 font-bold">
                    <p>Total: Rs. {lastPayment.totalAmount}</p>
                    <p>Paid via: {lastPayment.paymentMode}</p>
                  </div>
                  <p className="text-center text-xs mt-4">Thank you for choosing MediCare!</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.slice(-5).reverse().map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-medium">{payment.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Rs. {payment.totalAmount}</p>
                      <Badge variant={payment.paymentMode === 'Card' ? 'default' : 'secondary'}>
                        {payment.paymentMode}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
