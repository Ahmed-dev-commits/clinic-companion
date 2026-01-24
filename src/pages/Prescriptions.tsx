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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    
    // Colors
    const primaryColor: [number, number, number] = [26, 86, 219]; // Blue
    const textColor: [number, number, number] = [30, 30, 30];
    const mutedColor: [number, number, number] = [100, 100, 100];
    const lineColor: [number, number, number] = [200, 200, 200];
    
    // Get patient details
    const patient = patients.find(p => p.id === rx.patientId);
    
    // ============ HEADER SECTION ============
    // Logo placeholder (blue square)
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, 10, 25, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LOGO', margin + 12.5, 25, { align: 'center' });
    
    // Clinic Info
    doc.setTextColor(...primaryColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MediCare Hospital', margin + 30, 18);
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('123 Healthcare Avenue, Medical District', margin + 30, 24);
    doc.text('City, State - 400001', margin + 30, 29);
    doc.text('Phone: +91 98765 43210 | Email: care@medicare.com', margin + 30, 34);
    
    // Doctor Info (right side)
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Dr. Rajesh Kumar', pageWidth - margin, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text('MBBS, MD (General Medicine)', pageWidth - margin, 23, { align: 'right' });
    doc.text('Reg. No: MCI-12345-2020', pageWidth - margin, 28, { align: 'right' });
    doc.text('Consultation Hours: 10 AM - 6 PM', pageWidth - margin, 33, { align: 'right' });
    
    // Header line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(margin, 40, pageWidth - margin, 40);
    
    // E-Prescription title
    doc.setFillColor(...primaryColor);
    doc.roundedRect(pageWidth / 2 - 25, 43, 50, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('E-PRESCRIPTION', pageWidth / 2, 48.5, { align: 'center' });
    
    // ============ PATIENT DETAILS SECTION ============
    let yPos = 58;
    
    // Patient info box
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'S');
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Left column
    doc.text('Patient Name:', margin + 4, yPos + 7);
    doc.text('Age / Gender:', margin + 4, yPos + 14);
    doc.text('Patient ID:', margin + 4, yPos + 21);
    
    // Left column values
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(rx.patientName, margin + 30, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${rx.patientAge} years / ${patient?.gender || 'N/A'}`, margin + 30, yPos + 14);
    doc.text(rx.patientId, margin + 30, yPos + 21);
    
    // Right column
    const rightCol = pageWidth / 2 + 10;
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.text('Date:', rightCol, yPos + 7);
    doc.text('Prescription ID:', rightCol, yPos + 14);
    doc.text('Visit ID:', rightCol, yPos + 21);
    
    // Right column values
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.text(format(new Date(rx.createdAt), 'dd MMM yyyy, hh:mm a'), rightCol + 30, yPos + 7);
    doc.text(rx.id, rightCol + 30, yPos + 14);
    doc.text(`V-${rx.id.slice(-6).toUpperCase()}`, rightCol + 30, yPos + 21);
    
    yPos += 35;
    
    // ============ DIAGNOSIS SECTION ============
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DIAGNOSIS:', margin + 4, yPos + 6);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.text(rx.diagnosis, margin + 28, yPos + 6);
    
    // Allergies (if any from patient record)
    doc.setTextColor(180, 50, 50);
    doc.setFontSize(8);
    doc.text('Allergies: None reported', margin + 4, yPos + 11);
    
    yPos += 20;
    
    // ============ PRESCRIPTION TABLE ============
    // Table header
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = [8, 45, 25, 30, 22, 50];
    let xPos = margin + 2;
    
    doc.text('#', xPos, yPos + 5.5);
    xPos += colWidths[0];
    doc.text('Medicine Name', xPos, yPos + 5.5);
    xPos += colWidths[1];
    doc.text('Dosage', xPos, yPos + 5.5);
    xPos += colWidths[2];
    doc.text('Frequency', xPos, yPos + 5.5);
    xPos += colWidths[3];
    doc.text('Duration', xPos, yPos + 5.5);
    xPos += colWidths[4];
    doc.text('Instructions', xPos, yPos + 5.5);
    
    yPos += 8;
    
    // Table rows
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    
    rx.medicines.forEach((med, i) => {
      // Alternating row colors
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(margin, yPos, contentWidth, 8, 'F');
      }
      
      xPos = margin + 2;
      doc.text(`${i + 1}`, xPos, yPos + 5.5);
      xPos += colWidths[0];
      doc.setFont('helvetica', 'bold');
      doc.text(med.name, xPos, yPos + 5.5);
      doc.setFont('helvetica', 'normal');
      xPos += colWidths[1];
      doc.text(med.dosage, xPos, yPos + 5.5);
      xPos += colWidths[2];
      doc.text(med.frequency, xPos, yPos + 5.5);
      xPos += colWidths[3];
      doc.text(med.duration, xPos, yPos + 5.5);
      xPos += colWidths[4];
      doc.text('After food', xPos, yPos + 5.5);
      
      yPos += 8;
    });
    
    // Table border
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos - (rx.medicines.length * 8) - 8, contentWidth, (rx.medicines.length + 1) * 8, 'S');
    
    yPos += 8;
    
    // ============ LAB TESTS SECTION ============
    if (rx.labTests.length > 0) {
      doc.setFillColor(255, 250, 245);
      doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');
      doc.setTextColor(200, 120, 50);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('LAB TESTS ADVISED:', margin + 4, yPos + 5);
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      doc.text(rx.labTests.join(', '), margin + 38, yPos + 5);
      doc.setTextColor(...mutedColor);
      doc.setFontSize(7);
      doc.text('(Please complete tests before next visit)', margin + 4, yPos + 10);
      yPos += 16;
    }
    
    // ============ NOTES & ADVICE SECTION ============
    if (rx.doctorNotes || rx.precautions) {
      doc.setDrawColor(...lineColor);
      doc.setLineWidth(0.3);
      
      const notesHeight = 24;
      doc.roundedRect(margin, yPos, contentWidth, notesHeight, 2, 2, 'S');
      
      doc.setTextColor(...primaryColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES & ADVICE:', margin + 4, yPos + 6);
      
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      if (rx.doctorNotes) {
        const splitNotes = doc.splitTextToSize(rx.doctorNotes, contentWidth - 8);
        doc.text(splitNotes, margin + 4, yPos + 12);
      }
      
      if (rx.precautions) {
        doc.setTextColor(180, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text('Precautions:', margin + 4, yPos + 18);
        doc.setFont('helvetica', 'normal');
        doc.text(rx.precautions, margin + 25, yPos + 18);
      }
      
      yPos += notesHeight + 6;
    }
    
    // ============ FOLLOW-UP SECTION ============
    doc.setFillColor(240, 255, 240);
    doc.roundedRect(margin, yPos, contentWidth / 2 - 5, 12, 2, 2, 'F');
    doc.setTextColor(50, 150, 50);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('FOLLOW-UP DATE:', margin + 4, yPos + 7);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(new Date(rx.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000), 'dd MMM yyyy'), margin + 38, yPos + 7);
    
    // ============ FOOTER SECTION ============
    const footerY = pageHeight - 50;
    
    // Signature and stamp boxes
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.3);
    
    // Doctor signature
    doc.rect(margin, footerY, 60, 25, 'S');
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.text('Doctor\'s Signature', margin + 30, footerY + 3, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(margin + 5, footerY + 18, margin + 55, footerY + 18);
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    doc.text('Dr. Rajesh Kumar', margin + 30, footerY + 22, { align: 'center' });
    
    // Clinic stamp
    doc.setLineWidth(0.3);
    doc.rect(pageWidth - margin - 60, footerY, 60, 25, 'S');
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.text('Clinic Stamp', pageWidth - margin - 30, footerY + 3, { align: 'center' });
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.roundedRect(pageWidth - margin - 50, footerY + 6, 40, 16, 2, 2, 'S');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('MediCare', pageWidth - margin - 30, footerY + 14, { align: 'center' });
    doc.setFontSize(6);
    doc.text('HOSPITAL', pageWidth - margin - 30, footerY + 19, { align: 'center' });
    
    // Disclaimer
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    const disclaimer = 'Disclaimer: This prescription is valid for 7 days from the date of issue. Please consult your doctor before taking any medicine. Self-medication can be harmful.';
    const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
    doc.text(splitDisclaimer, pageWidth / 2, pageHeight - 14, { align: 'center' });
    
    // Page border
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');
    
    doc.save(`prescription-${rx.id}.pdf`);
    toast.success('Professional PDF downloaded');
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
