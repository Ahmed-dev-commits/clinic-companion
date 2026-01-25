import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Stethoscope,
  HeartPulse,
  Activity,
  Syringe,
  Clock,
  Scissors,
  DollarSign,
  Loader2,
  Save,
  FileText,
} from 'lucide-react';
import { 
  createEmptyServices, 
  ServicesState, 
  ConsultationType, 
  UltrasoundType, 
  ECGType, 
  InjectionType, 
  SurgeryType 
} from '@/types/services';

interface AdditionalServicesPanelProps {
  patientId: string;
  patientName: string;
  onSave: (services: ServicesState, grandTotal: number) => Promise<void>;
  onViewSummary: (services: ServicesState, grandTotal: number) => void;
  isSubmitting?: boolean;
}

export function AdditionalServicesPanel({
  patientId,
  patientName,
  onSave,
  onViewSummary,
  isSubmitting = false,
}: AdditionalServicesPanelProps) {
  const [services, setServices] = useState<ServicesState>(createEmptyServices);

  // Calculate running total
  const grandTotal = useMemo(() => {
    let total = 0;
    if (services.consultation.enabled) total += services.consultation.fee;
    if (services.ultrasound.enabled) total += services.ultrasound.charges;
    if (services.ecg.enabled) total += services.ecg.charges;
    if (services.injection.enabled) total += services.injection.charges * services.injection.quantity;
    if (services.retention.enabled) total += services.retention.charges;
    if (services.surgery.enabled) {
      total += services.surgery.operationCharges;
      total += services.surgery.otCharges;
      total += services.surgery.anesthesiaCharges;
    }
    return total;
  }, [services]);

  const updateConsultation = (updates: Partial<ServicesState['consultation']>) => {
    setServices(prev => ({
      ...prev,
      consultation: { ...prev.consultation, ...updates },
    }));
  };

  const updateUltrasound = (updates: Partial<ServicesState['ultrasound']>) => {
    setServices(prev => ({
      ...prev,
      ultrasound: { ...prev.ultrasound, ...updates },
    }));
  };

  const updateECG = (updates: Partial<ServicesState['ecg']>) => {
    setServices(prev => ({
      ...prev,
      ecg: { ...prev.ecg, ...updates },
    }));
  };

  const updateBPReading = (updates: Partial<ServicesState['bpReading']>) => {
    setServices(prev => ({
      ...prev,
      bpReading: { ...prev.bpReading, ...updates },
    }));
  };

  const updateInjection = (updates: Partial<ServicesState['injection']>) => {
    setServices(prev => ({
      ...prev,
      injection: { ...prev.injection, ...updates },
    }));
  };

  const updateRetention = (updates: Partial<ServicesState['retention']>) => {
    setServices(prev => ({
      ...prev,
      retention: { ...prev.retention, ...updates },
    }));
  };

  const updateSurgery = (updates: Partial<ServicesState['surgery']>) => {
    setServices(prev => ({
      ...prev,
      surgery: { ...prev.surgery, ...updates },
    }));
  };

  const handleSave = async () => {
    await onSave(services, grandTotal);
  };

  return (
    <div className="space-y-4">
      {/* Header with Patient Info and Running Total */}
      <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
        <div>
          <h3 className="font-semibold">Additional Services</h3>
          <p className="text-sm text-muted-foreground">
            Patient: {patientName} ({patientId})
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Running Total</p>
          <p className="text-2xl font-bold text-primary">Rs. {grandTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. Consultation */}
        <Card className={services.consultation.enabled ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="h-4 w-4" />
                Consultation
              </CardTitle>
              <Switch
                checked={services.consultation.enabled}
                onCheckedChange={(checked) => updateConsultation({ enabled: checked })}
              />
            </div>
          </CardHeader>
          {services.consultation.enabled && (
            <CardContent className="space-y-3">
              <div>
                <Label>Consultation Type</Label>
                <Select
                  value={services.consultation.type}
                  onValueChange={(value: ConsultationType) =>
                    updateConsultation({ type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Doctor Name</Label>
                <Input
                  value={services.consultation.doctorName}
                  onChange={(e) => updateConsultation({ doctorName: e.target.value })}
                  placeholder="Dr. Name"
                />
              </div>
              <div>
                <Label>Consultation Fee (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  value={services.consultation.fee || ''}
                  onChange={(e) => updateConsultation({ fee: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* 2. Ultrasound */}
        <Card className={services.ultrasound.enabled ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <HeartPulse className="h-4 w-4" />
                Ultrasound
              </CardTitle>
              <Switch
                checked={services.ultrasound.enabled}
                onCheckedChange={(checked) => updateUltrasound({ enabled: checked })}
              />
            </div>
          </CardHeader>
          {services.ultrasound.enabled && (
            <CardContent className="space-y-3">
              <div>
                <Label>Ultrasound Type</Label>
                <Select
                  value={services.ultrasound.type}
                  onValueChange={(value: UltrasoundType) =>
                    updateUltrasound({ type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abdomen">Abdomen</SelectItem>
                    <SelectItem value="Pelvic">Pelvic</SelectItem>
                    <SelectItem value="Pregnancy">Pregnancy</SelectItem>
                    <SelectItem value="Obstetric">Obstetric</SelectItem>
                    <SelectItem value="Thyroid">Thyroid</SelectItem>
                    <SelectItem value="Breast">Breast</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Charges (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  value={services.ultrasound.charges || ''}
                  onChange={(e) => updateUltrasound({ charges: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* 3. ECG */}
        <Card className={services.ecg.enabled ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                ECG
              </CardTitle>
              <Switch
                checked={services.ecg.enabled}
                onCheckedChange={(checked) => updateECG({ enabled: checked })}
              />
            </div>
          </CardHeader>
          {services.ecg.enabled && (
            <CardContent className="space-y-3">
              <div>
                <Label>ECG Type</Label>
                <Select
                  value={services.ecg.type}
                  onValueChange={(value: ECGType) => updateECG({ type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Resting">Resting</SelectItem>
                    <SelectItem value="Stress">Stress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Charges (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  value={services.ecg.charges || ''}
                  onChange={(e) => updateECG({ charges: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* 4. BP Module */}
        <Card className={services.bpReading.enabled ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                BP Reading
              </CardTitle>
              <Switch
                checked={services.bpReading.enabled}
                onCheckedChange={(checked) => updateBPReading({ enabled: checked })}
              />
            </div>
          </CardHeader>
          {services.bpReading.enabled && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Systolic</Label>
                  <Input
                    type="number"
                    min="0"
                    value={services.bpReading.systolic || ''}
                    onChange={(e) => updateBPReading({ systolic: parseInt(e.target.value) || 0 })}
                    placeholder="120"
                  />
                </div>
                <div>
                  <Label>Diastolic</Label>
                  <Input
                    type="number"
                    min="0"
                    value={services.bpReading.diastolic || ''}
                    onChange={(e) => updateBPReading({ diastolic: parseInt(e.target.value) || 0 })}
                    placeholder="80"
                  />
                </div>
                <div>
                  <Label>Pulse</Label>
                  <Input
                    type="number"
                    min="0"
                    value={services.bpReading.pulse || ''}
                    onChange={(e) => updateBPReading({ pulse: parseInt(e.target.value) || 0 })}
                    placeholder="72"
                  />
                </div>
              </div>
              <div>
                <Label>Recorded Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={services.bpReading.recordedAt.slice(0, 16)}
                  onChange={(e) => updateBPReading({ recordedAt: new Date(e.target.value).toISOString() })}
                />
              </div>
              <Badge variant="outline" className="w-full justify-center">
                BP: {services.bpReading.systolic}/{services.bpReading.diastolic} mmHg | Pulse: {services.bpReading.pulse} bpm
              </Badge>
            </CardContent>
          )}
        </Card>

        {/* 5. Injection Charges */}
        <Card className={services.injection.enabled ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Syringe className="h-4 w-4" />
                Injection Charges
              </CardTitle>
              <Switch
                checked={services.injection.enabled}
                onCheckedChange={(checked) => updateInjection({ enabled: checked })}
              />
            </div>
          </CardHeader>
          {services.injection.enabled && (
            <CardContent className="space-y-3">
              <div>
                <Label>Injection Type</Label>
                <Select
                  value={services.injection.type}
                  onValueChange={(value: InjectionType) => updateInjection({ type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IV">Intravenous (IV)</SelectItem>
                    <SelectItem value="IM">Intramuscular (IM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Injection Name</Label>
                <Input
                  value={services.injection.name}
                  onChange={(e) => updateInjection({ name: e.target.value })}
                  placeholder="Injection name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={services.injection.quantity || ''}
                    onChange={(e) => updateInjection({ quantity: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Charges (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={services.injection.charges || ''}
                    onChange={(e) => updateInjection({ charges: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 6. Retention Charges */}
        <Card className={services.retention.enabled ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Retention Charges
              </CardTitle>
              <Switch
                checked={services.retention.enabled}
                onCheckedChange={(checked) => updateRetention({ enabled: checked })}
              />
            </div>
          </CardHeader>
          {services.retention.enabled && (
            <CardContent className="space-y-3">
              <div>
                <Label>Retention Duration</Label>
                <Input
                  value={services.retention.duration}
                  onChange={(e) => updateRetention({ duration: e.target.value })}
                  placeholder="e.g., 2 hours, 1 day"
                />
              </div>
              <div>
                <Label>Charges (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  value={services.retention.charges || ''}
                  onChange={(e) => updateRetention({ charges: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* 7. Surgery */}
        <Card className={`md:col-span-2 ${services.surgery.enabled ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scissors className="h-4 w-4" />
                Surgery
              </CardTitle>
              <Switch
                checked={services.surgery.enabled}
                onCheckedChange={(checked) => updateSurgery({ enabled: checked })}
              />
            </div>
          </CardHeader>
          {services.surgery.enabled && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label>Surgery Type</Label>
                  <Select
                    value={services.surgery.type}
                    onValueChange={(value: SurgeryType) =>
                      updateSurgery({ type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Cesarean">Cesarean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Surgeon Name</Label>
                  <Input
                    value={services.surgery.surgeonName}
                    onChange={(e) => updateSurgery({ surgeonName: e.target.value })}
                    placeholder="Dr. Surgeon"
                  />
                </div>
                <div>
                  <Label>Surgery Date</Label>
                  <Input
                    type="date"
                    value={services.surgery.surgeryDate}
                    onChange={(e) => updateSurgery({ surgeryDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Operation Charges (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={services.surgery.operationCharges || ''}
                    onChange={(e) => updateSurgery({ operationCharges: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>OT Charges (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={services.surgery.otCharges || ''}
                    onChange={(e) => updateSurgery({ otCharges: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Anesthesia Charges (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={services.surgery.anesthesiaCharges || ''}
                    onChange={(e) => updateSurgery({ anesthesiaCharges: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Summary Footer */}
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">Grand Total: Rs. {grandTotal.toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onViewSummary(services, grandTotal)}>
            <FileText className="mr-2 h-4 w-4" />
            View Summary
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Services
          </Button>
        </div>
      </div>
    </div>
  );
}
