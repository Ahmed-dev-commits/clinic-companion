import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, Calendar, Pill, User, Copy, Printer, Download, X, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Prescription, Patient } from '@/types/hospital';
import jsPDF from 'jspdf';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from 'sonner';

interface PrescriptionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptions: Prescription[];
  patients: Patient[];
}

export function PrescriptionHistoryDialog({
  open,
  onOpenChange,
  prescriptions,
  patients,
}: PrescriptionHistoryDialogProps) {
  const { settings } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  // Get unique patients from prescriptions
  const prescribedPatients = [...new Set(prescriptions.map(p => p.patientId))].map(id => {
    const patient = patients.find(p => p.id === id);
    return patient ? { id, name: patient.name } : { id, name: prescriptions.find(p => p.patientId === id)?.patientName || 'Unknown' };
  });

  // Filter prescriptions
  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesSearch = 
      rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.medicines.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPatient = patientFilter === 'all' || rx.patientId === patientFilter;
    
    return matchesSearch && matchesPatient;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Prescription copied to clipboard');
  };

  const handleDownloadPDF = (rx: Prescription) => {
    const doc = new jsPDF();
    const patient = patients.find(p => p.id === rx.patientId);
    
    doc.setProperties({
      title: `Prescription-${rx.id}`,
      subject: 'Medical Prescription',
      author: settings.clinicName,
      creator: settings.clinicName
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.clinicName, margin, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${settings.address}, ${settings.city}`, margin, 26);
    doc.text(`Phone: ${settings.phone}`, margin, 31);
    
    // Doctor info
    doc.setFontSize(10);
    doc.text(settings.doctorName, pageWidth - margin, 20, { align: 'right' });
    doc.text(settings.doctorQualification, pageWidth - margin, 25, { align: 'right' });
    
    doc.setDrawColor(26, 86, 219);
    doc.setLineWidth(0.8);
    doc.line(margin, 38, pageWidth - margin, 38);
    
    // Patient info
    let yPos = 48;
    doc.setFontSize(10);
    doc.text(`Patient: ${rx.patientName}`, margin, yPos);
    doc.text(`Age: ${rx.patientAge} years`, margin + 80, yPos);
    doc.text(`Date: ${format(new Date(rx.createdAt), 'dd MMM yyyy')}`, pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 10;
    doc.text(`Diagnosis: ${rx.diagnosis}`, margin, yPos);
    
    // Medicines
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Prescribed Medicines:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    
    rx.medicines.forEach((med, i) => {
      yPos += 7;
      doc.text(`${i + 1}. ${med.name} - ${med.dosage}, ${med.frequency}, ${med.duration}`, margin + 5, yPos);
    });
    
    // Notes
    if (rx.doctorNotes) {
      yPos += 12;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
      doc.text(rx.doctorNotes, margin + 5, yPos);
    }
    
    // Follow-up
    yPos += 15;
    const followUpDate = rx.followUpDate ? new Date(rx.followUpDate) : null;
    doc.text(`Follow-up: ${followUpDate && !isNaN(followUpDate.getTime()) ? format(followUpDate, 'dd MMM yyyy') : 'To be scheduled'}`, margin, yPos);
    
    doc.save(`prescription-${rx.id}.pdf`);
    toast.success('PDF downloaded');
  };

  const selectedPatient = selectedPrescription ? patients.find(p => p.id === selectedPrescription.patientId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prescription History
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* Left Panel - List */}
          <div className={`${selectedPrescription ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-1/2 border-r`}>
            {/* Filters */}
            <div className="p-4 space-y-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient, diagnosis, or medicine..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={patientFilter} onValueChange={setPatientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  {prescribedPatients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prescription List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {filteredPrescriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No prescriptions found</p>
                  </div>
                ) : (
                  [...filteredPrescriptions].reverse().map((rx) => (
                    <Card 
                      key={rx.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedPrescription?.id === rx.id ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => setSelectedPrescription(rx)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-sm">{rx.patientName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{rx.diagnosis}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(rx.createdAt), 'MMM dd, yyyy')}
                              <span>•</span>
                              <Pill className="h-3 w-3" />
                              {rx.medicines.length} medicine{rx.medicines.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {rx.id}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                {filteredPrescriptions.length} prescription{filteredPrescriptions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Right Panel - Details */}
          <div className={`${selectedPrescription ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-1/2`}>
            {selectedPrescription ? (
              <>
                {/* Mobile back button */}
                <div className="md:hidden p-3 border-b">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPrescription(null)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to list
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedPrescription.patientName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Age: {selectedPrescription.patientAge} years
                          {selectedPatient?.gender && ` • ${selectedPatient.gender}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-mono">{selectedPrescription.id}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(selectedPrescription.createdAt), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>

                    {/* Diagnosis */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Diagnosis</h4>
                      <p className="font-medium">{selectedPrescription.diagnosis}</p>
                    </div>

                    {/* Medicines Table */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Prescribed Medicines</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">Medicine</TableHead>
                            <TableHead>Dosage</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPrescription.medicines.map((med, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{med.name}</TableCell>
                              <TableCell>{med.dosage}</TableCell>
                              <TableCell>{med.frequency}</TableCell>
                              <TableCell>{med.duration}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Lab Tests */}
                    {selectedPrescription.labTests.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Lab Tests Advised</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPrescription.labTests.map((test, i) => (
                            <Badge key={i} variant="secondary">{test}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes & Precautions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPrescription.doctorNotes && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <h4 className="text-sm font-medium mb-1">Doctor's Notes</h4>
                          <p className="text-sm text-muted-foreground">{selectedPrescription.doctorNotes}</p>
                        </div>
                      )}
                      {selectedPrescription.precautions && (
                        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <h4 className="text-sm font-medium mb-1 text-destructive">Precautions</h4>
                          <p className="text-sm text-muted-foreground">{selectedPrescription.precautions}</p>
                        </div>
                      )}
                    </div>

                    {/* Follow-up */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="text-sm font-medium mb-1">Follow-up Date</h4>
                      <p className="text-sm">
                        {selectedPrescription.followUpDate && !isNaN(new Date(selectedPrescription.followUpDate).getTime())
                          ? format(new Date(selectedPrescription.followUpDate), 'MMMM dd, yyyy')
                          : 'To be scheduled'}
                      </p>
                    </div>

                    {/* Generated Text */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Generated Prescription</h4>
                      <div className="p-3 rounded-lg bg-muted/30 border text-sm italic">
                        {selectedPrescription.generatedText}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Actions */}
                <div className="p-4 border-t flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleCopy(selectedPrescription.generatedText)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDownloadPDF(selectedPrescription)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Select a prescription to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
