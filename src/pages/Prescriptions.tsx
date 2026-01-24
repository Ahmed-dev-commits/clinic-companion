import { useState } from 'react';
import { useHospitalStore } from '@/store/hospitalStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Copy, Printer, Download, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PrescriptionMedicine, Prescription } from '@/types/hospital';
import jsPDF from 'jspdf';

export function PrescriptionsPage() {
  const { patients, prescriptions, stock, addPrescription, reduceStock } = useHospitalStore();
  
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([]);
  const [labTests, setLabTests] = useState<string[]>([]);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [precautions, setPrecautions] = useState('');
  
  // New medicine form
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
  });
  const [newLabTest, setNewLabTest] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Generate prescription text
  const generatePrescriptionText = (): string => {
    if (!selectedPatient) return '';

    const medicineList = medicines
      .map(m => `${m.name} ${m.dosage} ${m.frequency} for ${m.duration}`)
      .join(', ');

    const labList = labTests.length > 0 ? `Advised ${labTests.join(', ')}.` : '';
    const notesText = doctorNotes ? `General advice: ${doctorNotes}.` : '';
    const precautionsText = precautions ? `Precautions: ${precautions}.` : '';

    return `Patient ${selectedPatient.name} (Age ${selectedPatient.age}) diagnosed with ${diagnosis}. Prescribed ${medicineList}. ${labList} ${notesText} ${precautionsText}`.trim();
  };

  const handleAddMedicine = () => {
    if (!newMedicine.name || !newMedicine.dosage || !newMedicine.frequency || !newMedicine.duration) {
      toast.error('Please fill all medicine fields');
      return;
    }
    setMedicines([...medicines, { ...newMedicine }]);
    setNewMedicine({ name: '', dosage: '', frequency: '', duration: '' });
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleAddLabTest = () => {
    if (!newLabTest.trim()) return;
    setLabTests([...labTests, newLabTest.trim()]);
    setNewLabTest('');
  };

  const handleRemoveLabTest = (index: number) => {
    setLabTests(labTests.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    if (!diagnosis.trim()) {
      toast.error('Please enter diagnosis');
      return;
    }
    if (medicines.length === 0) {
      toast.error('Please add at least one medicine');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId)!;
    const generatedText = generatePrescriptionText();

    // Reduce stock for medicines that exist in stock
    medicines.forEach(med => {
      const stockItem = stock.find(s => s.name.toLowerCase().includes(med.name.toLowerCase()));
      if (stockItem) {
        reduceStock(stockItem.id, 1);
      }
    });

    addPrescription({
      patientId: selectedPatientId,
      patientName: patient.name,
      patientAge: patient.age,
      diagnosis,
      medicines,
      labTests,
      doctorNotes,
      precautions,
      generatedText,
    });

    toast.success('Prescription created successfully');

    // Reset form
    setSelectedPatientId('');
    setDiagnosis('');
    setMedicines([]);
    setLabTests([]);
    setDoctorNotes('');
    setPrecautions('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Prescription copied to clipboard');
  };

  const handlePrint = (rxId: string) => {
    // Add print-content class to the specific prescription
    const element = document.getElementById(`prescription-${rxId}`);
    if (element) {
      element.classList.add('print-content');
      window.print();
      element.classList.remove('print-content');
    }
  };

  const handleDownloadPDF = (rx: Prescription) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('MediCare Hospital', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('E-Prescription', 105, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(rx.createdAt), 'MMM dd, yyyy')}`, 20, 40);
    doc.text(`Prescription ID: ${rx.id}`, 20, 46);
    
    doc.setFontSize(12);
    doc.text(`Patient: ${rx.patientName}`, 20, 56);
    doc.text(`Age: ${rx.patientAge} years`, 20, 62);
    doc.text(`Diagnosis: ${rx.diagnosis}`, 20, 68);
    
    doc.setFontSize(11);
    doc.text('Medications:', 20, 80);
    let yPos = 86;
    rx.medicines.forEach((med, i) => {
      doc.text(`${i + 1}. ${med.name} - ${med.dosage} | ${med.frequency} | ${med.duration}`, 25, yPos);
      yPos += 6;
    });
    
    if (rx.labTests.length > 0) {
      yPos += 4;
      doc.text('Lab Tests:', 20, yPos);
      yPos += 6;
      doc.text(rx.labTests.join(', '), 25, yPos);
    }
    
    if (rx.doctorNotes) {
      yPos += 10;
      doc.text('Doctor Notes:', 20, yPos);
      yPos += 6;
      const splitNotes = doc.splitTextToSize(rx.doctorNotes, 170);
      doc.text(splitNotes, 25, yPos);
    }
    
    if (rx.precautions) {
      yPos += 10;
      doc.text('Precautions:', 20, yPos);
      yPos += 6;
      const splitPrecautions = doc.splitTextToSize(rx.precautions, 170);
      doc.text(splitPrecautions, 25, yPos);
    }
    
    doc.save(`prescription-${rx.id}.pdf`);
    toast.success('PDF downloaded');
  };

  // Filter prescriptions
  const filteredPrescriptions = prescriptions.filter(rx =>
    rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rx.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="E-Prescriptions"
        description="Create and manage digital prescriptions"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prescription Form */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Create Prescription</h2>
          
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
                      {patient.name} (Age: {patient.age})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Diagnosis *</Label>
              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g., Viral Fever, Diabetes Type 2"
              />
            </div>

            {/* Add Medicine */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-medium">Add Medicine</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Medicine name"
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                />
                <Input
                  placeholder="Dosage (e.g., 500mg)"
                  value={newMedicine.dosage}
                  onChange={(e) => setNewMedicine({ ...newMedicine, dosage: e.target.value })}
                />
                <Input
                  placeholder="Frequency (e.g., Twice daily)"
                  value={newMedicine.frequency}
                  onChange={(e) => setNewMedicine({ ...newMedicine, frequency: e.target.value })}
                />
                <Input
                  placeholder="Duration (e.g., 5 days)"
                  value={newMedicine.duration}
                  onChange={(e) => setNewMedicine({ ...newMedicine, duration: e.target.value })}
                />
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddMedicine}>
                <Plus className="mr-1 h-4 w-4" />
                Add Medicine
              </Button>
            </div>

            {/* Medicine List */}
            {medicines.length > 0 && (
              <div className="space-y-2">
                {medicines.map((med, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded bg-muted"
                  >
                    <div>
                      <p className="font-medium text-sm">{med.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {med.dosage} | {med.frequency} | {med.duration}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveMedicine(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Lab Tests */}
            <div>
              <Label>Lab Tests (Optional)</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g., Blood test, X-ray"
                  value={newLabTest}
                  onChange={(e) => setNewLabTest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLabTest()}
                />
                <Button type="button" variant="secondary" onClick={handleAddLabTest}>
                  Add
                </Button>
              </div>
              {labTests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {labTests.map((test, index) => (
                    <Badge key={index} variant="outline" className="gap-1">
                      {test}
                      <button
                        onClick={() => handleRemoveLabTest(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Doctor Notes</Label>
              <Textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Rest, hydration, etc."
                rows={2}
              />
            </div>

            <div>
              <Label>Precautions</Label>
              <Textarea
                value={precautions}
                onChange={(e) => setPrecautions(e.target.value)}
                placeholder="Avoid cold drinks, follow-up in 3 days, etc."
                rows={2}
              />
            </div>

            {/* Preview */}
            {selectedPatient && diagnosis && medicines.length > 0 && (
              <div>
                <Label className="text-sm">Generated Prescription</Label>
                <div className="prescription-text mt-1">
                  {generatePrescriptionText()}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleSubmit}>
              <FileText className="mr-2 h-4 w-4" />
              Create Prescription
            </Button>
          </div>
        </div>

        {/* Prescription History */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prescriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4 max-h-[600px] overflow-auto">
            {filteredPrescriptions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No prescriptions found
                </CardContent>
              </Card>
            ) : (
              [...filteredPrescriptions].reverse().map((rx) => (
                <Card key={rx.id} id={`prescription-${rx.id}`}>
                  {/* Print Header - Only visible when printing */}
                  <div className="hidden print:block print-header">
                    <h1 className="text-2xl font-bold">MediCare Hospital</h1>
                    <p className="text-sm">E-Prescription</p>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between print:block">
                      <div>
                        <CardTitle className="text-base print:text-xl print:mb-2">{rx.patientName}</CardTitle>
                        <p className="text-sm text-muted-foreground print:text-black">
                          {rx.diagnosis} • {format(new Date(rx.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs print:mt-2 print:inline-block">
                        {rx.id}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Detailed info for print */}
                    <div className="hidden print:block print-section">
                      <p><strong>Patient ID:</strong> {rx.patientId}</p>
                      <p><strong>Age:</strong> {rx.patientAge} years</p>
                      <p><strong>Date:</strong> {format(new Date(rx.createdAt), 'MMMM dd, yyyy')}</p>
                    </div>
                    
                    <div className="hidden print:block print-section">
                      <p className="font-bold mb-2">Diagnosis:</p>
                      <p>{rx.diagnosis}</p>
                    </div>
                    
                    <div className="hidden print:block print-section">
                      <p className="font-bold mb-2">Medications:</p>
                      <ol className="list-decimal list-inside">
                        {rx.medicines.map((med, i) => (
                          <li key={i} className="mb-1">
                            <strong>{med.name}</strong> - {med.dosage} | {med.frequency} | {med.duration}
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    {rx.labTests.length > 0 && (
                      <div className="hidden print:block print-section">
                        <p className="font-bold mb-2">Lab Tests:</p>
                        <p>{rx.labTests.join(', ')}</p>
                      </div>
                    )}
                    
                    {rx.doctorNotes && (
                      <div className="hidden print:block print-section">
                        <p className="font-bold mb-2">Doctor Notes:</p>
                        <p>{rx.doctorNotes}</p>
                      </div>
                    )}
                    
                    {rx.precautions && (
                      <div className="hidden print:block print-section">
                        <p className="font-bold mb-2">Precautions:</p>
                        <p>{rx.precautions}</p>
                      </div>
                    )}
                    
                    {/* Screen view - generated text */}
                    <div className="prescription-text text-xs print:hidden">
                      {rx.generatedText}
                    </div>
                    
                    {/* Print Footer */}
                    <div className="hidden print:block print-footer">
                      <p>Thank you for choosing MediCare Hospital</p>
                      <p className="text-xs mt-1">This is a computer-generated prescription</p>
                    </div>
                    
                    {/* Action buttons - hidden in print */}
                    <div className="flex gap-2 no-print">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(rx.generatedText)}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(rx.id)}
                      >
                        <Printer className="mr-1 h-3 w-3" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(rx)}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
