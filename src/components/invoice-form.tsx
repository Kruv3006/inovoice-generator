
"use client";

import type { ElementRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { format, isValid, parseISO, differenceInCalendarDays } from "date-fns";
import { CalendarIcon, ImageUp, PartyPopper, Building, Hash, PlusCircle, Trash2, User, ListCollapse } from "lucide-react"; // Added User, ListCollapse
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Added Select
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceFormSchemaType, StoredInvoiceData, LineItem, StoredLineItem, ClientData, SavedItemData, CompanyProfileData } from "@/lib/invoice-types";
import { invoiceFormSchema } from "@/lib/invoice-types";
import { getInvoiceData, saveInvoiceData } from "@/lib/invoice-store";
import { getCompanyProfile, getClients, getSavedItems } from "@/lib/settings-store"; // Added settings store imports

const fileToDataUrl = (file: File, toastFn: ReturnType<typeof useToast>['toast']): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file) {
        resolve(null);
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      toastFn({ variant: "destructive", title: "File Read Error", description: "Could not read the file." });
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
};

export function InvoiceForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [calculatedTotalFee, setCalculatedTotalFee] = useState<number>(0);
  
  const [clients, setClients] = useState<ClientData[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItemData[]>([]);
  
  const watermarkFileRef = useRef<HTMLInputElement | null>(null);
  const companyLogoFileRef = useRef<HTMLInputElement | null>(null);

  const defaultItem: LineItem = { 
    description: "", 
    quantity: 1, 
    rate: 0, 
    itemStartDate: undefined, 
    itemEndDate: undefined 
  };

  const defaultFormValues: InvoiceFormSchemaType = {
    invoiceNumber: String(Date.now()).slice(-6),
    customerName: "",
    companyName: "",
    invoiceDate: new Date(),
    items: [defaultItem],
    invoiceNotes: "", // Will be overridden by company profile or existing invoice
    companyLogoFile: undefined,
    watermarkFile: undefined,
    watermarkOpacity: 0.05,
  };

  const form = useForm<InvoiceFormSchemaType>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultFormValues,
    mode: "onChange", 
  });

  const { watch, control, reset, setValue, trigger, getValues, formState: { errors } } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedWatermarkOpacity = watch("watermarkOpacity");

  useEffect(() => {
    // Load clients and saved items from settings store
    setClients(getClients());
    setSavedItems(getSavedItems());
  }, []);

  useEffect(() => {
    if (watchedItems) {
      let total = 0;
      watchedItems.forEach((item) => {
        let quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;

        if (item.itemStartDate && item.itemEndDate && isValid(item.itemStartDate) && isValid(item.itemEndDate) && item.itemEndDate >= item.itemStartDate) {
          const days = differenceInCalendarDays(item.itemEndDate, item.itemStartDate) + 1;
          quantity = days;
        }
        total += quantity * rate;
      });
      setCalculatedTotalFee(total);
    }
  }, [watchedItems]);

  useEffect(() => {
    const invoiceIdToEdit = searchParams.get('id');
    const companyProfile = getCompanyProfile();
    let baseFormValues = { ...defaultFormValues };

    if (companyProfile) {
      baseFormValues.companyName = companyProfile.companyName || baseFormValues.companyName;
      baseFormValues.invoiceNotes = companyProfile.defaultInvoiceNotes || baseFormValues.invoiceNotes;
      if (companyProfile.companyLogoDataUrl) {
        setCompanyLogoPreview(companyProfile.companyLogoDataUrl);
      }
    }
    
    if (invoiceIdToEdit && !initialDataLoaded) {
      const data = getInvoiceData(invoiceIdToEdit);
      if (data) {
        const formItems = data.items?.map(item => ({
          ...item,
          itemStartDate: item.itemStartDate ? parseISO(item.itemStartDate) : undefined,
          itemEndDate: item.itemEndDate ? parseISO(item.itemEndDate) : undefined,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
        })) || [defaultItem];

        const formData: InvoiceFormSchemaType = {
          ...baseFormValues, // Start with profile defaults
          ...data, // Override with invoice-specific data
          invoiceDate: data.invoiceDate ? (parseISO(data.invoiceDate) instanceof Date && !isNaN(parseISO(data.invoiceDate).valueOf()) ? parseISO(data.invoiceDate) : new Date()) : new Date(),
          items: formItems.length > 0 ? formItems : [defaultItem],
          companyLogoFile: undefined, 
          watermarkFile: undefined,
          watermarkOpacity: data.watermarkOpacity ?? baseFormValues.watermarkOpacity,
          invoiceNotes: data.invoiceNotes ?? baseFormValues.invoiceNotes, // Prioritize invoice notes over profile default
        };
        reset(formData);

        if (data.watermarkDataUrl) setWatermarkPreview(data.watermarkDataUrl);
        // Company logo preview is already set if profile has one, or if invoice had one (data.companyLogoDataUrl)
        if (data.companyLogoDataUrl) setCompanyLogoPreview(data.companyLogoDataUrl);
        
      } else {
        toast({ title: "Edit Error", description: "Could not load invoice data for editing. Using defaults.", variant: "destructive" });
        reset(baseFormValues); // Reset to profile defaults or app defaults
        setWatermarkPreview(null); // Clear watermark if invoice not found
        // Company logo already handled by profile logic
      }
      setInitialDataLoaded(true);
    } else if (!invoiceIdToEdit && !initialDataLoaded) {
      reset(baseFormValues); // Reset to profile defaults or app defaults
      setWatermarkPreview(null);
      // Company logo already handled by profile logic
      setInitialDataLoaded(true); 
    }
  }, [searchParams, reset, toast, initialDataLoaded, defaultFormValues, defaultItem]);

  const watchedCompanyLogoFile = watch("companyLogoFile");
  const watchedWatermarkFile = watch("watermarkFile");

  useEffect(() => {
    const currentInvoiceId = searchParams.get('id');
    const existingData = currentInvoiceId ? getInvoiceData(currentInvoiceId) : null;
    const profileData = getCompanyProfile();
  
    if (watchedCompanyLogoFile && watchedCompanyLogoFile.length > 0) {
      const file = watchedCompanyLogoFile[0];
       if (file.size > 2 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Logo File Too Large", description: "Logo must be less than 2MB." });
        setValue('companyLogoFile', undefined, { shouldValidate: true });
        setCompanyLogoPreview(existingData?.companyLogoDataUrl || profileData?.companyLogoDataUrl || null);
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid Logo File Type", description: "Logo must be PNG, JPEG, or GIF." });
        setValue('companyLogoFile', undefined, { shouldValidate: true });
        setCompanyLogoPreview(existingData?.companyLogoDataUrl || profileData?.companyLogoDataUrl || null);
        return;
      }
      fileToDataUrl(file, toast).then(dataUrl => {
        if (dataUrl) {
          setCompanyLogoPreview(dataUrl);
        } else { 
          setValue('companyLogoFile', undefined, { shouldValidate: true });
          setCompanyLogoPreview(existingData?.companyLogoDataUrl || profileData?.companyLogoDataUrl || null);
        }
      });
    } else {
      // No new file selected, maintain existing preview (from invoice or profile)
      const currentLogoFileValue = getValues('companyLogoFile');
      if (!currentLogoFileValue || currentLogoFileValue.length === 0) {
        if (existingData?.companyLogoDataUrl) {
          setCompanyLogoPreview(existingData.companyLogoDataUrl);
        } else if (profileData?.companyLogoDataUrl) {
          setCompanyLogoPreview(profileData.companyLogoDataUrl);
        } else {
          setCompanyLogoPreview(null);
        }
      }
    }
  }, [watchedCompanyLogoFile, searchParams, setValue, toast, getValues]);

  useEffect(() => {
    const currentInvoiceId = searchParams.get('id');
    const existingData = currentInvoiceId ? getInvoiceData(currentInvoiceId) : null;
  
    if (watchedWatermarkFile && watchedWatermarkFile.length > 0) {
      const file = watchedWatermarkFile[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Watermark File Too Large", description: "Watermark must be less than 5MB." });
        setValue('watermarkFile', undefined, { shouldValidate: true });
        setWatermarkPreview(existingData?.watermarkDataUrl || null);
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid Watermark File Type", description: "Watermark must be PNG, JPEG, or GIF." });
        setValue('watermarkFile', undefined, { shouldValidate: true });
        setWatermarkPreview(existingData?.watermarkDataUrl || null);
        return;
      }
      fileToDataUrl(file, toast).then(dataUrl => {
        if (dataUrl) {
          setWatermarkPreview(dataUrl);
        } else {
          setValue('watermarkFile', undefined, { shouldValidate: true }); 
          setWatermarkPreview(existingData?.watermarkDataUrl || null);
        }
      });
    } else {
      const currentWatermarkFileValue = getValues('watermarkFile');
       if (existingData?.watermarkDataUrl && (!currentWatermarkFileValue || currentWatermarkFileValue.length === 0)) {
        setWatermarkPreview(existingData.watermarkDataUrl);
      } else if (!existingData?.watermarkDataUrl && (!currentWatermarkFileValue || currentWatermarkFileValue.length === 0)) {
        setWatermarkPreview(null);
      }
    }
  }, [watchedWatermarkFile, searchParams, setValue, toast, getValues]);
  
  async function onSubmit(data: InvoiceFormSchemaType) {
    setIsSubmitting(true);
    try {
      const invoiceIdToEdit = searchParams.get('id');
      const existingInvoiceData = invoiceIdToEdit ? getInvoiceData(invoiceIdToEdit) : null;
      const companyProfile = getCompanyProfile();

      const invoiceId = existingInvoiceData?.id || `inv_${Date.now()}`;
      
      let companyLogoDataUrlToStore: string | null = companyLogoPreview; // Preview always holds the latest visual
      if (!data.companyLogoFile || data.companyLogoFile.length === 0) {
        // If no new file is chosen, rely on existing preview (which could be from old invoice or profile)
        companyLogoDataUrlToStore = companyLogoPreview;
      }
      // if a file was chosen, companyLogoPreview should have been updated by its useEffect

      let watermarkDataUrlToStore: string | null = watermarkPreview;
      if (!data.watermarkFile || data.watermarkFile.length === 0) {
        watermarkDataUrlToStore = watermarkPreview;
      }

      const itemsToStore: StoredLineItem[] = data.items.map(item => {
        let quantity = Number(item.quantity) || 0;
        if (item.itemStartDate && item.itemEndDate && isValid(item.itemStartDate) && isValid(item.itemEndDate) && item.itemEndDate >= item.itemStartDate) {
            quantity = differenceInCalendarDays(item.itemEndDate, item.itemStartDate) + 1;
        }
        return {
          ...item,
          quantity,
          itemStartDate: item.itemStartDate ? item.itemStartDate.toISOString() : undefined,
          itemEndDate: item.itemEndDate ? item.itemEndDate.toISOString() : undefined,
        };
      });

      const totalFee = itemsToStore.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        return sum + (quantity * rate);
      }, 0);
      
      const storedData: StoredInvoiceData = {
        id: invoiceId,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate.toISOString(),
        customerName: data.customerName,
        companyName: data.companyName,
        companyLogoDataUrl: companyLogoDataUrlToStore,
        items: itemsToStore,
        totalFee: totalFee,
        invoiceNotes: data.invoiceNotes,
        watermarkDataUrl: watermarkDataUrlToStore,
        watermarkOpacity: data.watermarkOpacity ?? 0.05,
      };

      saveInvoiceData(invoiceId, storedData);

      toast({
        title: `Invoice ${invoiceIdToEdit ? 'Updated' : 'Details Saved'}!`,
        description: "Redirecting to preview...",
        variant: "default"
      });
      router.push(`/invoice/preview/${invoiceId}`);

    } catch (error) {
      console.error("Submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSavedItemSelect = (itemId: string, itemIndex: number) => {
    const selectedSavedItem = savedItems.find(si => si.id === itemId);
    if (selectedSavedItem) {
      setValue(`items.${itemIndex}.description`, selectedSavedItem.description);
      setValue(`items.${itemIndex}.rate`, selectedSavedItem.rate);
      trigger(`items.${itemIndex}.description`); // Trigger validation/update
      trigger(`items.${itemIndex}.rate`);
    }
  };


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl my-8">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">
          {searchParams.get('id') ? "Edit Invoice" : "Create New Invoice"}
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">Fill in the details below to generate your invoice.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="e.g., 00123" {...field} className="pl-8" />
                        </div>
                        </FormControl>
                        <FormDescription>A unique identifier for this invoice (e.g., INV-001).</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Invoice Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal justify-start",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>The date the invoice is issued.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <Separator />
            <CardTitle className="text-xl font-semibold">Your Details</CardTitle>

             <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Your Company Name</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g., Acme Innovations Pvt. Ltd." {...field} />
                    </FormControl>
                    <FormDescription>Your company's name as it should appear on the invoice. You can set a default in Settings.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
              control={control}
              name="companyLogoFile"
              render={({ field: { onChange, onBlur, name, value: formFieldValue } }) => ( 
                <FormItem>
                  <FormLabel>Company Logo (Optional, PNG/JPEG/GIF, &lt;2MB)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                       <Button type="button" variant="outline" onClick={() => companyLogoFileRef.current?.click()}>
                        <Building className="mr-2 h-4 w-4" /> {companyLogoPreview ? "Change Logo" : "Upload Logo"}
                      </Button>
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
                      {formFieldValue && formFieldValue.length > 0 && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{formFieldValue[0].name}</span>}
                       {companyLogoPreview && (!formFieldValue || formFieldValue.length === 0) && <span className="text-sm text-muted-foreground truncate max-w-[200px]">Current logo active</span>}
                    </div>
                  </FormControl>
                   <FormDescription>
                    {(searchParams.get('id') || getCompanyProfile()?.companyLogoDataUrl) && companyLogoPreview && (!formFieldValue || formFieldValue.length === 0) 
                      ? "Current logo (from profile or this invoice) will be used unless a new image is uploaded." 
                      : "Upload a logo to display on the invoice. Set a default in Settings."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {companyLogoPreview && (
              <div className="mt-2">
                <FormLabel>Logo Preview</FormLabel>
                <div className="mt-1 p-2 border rounded-md aspect-square relative w-24 h-24 bg-muted overflow-hidden">
                  <Image src={companyLogoPreview} alt="Company logo preview" layout="fill" objectFit="contain" data-ai-hint="company brand logo"/>
                </div>
              </div>
            )}
            
            <Separator />
            <CardTitle className="text-xl font-semibold">Client Details</CardTitle>

             <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    {clients.length > 0 ? (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select or type a customer name" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input placeholder="e.g., Priya Sharma" {...field} />
                      </FormControl>
                    )}
                    <FormDescription>
                      {clients.length > 0 ? "Select from saved clients or type a new name." : "Enter the customer's name. You can save clients in Settings for faster entry."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <Separator className="my-6" />
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <FormLabel className="text-xl font-semibold">Invoice Items</FormLabel>
              </div>
              <FormDescription className="mb-4">Add items or services provided. For services with a duration, provide start/end dates and a per-day rate. The quantity will be calculated automatically as days.</FormDescription>
              <div className="space-y-6 mt-4">
                {fields.map((item, index) => {
                  const itemStartDate = watch(`items.${index}.itemStartDate`);
                  const itemEndDate = watch(`items.${index}.itemEndDate`);
                  let calculatedDays = 0;
                  let quantityIsCalculated = false;

                  if (itemStartDate && itemEndDate && isValid(itemStartDate) && isValid(itemEndDate) && itemEndDate >= itemStartDate) {
                    calculatedDays = differenceInCalendarDays(itemEndDate, itemStartDate) + 1;
                    quantityIsCalculated = true;
                  }
                  
                  const currentQuantity = quantityIsCalculated ? calculatedDays : (getValues(`items.${index}.quantity`) || 0);
                  const currentRate = getValues(`items.${index}.rate`) || 0;
                  const itemAmount = (Number(currentQuantity) * Number(currentRate)).toFixed(2);

                  return (
                  <div key={item.id} className="p-4 border rounded-md shadow-sm space-y-4 bg-card">
                    <div className="flex justify-between items-start">
                        <div className="flex-grow">
                            <FormField
                            control={control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Web Development, Daily Consulting" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                        {savedItems.length > 0 && (
                            <div className="ml-2 mt-7">
                                <Select onValueChange={(value) => handleSavedItemSelect(value, index)}>
                                    <SelectTrigger className="w-[180px]" aria-label="Select saved item">
                                        <ListCollapse className="h-4 w-4 mr-1 text-muted-foreground"/>
                                        <SelectValue placeholder="Load item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {savedItems.map(si => (
                                            <SelectItem key={si.id} value={si.id}>{si.description} (₹{si.rate})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={control}
                        name={`items.${index}.itemStartDate`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Item Start Date (Optional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormDescription className="text-xs">If set, quantity becomes days.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`items.${index}.itemEndDate`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Item End Date (Optional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => itemStartDate && date < itemStartDate} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormDescription className="text-xs">Must be on or after start date.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                       <FormField
                        control={control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{quantityIsCalculated ? "Days (Calculated)" : "Quantity"}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="1" 
                                {...field} 
                                value={quantityIsCalculated ? calculatedDays : (field.value === undefined || field.value === null ? '' : field.value)}
                                readOnly={quantityIsCalculated}
                                onChange={e => {
                                  if (!quantityIsCalculated) {
                                    const val = parseFloat(e.target.value);
                                    field.onChange(isNaN(val) ? 0 : val)
                                  }
                                }}
                                className={quantityIsCalculated ? "bg-muted/50" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`items.${index}.rate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{quantityIsCalculated ? "Per Day Rate (₹)" : "Rate (₹)"}</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="100.00" 
                                {...field} 
                                value={field.value === undefined || field.value === null ? '' : field.value}
                                onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    field.onChange(isNaN(val) ? 0 : val)
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="flex items-end">
                        <p className="text-sm text-muted-foreground whitespace-nowrap pt-7">
                            Amount: ₹{itemAmount}
                        </p>
                      </div>
                    </div>
                    {fields.length > 1 && (
                       <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove Item
                      </Button>
                    )}
                  </div>
                )})}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(defaultItem)}
                  className="mt-2"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="text-right">
                <h3 className="text-xl font-semibold">Total Amount: <span className="text-primary">₹{calculatedTotalFee.toFixed(2)}</span></h3>
            </div>
            
            <Separator />
            <CardTitle className="text-xl font-semibold">Optional Details</CardTitle>

            <FormField
              control={control}
              name="watermarkFile"
              render={({ field: { onChange, onBlur, name, value: formFieldValue } }) => ( 
                <FormItem>
                  <FormLabel>Custom Watermark (Optional, PNG/JPEG/GIF, &lt;5MB)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                       <Button type="button" variant="outline" onClick={() => watermarkFileRef.current?.click()}>
                        <ImageUp className="mr-2 h-4 w-4" /> {watermarkPreview ? "Change Watermark" : "Upload Watermark"}
                      </Button>
                      <Input
                        type="file"
                        accept="image/png, image/jpeg, image/gif"
                        className="hidden"
                        ref={watermarkFileRef}
                        name={name}
                        onBlur={onBlur}
                        onChange={(e) => {
                            const files = e.target.files;
                             onChange(files && files.length > 0 ? files : undefined);
                        }}
                      />
                      {formFieldValue && formFieldValue.length > 0 && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{formFieldValue[0].name}</span>}
                       {watermarkPreview && (!formFieldValue || formFieldValue.length === 0) && <span className="text-sm text-muted-foreground truncate max-w-[200px]">Current watermark active</span>}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {searchParams.get('id') && watermarkPreview && (!formFieldValue || formFieldValue.length === 0) 
                      ? "Current watermark (from this invoice) will be used unless a new image is uploaded." 
                      : "Upload an image to set as a watermark on the invoice."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watermarkPreview && (
              <>
                <div className="mt-2">
                  <FormLabel>Watermark Preview</FormLabel>
                  <div className="mt-1 p-2 border rounded-md aspect-video relative w-full max-w-xs bg-muted overflow-hidden">
                    <Image 
                        src={watermarkPreview} 
                        alt="Watermark preview" 
                        layout="fill" 
                        objectFit="contain" 
                        data-ai-hint="abstract pattern"
                        style={{ opacity: watchedWatermarkOpacity ?? 0.05 }}
                    />
                  </div>
                </div>
                <FormField
                  control={control}
                  name="watermarkOpacity"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <div className="flex justify-between items-center">
                        <FormLabel>Watermark Opacity</FormLabel>
                        <span className="text-sm text-muted-foreground">{((field.value ?? 0.05) * 100).toFixed(0)}%</span>
                      </div>
                      <FormControl>
                        <Slider
                          value={[ (field.value ?? defaultFormValues.watermarkOpacity ?? 0.05) * 100 ]}
                          onValueChange={(value) => field.onChange(value[0] / 100)}
                          max={100}
                          step={1}
                          className="py-2"
                          aria-label="Watermark opacity"
                        />
                      </FormControl>
                       <FormDescription>Adjust the visibility of the watermark on the invoice.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}


            <FormField
              control={form.control}
              name="invoiceNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes/Terms</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Payment terms, project details, thank you note, etc." {...field} rows={3} value={field.value || ''} />
                  </FormControl>
                   <FormDescription>Any additional notes or terms for the client. You can set default notes in Settings.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isSubmitting || !initialDataLoaded} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting ? "Processing..." : (searchParams.get('id') ? "Update & Preview Invoice" : "Preview Invoice")}
              {!isSubmitting && <PartyPopper className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
