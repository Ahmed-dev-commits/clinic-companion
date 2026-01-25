import { useState, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, RotateCcw, Upload, X, Building2, User, Image } from 'lucide-react';

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState(settings);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 500 * 1024) { // 500KB limit
      toast.error('Logo size should be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!formData.clinicName.trim()) {
      toast.error('Clinic name is required');
      return;
    }
    if (!formData.doctorName.trim()) {
      toast.error('Doctor name is required');
      return;
    }

    updateSettings(formData);
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    resetSettings();
    setFormData({
      clinicName: 'MediCare Hospital',
      address: '123 Healthcare Avenue, Medical District',
      city: 'City, State - 400001',
      phone: '+91 98765 43210',
      email: 'care@medicare.com',
      doctorName: 'Dr. Rajesh Kumar',
      doctorQualification: 'MBBS, MD (General Medicine)',
      doctorRegNo: 'MCI-12345-2020',
      consultationHours: '10 AM - 6 PM',
      logo: null,
    });
    toast.success('Settings reset to defaults');
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Customize clinic details for printed documents"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clinic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Clinic Information</CardTitle>
            </div>
            <CardDescription>
              This information will appear on all printed documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Clinic Name *</Label>
              <Input
                value={formData.clinicName}
                onChange={(e) => handleChange('clinicName', e.target.value)}
                placeholder="Enter clinic name"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div>
              <Label>City / State / PIN</Label>
              <Input
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="City, State - PIN Code"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Email address"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctor Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Doctor Information</CardTitle>
            </div>
            <CardDescription>
              Doctor details for prescriptions and receipts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Doctor Name *</Label>
              <Input
                value={formData.doctorName}
                onChange={(e) => handleChange('doctorName', e.target.value)}
                placeholder="Dr. Full Name"
              />
            </div>
            <div>
              <Label>Qualification</Label>
              <Input
                value={formData.doctorQualification}
                onChange={(e) => handleChange('doctorQualification', e.target.value)}
                placeholder="e.g., MBBS, MD"
              />
            </div>
            <div>
              <Label>Registration Number</Label>
              <Input
                value={formData.doctorRegNo}
                onChange={(e) => handleChange('doctorRegNo', e.target.value)}
                placeholder="Medical council registration"
              />
            </div>
            <div>
              <Label>Consultation Hours</Label>
              <Input
                value={formData.consultationHours}
                onChange={(e) => handleChange('consultationHours', e.target.value)}
                placeholder="e.g., 10 AM - 6 PM"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo Upload */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              <CardTitle>Clinic Logo</CardTitle>
            </div>
            <CardDescription>
              Upload a logo to display on printed documents (max 500KB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {formData.logo ? (
                  <div className="relative">
                    <img
                      src={formData.logo}
                      alt="Clinic logo"
                      className="w-32 h-32 object-contain border rounded-lg bg-white p-2"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                    <div className="text-center text-muted-foreground">
                      <Image className="h-8 w-8 mx-auto mb-1" />
                      <span className="text-xs">No logo</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, PNG or JPG format
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Separator className="my-6" />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
