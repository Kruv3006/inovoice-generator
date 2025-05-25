
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Building, UserPlus, Trash2, FileText, PlusCircle, Save, Info, FileSignature, Shapes, Hash, RotateCcw, LayoutTemplate, DollarSign, Mail, Phone, MapPin, Download, Upload, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { CompanyProfileData, ClientData, SavedItemData, AppBackupData, AvailableCurrency } from '@/lib/invoice-types';
import { availableCurrencies } from '@/lib/invoice-types';
import {
  saveCompanyProfile, getCompanyProfile,
  getClients, addClient, updateClient, removeClient,
  getSavedItems, addSavedItem, removeSavedItem
} from '@/lib/settings-store';
import { getAllInvoices, saveInvoiceData, removeInvoiceData, INVOICE_STORAGE_KEY_PREFIX } from '@/lib/invoice-store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";


const companyProfileSchema = z.object({
  companyName: z.string().optional(),
  companyLogoFile: z.custom<FileList>().optional(),
  defaultInvoiceNotes: z.string().optional(),
  defaultTermsAndConditions: z.string().optional(),
  defaultTemplateStyle: z.enum(['classic', 'modern', 'compact']).optional().default('classic'),
  currencyCode: z.string().optional().default(availableCurrencies[0].code),
  showClientAddressOnInvoice: z.boolean().optional().default(true),
});
type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

const clientFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string().optional(),
  clientEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  clientPhone: z.string().optional(),
});
type ClientFormValues = z.infer<typeof clientFormSchema>;


const newSavedItemSchema = z.object({
  itemDescription: z.string().min(1, "Description is required"),
  itemRate: z.preprocess(
    (val) => parseFloat(String(val).replace(/[^0-9.]+/g, "")),
    z.number().min(0, "Rate must be non-negative")
  ),
  itemDefaultQuantity: z.preprocess(
    (val) => {
      const strVal = String(val).replace(/[^0-9.]+/g, "");
      if (strVal === "") return undefined; 
      const num = parseFloat(strVal);
      return isNaN(num) || num < 0 ? undefined : num;
    },
    z.number().min(0, "Quantity must be non-negative.").optional()
  ),
  itemDefaultUnit: z.string().optional(),
});
type NewSavedItemFormValues = z.infer<typeof newSavedItemSchema>;


const fileToDataUrl = (file: File, toastFn: ReturnType<typeof useToast>['toast']): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file) {
        resolve(null);
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => {
        toastFn({ variant: "destructive", title: "File Read Error", description: "Could not read the file." });
        resolve(null);
    };
    reader.readAsDataURL(file);
  });
};

export function SettingsForm() {
  const { toast } = useToast();
  const companyLogoFileRef = useRef<HTMLInputElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  // Company Profile State
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const companyProfileForm = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: '',
      defaultInvoiceNotes: '',
      defaultTermsAndConditions: '',
      defaultTemplateStyle: 'classic',
      currencyCode: availableCurrencies[0].code,
      showClientAddressOnInvoice: true,
    },
  });

  // Client Management State
  const [clients, setClients] = useState<ClientData[]>([]);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const clientForm = useForm<ClientFormValues>({ resolver: zodResolver(clientFormSchema) });


  // Saved Items State
  const [savedItems, setSavedItems] = useState<SavedItemData[]>([]);
  const newSavedItemForm = useForm<NewSavedItemFormValues>({ resolver: zodResolver(newSavedItemSchema) });

  useEffect(() => {
    const profile = getCompanyProfile();
    if (profile) {
      companyProfileForm.reset({
        companyName: profile.companyName || '',
        defaultInvoiceNotes: profile.defaultInvoiceNotes || '',
        defaultTermsAndConditions: profile.defaultTermsAndConditions || '',
        defaultTemplateStyle: profile.defaultTemplateStyle || 'classic',
        currencyCode: profile.currency?.code || availableCurrencies[0].code,
        showClientAddressOnInvoice: profile.showClientAddressOnInvoice === undefined ? true : profile.showClientAddressOnInvoice,
      });
      if (profile.companyLogoDataUrl) {
        setCompanyLogoPreview(profile.companyLogoDataUrl);
      }
    }
    setClients(getClients());
    setSavedItems(getSavedItems());
  }, [companyProfileForm]);

  const handleCompanyProfileSubmit = async (data: CompanyProfileFormValues) => {
    let logoDataUrl = companyLogoPreview;
    const newLogoFile = companyProfileForm.getValues("companyLogoFile");

    if (newLogoFile && newLogoFile.length > 0) {
      const file = newLogoFile[0];
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Logo File Too Large", description: "Logo must be less than 2MB." });
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid Logo File Type", description: "Logo must be PNG, JPEG, or GIF." });
        return;
      }
      logoDataUrl = await fileToDataUrl(file, toast);
      if (logoDataUrl) {
        setCompanyLogoPreview(logoDataUrl);
      } else {
        logoDataUrl = getCompanyProfile()?.companyLogoDataUrl || null;
        setCompanyLogoPreview(logoDataUrl);
        toast({ variant: "destructive", title: "Logo Upload Failed", description: "Could not process the logo file." });
      }
    } else if (data.companyLogoFile === undefined && companyLogoPreview) {
      logoDataUrl = companyLogoPreview;
    } else if (!companyLogoPreview && data.companyLogoFile === undefined) {
        logoDataUrl = null;
    }

    const selectedCurrency = availableCurrencies.find(c => c.code === data.currencyCode) || availableCurrencies[0];

    saveCompanyProfile({
      companyName: data.companyName,
      companyLogoDataUrl: logoDataUrl,
      defaultInvoiceNotes: data.defaultInvoiceNotes,
      defaultTermsAndConditions: data.defaultTermsAndConditions,
      defaultTemplateStyle: data.defaultTemplateStyle,
      currency: selectedCurrency,
      showClientAddressOnInvoice: data.showClientAddressOnInvoice,
    });
    toast({ title: "Company Profile Saved!", variant: "default" });
  };

  const handleClientSubmit = (data: ClientFormValues) => {
    if (editingClient) {
      const updatedClients = updateClient({ ...editingClient, ...data });
      setClients(updatedClients);
      setEditingClient(null);
      toast({ title: "Client Updated", variant: "default" });
    } else {
      const updatedClients = addClient(data);
      setClients(updatedClients);
      toast({ title: "Client Added", variant: "default" });
    }
    clientForm.reset({ clientName: '', clientAddress: '', clientEmail: '', clientPhone: '' });
  };

  const handleEditClient = (client: ClientData) => {
    setEditingClient(client);
    clientForm.reset({
        clientName: client.name,
        clientAddress: client.address || '',
        clientEmail: client.email || '',
        clientPhone: client.phone || '',
    });
  };

  const handleDeleteClient = (id: string) => {
    const updatedClients = removeClient(id);
    setClients(updatedClients);
    if (editingClient && editingClient.id === id) {
        setEditingClient(null);
        clientForm.reset({ clientName: '', clientAddress: '', clientEmail: '', clientPhone: '' });
    }
    toast({ title: "Client Removed", variant: "default" });
  };

  const handleAddSavedItem = (data: NewSavedItemFormValues) => {
    const updatedItems = addSavedItem(data.itemDescription, data.itemRate, data.itemDefaultQuantity, data.itemDefaultUnit);
    setSavedItems(updatedItems);
    newSavedItemForm.reset({ itemDescription: '', itemRate: 0, itemDefaultQuantity: undefined, itemDefaultUnit: '' });
    toast({ title: "Item Saved", variant: "default" });
  };

  const handleDeleteSavedItem = (id: string) => {
    const updatedItems = removeSavedItem(id);
    setSavedItems(updatedItems);
    toast({ title: "Item Removed", variant: "default" });
  };

  const watchedCompanyLogoFile = companyProfileForm.watch("companyLogoFile");

  useEffect(() => {
    if (watchedCompanyLogoFile && watchedCompanyLogoFile.length > 0) {
      const file = watchedCompanyLogoFile[0];
      if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        return;
      }
      fileToDataUrl(file, toast).then(dataUrl => {
        if (dataUrl) setCompanyLogoPreview(dataUrl);
      });
    } else if (!watchedCompanyLogoFile && !companyProfileForm.formState.isDirty) {
        const profile = getCompanyProfile();
        if (profile?.companyLogoDataUrl) {
            setCompanyLogoPreview(profile.companyLogoDataUrl);
        } else {
            setCompanyLogoPreview(null);
        }
    }
  }, [watchedCompanyLogoFile, companyProfileForm.formState.isDirty, toast]);


  const handleExportData = () => {
    try {
        const companyProfile = getCompanyProfile();
        const clientsData = getClients();
        const savedItemsData = getSavedItems();
        const invoicesData = getAllInvoices();

        const backupData: AppBackupData = {
            companyProfile,
            clients: clientsData,
            savedItems: savedItemsData,
            invoices: invoicesData,
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `invoicecraft_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast({ title: "Data Exported Successfully!", description: "Your backup file has been downloaded." });
    } catch (error) {
        console.error("Error exporting data:", error);
        toast({ variant: "destructive", title: "Export Failed", description: "Could not export data. Check console." });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
        toast({ variant: "destructive", title: "Import Failed", description: "No file selected." });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonString = e.target?.result as string;
            const importedData = JSON.parse(jsonString) as AppBackupData;

            if (importedData.companyProfile) {
                saveCompanyProfile(importedData.companyProfile);
            }
            if (importedData.clients && Array.isArray(importedData.clients)) {
                saveClients(importedData.clients);
            }
            if (importedData.savedItems && Array.isArray(importedData.savedItems)) {
                saveSavedItems(importedData.savedItems);
            }
            if (importedData.invoices && Array.isArray(importedData.invoices)) {
                // Clear existing invoices first to avoid duplicates if IDs clash or for a clean import
                const existingInvoiceIds = Object.keys(localStorage).filter(key => key.startsWith(INVOICE_STORAGE_KEY_PREFIX));
                existingInvoiceIds.forEach(key => localStorage.removeItem(key));
                
                importedData.invoices.forEach(invoice => saveInvoiceData(invoice.id, invoice));
            }

            toast({ title: "Data Imported Successfully!", description: "Please refresh the page to see all changes." });
            // Force reload or re-fetch states
            window.location.reload(); 

        } catch (error) {
            console.error("Error importing data:", error);
            toast({ variant: "destructive", title: "Import Failed", description: "Invalid backup file or format. Check console." });
        } finally {
            // Reset file input
            if (importFileRef.current) {
                importFileRef.current.value = "";
            }
        }
    };
    reader.readAsText(file);
  };


  return (
    <div className="space-y-12">
      {/* Company Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Building className="mr-2 h-5 w-5 text-primary" /> Company Profile</CardTitle>
          <CardDescription>Set your default company information, currency, and invoice appearance. This will pre-fill new invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={companyProfileForm.handleSubmit(handleCompanyProfileSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="companyNameProf">Company Name</Label>
              <Input id="companyNameProf" {...companyProfileForm.register("companyName")} placeholder="Your Company LLC" />
              <p className="text-xs text-muted-foreground mt-1">The name of your business as it will appear on invoices.</p>
            </div>
            <div>
              <Label>Company Logo (Optional, PNG/JPEG/GIF, &lt;2MB)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button type="button" variant="outline" onClick={() => companyLogoFileRef.current?.click()}>
                 {companyLogoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
                <Controller
                    name="companyLogoFile"
                    control={companyProfileForm.control}
                    render={({ field: { onChange, onBlur, name, ref } }) => (
                        <Input
                        type="file"
                        accept="image/png, image/jpeg, image/gif"
                        className="hidden"
                        ref={companyLogoFileRef}
                        name={name}
                        onBlur={onBlur}
                        onChange={(e) => {
                            const files = e.target.files;
                            onChange(files && files.length > 0 ? files : undefined);
                        }}
                        />
                    )}
                />
                {companyProfileForm.getValues("companyLogoFile")?.[0]?.name && (
                  <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                    {companyProfileForm.getValues("companyLogoFile")?.[0]?.name}
                  </span>
                )}
                 {companyLogoPreview && !companyProfileForm.getValues("companyLogoFile")?.[0]?.name && (
                  <span className="text-sm text-muted-foreground">Current logo active.</span>
                 )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Your company logo. It will appear on your invoices.</p>
              {companyLogoPreview && (
                <div className="mt-2 p-2 border rounded-md aspect-square relative w-24 h-24 bg-muted overflow-hidden">
                  <Image src={companyLogoPreview} alt="Company logo preview" layout="fill" objectFit="contain" data-ai-hint="company brand logo"/>
                </div>
              )}
            </div>
            
            <Controller
              control={companyProfileForm.control}
              name="currencyCode"
              render={({ field }) => (
                <div>
                  <Label htmlFor="defaultCurrencyProf" className="flex items-center"><DollarSign className="mr-2 h-4 w-4"/> Default Currency</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="defaultCurrencyProf">
                      <SelectValue placeholder="Select default currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map(curr => (
                        <SelectItem key={curr.code} value={curr.code}>{curr.name} ({curr.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Choose the default currency for your invoices.</p>
                </div>
              )}
            />

            <Controller
              control={companyProfileForm.control}
              name="defaultTemplateStyle"
              render={({ field }) => (
                <div>
                  <Label htmlFor="defaultTemplateStyleProf" className="flex items-center"><LayoutTemplate className="mr-2 h-4 w-4"/> Default Invoice Template Style</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="defaultTemplateStyleProf">
                      <SelectValue placeholder="Select default template style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classic - Traditional and professional</SelectItem>
                      <SelectItem value="modern">Modern - Sleek and contemporary</SelectItem>
                      <SelectItem value="compact">Compact - Minimalist and space-saving</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Choose the default look for your new invoices.</p>
                </div>
              )}
            />

            <div>
              <Label htmlFor="defaultInvoiceNotes">Default Invoice Notes</Label>
              <Textarea id="defaultInvoiceNotes" {...companyProfileForm.register("defaultInvoiceNotes")} placeholder="e.g., Payment is due within 30 days. Thank you for your business!" rows={3} />
              <p className="text-xs text-muted-foreground mt-1">Common notes you want to appear on every invoice.</p>
            </div>
            <div>
              <Label htmlFor="defaultTermsAndConditions">Default Terms &amp; Conditions</Label>
              <Textarea id="defaultTermsAndConditions" {...companyProfileForm.register("defaultTermsAndConditions")} placeholder="e.g., All services are subject to..." rows={5} />
               <p className="text-xs text-muted-foreground mt-1">Your standard terms and conditions that apply to invoices.</p>
            </div>
            <Controller
                control={companyProfileForm.control}
                name="showClientAddressOnInvoice"
                render={({ field }) => (
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="showClientAddressOnInvoiceSwitch"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="showClientAddressOnInvoiceSwitch" className="flex items-center">
                            {field.value ? <Eye className="mr-2 h-4 w-4"/> : <EyeOff className="mr-2 h-4 w-4"/>}
                             Show Client Address on Invoice by Default
                        </Label>
                    </div>
                )}
            />
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> Save Company Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Client Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><UserPlus className="mr-2 h-5 w-5 text-primary" /> Client Management</CardTitle>
          <CardDescription>Save client details for faster invoice creation. They'll appear in a dropdown on the invoice form.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={clientForm.handleSubmit(handleClientSubmit)} className="space-y-4 mb-6 p-4 border rounded-md">
            <h3 className="text-lg font-medium">{editingClient ? "Edit Client" : "Add New Client"}</h3>
            <div>
              <Label htmlFor="clientNameInput">Client Name *</Label>
              <Input id="clientNameInput" {...clientForm.register("clientName")} placeholder="e.g., Priya Sharma Consulting" />
              {clientForm.formState.errors.clientName && <p className="text-sm text-destructive mt-1">{clientForm.formState.errors.clientName.message}</p>}
            </div>
            <div>
              <Label htmlFor="clientAddressInput" className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/> Client Address (Optional)</Label>
              <Textarea id="clientAddressInput" {...clientForm.register("clientAddress")} placeholder="123 Main St, Anytown, India" rows={2}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="clientEmailInput" className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/> Client Email (Optional)</Label>
                    <Input id="clientEmailInput" type="email" {...clientForm.register("clientEmail")} placeholder="client@example.com" />
                    {clientForm.formState.errors.clientEmail && <p className="text-sm text-destructive mt-1">{clientForm.formState.errors.clientEmail.message}</p>}
                </div>
                <div>
                    <Label htmlFor="clientPhoneInput" className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground"/> Client Phone (Optional)</Label>
                    <Input id="clientPhoneInput" type="tel" {...clientForm.register("clientPhone")} placeholder="+91 9876543210" />
                </div>
            </div>
            <div className="flex gap-2">
                <Button type="submit" variant={editingClient ? "default" : "outline"} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> {editingClient ? "Update Client" : "Add Client"}
                </Button>
                {editingClient && (
                    <Button type="button" variant="ghost" onClick={() => { setEditingClient(null); clientForm.reset({ clientName: '', clientAddress: '', clientEmail: '', clientPhone: '' }); }} className="w-full sm:w-auto">
                        Cancel Edit
                    </Button>
                )}
            </div>
          </form>

          {clients.length > 0 ? (
            <ul className="space-y-2">
              {clients.map(client => (
                <li key={client.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border rounded-md bg-card hover:bg-muted/50">
                  <div className="flex-grow mb-2 sm:mb-0">
                    <span className="text-sm font-medium block">{client.name}</span>
                    {client.email && <span className="text-xs text-muted-foreground block"><Mail className="inline mr-1 h-3 w-3"/>{client.email}</span>}
                    {client.phone && <span className="text-xs text-muted-foreground block"><Phone className="inline mr-1 h-3 w-3"/>{client.phone}</span>}
                    {client.address && <span className="text-xs text-muted-foreground block"><MapPin className="inline mr-1 h-3 w-3"/>{client.address.replace(/\n/g, ', ')}</span>}
                  </div>
                  <div className="flex gap-1 self-start sm:self-center">
                     <Button variant="ghost" size="icon" aria-label={`Edit client ${client.name}`} onClick={() => handleEditClient(client)}>
                        <FileSignature className="h-4 w-4 text-blue-500" />
                      </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Remove client ${client.name}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the client "{client.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteClient(client.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete Client
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
                <Info className="mx-auto h-10 w-10 mb-3" />
                <p className="text-sm font-semibold">No clients saved yet.</p>
                <p className="text-xs mt-1">Add clients here to quickly select them when creating invoices.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Saved Invoice Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" /> Saved Invoice Items</CardTitle>
          <CardDescription>Save common line items (description, rate, default quantity, default unit) for quick use in invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={newSavedItemForm.handleSubmit(handleAddSavedItem)} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemDescriptionInput">Item Description</Label>
                <Input id="itemDescriptionInput" {...newSavedItemForm.register("itemDescription")} placeholder="e.g., Web Development Hour" />
                {newSavedItemForm.formState.errors.itemDescription && <p className="text-sm text-destructive mt-1">{newSavedItemForm.formState.errors.itemDescription.message}</p>}
              </div>
              <div>
                <Label htmlFor="itemRateInput">Item Rate ({getCompanyProfile()?.currency?.symbol || '₹'})</Label>
                <Input id="itemRateInput" type="number" step="0.01" {...newSavedItemForm.register("itemRate")} placeholder="100.00" />
                {newSavedItemForm.formState.errors.itemRate && <p className="text-sm text-destructive mt-1">{newSavedItemForm.formState.errors.itemRate.message}</p>}
              </div>
              <div>
                <Label htmlFor="itemDefaultQuantityInput">Default Quantity (Optional)</Label>
                <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="itemDefaultQuantityInput" type="number" step="1" {...newSavedItemForm.register("itemDefaultQuantity")} placeholder="1" className="pl-8"/>
                </div>
                {newSavedItemForm.formState.errors.itemDefaultQuantity && <p className="text-sm text-destructive mt-1">{newSavedItemForm.formState.errors.itemDefaultQuantity.message}</p>}
              </div>
              <div>
                <Label htmlFor="itemDefaultUnitInput">Default Unit (Optional)</Label>
                 <div className="relative">
                    <Shapes className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="itemDefaultUnitInput" {...newSavedItemForm.register("itemDefaultUnit")} placeholder="e.g., hours, pcs" className="pl-8"/>
                 </div>
                {newSavedItemForm.formState.errors.itemDefaultUnit && <p className="text-sm text-destructive mt-1">{newSavedItemForm.formState.errors.itemDefaultUnit.message}</p>}
              </div>
            </div>
            <Button type="submit" variant="outline" className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add Item to Saved List</Button>
          </form>
          {savedItems.length > 0 ? (
            <ul className="space-y-2">
              {savedItems.map(item => (
                <li key={item.id} className="flex justify-between items-center p-3 border rounded-md bg-card hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Rate: {getCompanyProfile()?.currency?.symbol || '₹'}{item.rate.toFixed(2)}
                      {item.defaultQuantity != null && `, Qty: ${item.defaultQuantity}`}
                      {item.defaultUnit && `, Unit: ${item.defaultUnit}`}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Remove saved item ${item.description}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This action cannot be undone. This will permanently delete the saved item "{item.description}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSavedItem(item.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete Item
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
             <div className="text-center py-6 text-muted-foreground">
                <Info className="mx-auto h-10 w-10 mb-3" />
                <p className="text-sm font-semibold">No items saved yet.</p>
                <p className="text-xs mt-1">Save common invoice line items here for faster invoice creation.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Separator />

       {/* Data Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Database className="mr-2 h-5 w-5 text-primary" /> Data Management</CardTitle>
          <CardDescription>Export all your application data for backup, or import a previous backup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleExportData} variant="outline" className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Export All Data
                </Button>
                <Button type="button" variant="outline" onClick={() => importFileRef.current?.click()} className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" /> Import Data
                </Button>
                <Input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    ref={importFileRef} 
                    onChange={handleImportData}
                />
            </div>
            <p className="text-xs text-muted-foreground">
                Export creates a JSON file with your company profile, clients, saved items, and all invoices.
                Importing will overwrite existing data with the content of the backup file. Use with caution.
            </p>
        </CardContent>
      </Card>

    </div>
  );
}

// Helper icon - replace with actual Lucide icon if available or keep as is
const Database = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

    