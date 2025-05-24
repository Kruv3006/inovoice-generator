
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Building, UserPlus, Trash2, FileText, PlusCircle, Save, Info, FileSignature } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { CompanyProfileData, ClientData, SavedItemData } from '@/lib/invoice-types';
import { 
  saveCompanyProfile, getCompanyProfile,
  getClients, addClient, removeClient,
  getSavedItems, addSavedItem, removeSavedItem
} from '@/lib/settings-store';

const companyProfileSchema = z.object({
  companyName: z.string().optional(),
  companyLogoFile: z.custom<FileList>().optional(),
  defaultInvoiceNotes: z.string().optional(),
  defaultTermsAndConditions: z.string().optional(),
});
type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

const newClientSchema = z.object({ clientName: z.string().min(1, "Client name is required") });
type NewClientFormValues = z.infer<typeof newClientSchema>;

const newSavedItemSchema = z.object({
  itemDescription: z.string().min(1, "Description is required"),
  itemRate: z.preprocess(
    (val) => parseFloat(String(val).replace(/[^0-9.]+/g, "")),
    z.number().min(0, "Rate must be non-negative")
  ),
});
type NewSavedItemFormValues = z.infer<typeof newSavedItemSchema>;

const fileToDataUrl = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file) {
        resolve(null);
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export function SettingsForm() {
  const { toast } = useToast();
  const companyLogoFileRef = useRef<HTMLInputElement | null>(null);

  // Company Profile State
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const companyProfileForm = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: { companyName: '', defaultInvoiceNotes: '', defaultTermsAndConditions: '' },
  });

  // Client Management State
  const [clients, setClients] = useState<ClientData[]>([]);
  const newClientForm = useForm<NewClientFormValues>({ resolver: zodResolver(newClientSchema) });

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
      logoDataUrl = await fileToDataUrl(file);
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


    saveCompanyProfile({
      companyName: data.companyName,
      companyLogoDataUrl: logoDataUrl,
      defaultInvoiceNotes: data.defaultInvoiceNotes,
      defaultTermsAndConditions: data.defaultTermsAndConditions,
    });
    toast({ title: "Company Profile Saved!", variant: "default" });
  };

  const handleAddClient = (data: NewClientFormValues) => {
    const updatedClients = addClient(data.clientName);
    setClients(updatedClients);
    newClientForm.reset({ clientName: '' });
    toast({ title: "Client Added", variant: "default" });
  };

  const handleDeleteClient = (id: string) => {
    const updatedClients = removeClient(id);
    setClients(updatedClients);
    toast({ title: "Client Removed", variant: "default" });
  };

  const handleAddSavedItem = (data: NewSavedItemFormValues) => {
    const updatedItems = addSavedItem(data.itemDescription, data.itemRate);
    setSavedItems(updatedItems);
    newSavedItemForm.reset({ itemDescription: '', itemRate: 0 });
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
        // Validation handled in submit, preview just tries its best
        return;
      }
      fileToDataUrl(file).then(dataUrl => {
        if (dataUrl) setCompanyLogoPreview(dataUrl);
      });
    } else if (!watchedCompanyLogoFile && !companyProfileForm.formState.isDirty) { 
        // Only revert to stored preview if the field hasn't been touched
        // or if the form isn't dirty (meaning it was just loaded or reset)
        const profile = getCompanyProfile();
        if (profile?.companyLogoDataUrl) {
            setCompanyLogoPreview(profile.companyLogoDataUrl);
        } else {
            setCompanyLogoPreview(null); 
        }
    }
  }, [watchedCompanyLogoFile, companyProfileForm.formState.isDirty]);


  return (
    <div className="space-y-12">
      {/* Company Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Building className="mr-2 h-5 w-5 text-primary" /> Company Profile</CardTitle>
          <CardDescription>Set your default company information for invoices. This will pre-fill new invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={companyProfileForm.handleSubmit(handleCompanyProfileSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" {...companyProfileForm.register("companyName")} placeholder="Your Company LLC" />
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
                        ref={companyLogoFileRef} // Use the ref for the button click
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
              {companyLogoPreview && (
                <div className="mt-2 p-2 border rounded-md aspect-square relative w-24 h-24 bg-muted overflow-hidden">
                  <Image src={companyLogoPreview} alt="Company logo preview" layout="fill" objectFit="contain" data-ai-hint="company brand logo" />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="defaultInvoiceNotes">Default Invoice Notes</Label>
              <Textarea id="defaultInvoiceNotes" {...companyProfileForm.register("defaultInvoiceNotes")} placeholder="e.g., Payment is due within 30 days. Thank you for your business!" rows={3} />
            </div>
            <div>
              <Label htmlFor="defaultTermsAndConditions">Default Terms &amp; Conditions</Label>
              <Textarea id="defaultTermsAndConditions" {...companyProfileForm.register("defaultTermsAndConditions")} placeholder="e.g., All services are subject to..." rows={5} />
            </div>
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
          <CardDescription>Save and manage your frequent clients. They will be available in a dropdown when creating invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={newClientForm.handleSubmit(handleAddClient)} className="flex flex-col sm:flex-row sm:items-end gap-2 mb-6">
            <div className="flex-grow w-full sm:w-auto">
              <Label htmlFor="clientNameInput">New Client Name</Label>
              <Input id="clientNameInput" {...newClientForm.register("clientName")} placeholder="e.g., Priya Sharma Consulting" />
              {newClientForm.formState.errors.clientName && <p className="text-sm text-destructive mt-1">{newClientForm.formState.errors.clientName.message}</p>}
            </div>
            <Button type="submit" variant="outline" className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add Client</Button>
          </form>
          {clients.length > 0 ? (
            <ul className="space-y-2">
              {clients.map(client => (
                <li key={client.id} className="flex justify-between items-center p-3 border rounded-md bg-muted/20">
                  <span className="text-sm font-medium">{client.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id)} aria-label={`Remove client ${client.name}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
                <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No clients saved yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Add clients here to quickly select them when creating invoices.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Saved Invoice Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" /> Saved Invoice Items</CardTitle>
          <CardDescription>Save frequently used line items for quick invoice creation. They can be loaded directly into an invoice.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={newSavedItemForm.handleSubmit(handleAddSavedItem)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
            <div className="md:col-span-2">
              <Label htmlFor="itemDescriptionInput">Item Description</Label>
              <Input id="itemDescriptionInput" {...newSavedItemForm.register("itemDescription")} placeholder="e.g., Web Development Services" />
              {newSavedItemForm.formState.errors.itemDescription && <p className="text-sm text-destructive mt-1">{newSavedItemForm.formState.errors.itemDescription.message}</p>}
            </div>
            <div>
              <Label htmlFor="itemRateInput">Item Rate (₹)</Label>
              <Input id="itemRateInput" type="number" step="0.01" {...newSavedItemForm.register("itemRate")} placeholder="100.00" />
              {newSavedItemForm.formState.errors.itemRate && <p className="text-sm text-destructive mt-1">{newSavedItemForm.formState.errors.itemRate.message}</p>}
            </div>
            <Button type="submit" variant="outline" className="w-full md:w-auto md:col-start-3"><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
          </form>
          {savedItems.length > 0 ? (
            <ul className="space-y-2">
              {savedItems.map(item => (
                <li key={item.id} className="flex justify-between items-center p-3 border rounded-md bg-muted/20">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">Rate: ₹{item.rate.toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSavedItem(item.id)} aria-label={`Remove saved item ${item.description}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
                <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No items saved yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Save common invoice line items here for faster invoice creation.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
