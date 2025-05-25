
"use client";

import type { ElementRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { format, isValid, parseISO, differenceInCalendarDays } from "date-fns";
import { CalendarIcon, ImageUp, PartyPopper, Building, Hash, PlusCircle, Trash2, ListCollapse, Percent, Palette, FileSignature, StickyNote, Type, Shapes, CalendarClock, RotateCcw, Clock, LayoutTemplate, DollarSign, Eye, EyeOff, MapPin, Mail, Phone } from "lucide-react";
import React, { useState, useEffect, useRef, useMemo } from "react";
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
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceFormSchemaType, StoredInvoiceData, LineItem, StoredLineItem, ClientData, SavedItemData, CompanyProfileData, AvailableCurrency } from "@/lib/invoice-types";
import { invoiceFormSchema, availableCurrencies } from "@/lib/invoice-types";
import { getInvoiceData, saveInvoiceData } from "@/lib/invoice-store";
import { getCompanyProfile, getClients, getSavedItems } from "@/lib/settings-store";
import { Label } from "@/components/ui/label";
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

const defaultItem: LineItem = {
  description: "",
  quantity: 1,
  unit: "",
  rate: 0,
  discount: 0,
  itemStartDate: undefined,
  itemEndDate: undefined,
  itemStartTime: '',
  itemEndTime: '',
};

const generateDefaultFormValues = (companyProfile?: CompanyProfileData | null): InvoiceFormSchemaType => {
  const profile = companyProfile || getCompanyProfile() || { currency: availableCurrencies[0], defaultTemplateStyle: 'classic', showClientAddressOnInvoice: true, defaultInvoiceNotes: '', defaultTermsAndConditions: '' };
  return {
    invoiceNumber: String(Date.now()).slice(-6),
    customerName: "",
    customerAddress: "",
    customerEmail: "",
    customerPhone: "",
    companyName: profile?.companyName || "",
    invoiceDate: new Date(),
    dueDate: undefined,
    items: [defaultItem],
    globalDiscountType: 'percentage',
    globalDiscountValue: 0,
    invoiceNotes: profile?.defaultInvoiceNotes || "",
    termsAndConditions: profile?.defaultTermsAndConditions || "",
    companyLogoFile: undefined,
    watermarkFile: undefined,
    watermarkOpacity: 0.05,
    themeColor: 'default', // Matches zod default
    fontTheme: profile?.defaultTemplateStyle === 'serif' ? 'serif' : profile?.defaultTemplateStyle === 'mono' ? 'mono' : 'default', // Infer from profile if possible
    templateStyle: profile?.defaultTemplateStyle || 'classic', // Matches zod default
  };
};


export function InvoiceForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const [clients, setClients] = useState<ClientData[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItemData[]>([]);
  const [companyProfile, setCompanyProfileState] = useState<CompanyProfileData | null>(null); // Renamed to avoid conflict with global
  const [currentCurrency, setCurrentCurrency] = useState<AvailableCurrency>(availableCurrencies[0]);

  const watermarkFileRef = useRef<HTMLInputElement | null>(null);
  const companyLogoFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const profile = getCompanyProfile();
    setCompanyProfileState(profile);
    setCurrentCurrency(profile?.currency || availableCurrencies[0]);
    setClients(getClients());
    setSavedItems(getSavedItems());
  }, []);


  const form = useForm<InvoiceFormSchemaType>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: generateDefaultFormValues(companyProfile), // Pass local state here
    mode: "onChange",
  });

  const { watch, control, reset, setValue, trigger, getValues, formState: { errors } } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedWatermarkOpacity = watch("watermarkOpacity");
  const watchedGlobalDiscountType = watch("globalDiscountType");
  const watchedGlobalDiscountValue = watch("globalDiscountValue");
  const watchedCustomerName = watch("customerName"); 

  useEffect(() => {
    if (watchedCustomerName) {
        const selectedClient = clients.find(c => c.name === watchedCustomerName);
        if (selectedClient) {
            setValue('customerAddress', selectedClient.address || '');
            setValue('customerEmail', selectedClient.email || '');
            setValue('customerPhone', selectedClient.phone || '');
        }
    }
  }, [watchedCustomerName, clients, setValue]);


  const { calculatedSubTotal, calculatedTotalFee } = useMemo(() => {
    let subTotal = 0;
    if (watchedItems) {
      watchedItems.forEach((item) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const itemDiscountForItem = Number(item.discount) || 0; 

        const itemSubtotal = quantity * rate;
        subTotal += itemSubtotal * (1 - itemDiscountForItem / 100);
      });
    }

    let finalTotal = subTotal;
    const discountValue = Number(watchedGlobalDiscountValue) || 0;

    if (watchedGlobalDiscountType === 'percentage') {
      if (discountValue > 0 && discountValue <= 100) {
        finalTotal = subTotal * (1 - discountValue / 100);
      }
    } else if (watchedGlobalDiscountType === 'fixed') {
      if (discountValue > 0) {
        finalTotal = Math.max(0, subTotal - discountValue);
      }
    }
    return { calculatedSubTotal: subTotal, calculatedTotalFee: finalTotal };
  }, [watchedItems, watchedGlobalDiscountType, watchedGlobalDiscountValue]);


  const resetFormToDefaults = () => {
    const profile = getCompanyProfile(); // Fetch fresh profile
    setCompanyProfileState(profile); // Update local state as well
    setCurrentCurrency(profile?.currency || availableCurrencies[0]);
    const defaults = generateDefaultFormValues(profile);
    reset(defaults);
    setCompanyLogoPreview(profile?.companyLogoDataUrl || null);
    setWatermarkPreview(null);
    if (companyLogoFileRef.current) companyLogoFileRef.current.value = "";
    if (watermarkFileRef.current) watermarkFileRef.current.value = "";
    toast({ title: "Form Reset", description: "Invoice details have been reset to defaults.", variant: "default" });
  };


  useEffect(() => {
    // This effect runs when component mounts or searchParams change
    // It's crucial for loading initial data for new/edit/duplicate scenarios
    const profileData = getCompanyProfile(); 
    setCompanyProfileState(profileData);
    setCurrentCurrency(profileData?.currency || availableCurrencies[0]);

    let baseFormValues = generateDefaultFormValues(profileData);

    const invoiceIdToEdit = searchParams.get('id');
    const duplicateId = searchParams.get('duplicate');

    let formDataToSet: InvoiceFormSchemaType = baseFormValues;
    let toastMessage: { title: string, description: string, variant: "default" | "destructive" } | null = null;

    if (duplicateId && !initialDataLoaded) {
        const sourceInvoice = getInvoiceData(duplicateId);
        if (sourceInvoice) {
            const duplicatedItems = sourceInvoice.items?.map(item => ({
                ...item,
                itemStartDate: item.itemStartDate ? parseISO(item.itemStartDate) : undefined,
                itemEndDate: item.itemEndDate ? parseISO(item.itemEndDate) : undefined,
                itemStartTime: item.itemStartTime || '',
                itemEndTime: item.itemEndTime || '',
                quantity: Number(item.quantity) || 0,
                unit: item.unit || '',
                rate: Number(item.rate) || 0,
                discount: Number(item.discount) || 0,
            })) || [defaultItem];

            formDataToSet = {
                ...baseFormValues, 
                ...sourceInvoice, 
                invoiceNumber: `COPY-${sourceInvoice.invoiceNumber}-${String(Date.now()).slice(-4)}`,
                invoiceDate: new Date(), 
                dueDate: sourceInvoice.dueDate ? (isValid(parseISO(sourceInvoice.dueDate)) ? parseISO(sourceInvoice.dueDate) : undefined) : undefined,
                items: duplicatedItems.length > 0 ? duplicatedItems : [defaultItem],
                companyLogoFile: undefined, 
                watermarkFile: undefined,
                companyName: sourceInvoice.companyName || baseFormValues.companyName,
                invoiceNotes: sourceInvoice.invoiceNotes ?? baseFormValues.invoiceNotes,
                termsAndConditions: sourceInvoice.termsAndConditions ?? baseFormValues.termsAndConditions,
                watermarkOpacity: sourceInvoice.watermarkOpacity ?? baseFormValues.watermarkOpacity,
                themeColor: sourceInvoice.themeColor ?? baseFormValues.themeColor,
                fontTheme: sourceInvoice.fontTheme ?? baseFormValues.fontTheme,
                templateStyle: sourceInvoice.templateStyle ?? baseFormValues.templateStyle,
                globalDiscountType: sourceInvoice.globalDiscountType ?? baseFormValues.globalDiscountType,
                globalDiscountValue: sourceInvoice.globalDiscountValue ?? baseFormValues.globalDiscountValue,
                customerName: sourceInvoice.customerName,
                customerAddress: sourceInvoice.customerAddress || '',
                customerEmail: sourceInvoice.customerEmail || '',
                customerPhone: sourceInvoice.customerPhone || '',
            };
            if (sourceInvoice.watermarkDataUrl) setWatermarkPreview(sourceInvoice.watermarkDataUrl);
            setCompanyLogoPreview(sourceInvoice.companyLogoDataUrl || profileData?.companyLogoDataUrl || null);
            toastMessage = { title: "Invoice Duplicated", description: "Review and update the details below.", variant: "default" };
        } else {
            toastMessage = { title: "Duplication Error", description: "Could not load source invoice for duplication. Using defaults.", variant: "destructive" };
            setCompanyLogoPreview(profileData?.companyLogoDataUrl || null);
            setWatermarkPreview(null);
        }
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('duplicate');
        router.replace(currentUrl.toString(), { scroll: false });

    } else if (invoiceIdToEdit && !initialDataLoaded) {
      const data = getInvoiceData(invoiceIdToEdit);
      if (data) {
        const formItems = data.items?.map(item => ({
          ...item,
          itemStartDate: item.itemStartDate ? (isValid(parseISO(item.itemStartDate)) ? parseISO(item.itemStartDate) : undefined) : undefined,
          itemEndDate: item.itemEndDate ? (isValid(parseISO(item.itemEndDate)) ? parseISO(item.itemEndDate) : undefined) : undefined,
          itemStartTime: item.itemStartTime || '',
          itemEndTime: item.itemEndTime || '',
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '',
          rate: Number(item.rate) || 0,
          discount: Number(item.discount) || 0,
        })) || [defaultItem];

        formDataToSet = {
          ...baseFormValues, 
          ...data, 
          invoiceNumber: data.invoiceNumber || baseFormValues.invoiceNumber,
          invoiceDate: data.invoiceDate ? (isValid(parseISO(data.invoiceDate)) ? parseISO(data.invoiceDate) : new Date()) : new Date(),
          dueDate: data.dueDate ? (isValid(parseISO(data.dueDate)) ? parseISO(data.dueDate) : undefined) : undefined,
          items: formItems.length > 0 ? formItems : [defaultItem],
          companyLogoFile: undefined,
          watermarkFile: undefined,
          companyName: data.companyName || baseFormValues.companyName,
          invoiceNotes: data.invoiceNotes ?? baseFormValues.invoiceNotes,
          termsAndConditions: data.termsAndConditions ?? baseFormValues.termsAndConditions,
          watermarkOpacity: data.watermarkOpacity ?? baseFormValues.watermarkOpacity,
          globalDiscountType: data.globalDiscountType ?? baseFormValues.globalDiscountType,
          globalDiscountValue: data.globalDiscountValue ?? baseFormValues.globalDiscountValue,
          themeColor: data.themeColor ?? baseFormValues.themeColor,
          fontTheme: data.fontTheme ?? baseFormValues.fontTheme,
          templateStyle: data.templateStyle ?? baseFormValues.templateStyle,
          customerName: data.customerName,
          customerAddress: data.customerAddress || '',
          customerEmail: data.customerEmail || '',
          customerPhone: data.customerPhone || '',
        };
        if (data.watermarkDataUrl) setWatermarkPreview(data.watermarkDataUrl);
        setCompanyLogoPreview(data.companyLogoDataUrl || profileData?.companyLogoDataUrl || null);
      } else {
        toastMessage = { title: "Edit Error", description: "Could not load invoice data for editing. Using defaults.", variant: "destructive" };
        setCompanyLogoPreview(profileData?.companyLogoDataUrl || null);
        setWatermarkPreview(null);
      }
    } else if (!initialDataLoaded) { 
      setCompanyLogoPreview(profileData?.companyLogoDataUrl || null);
      setWatermarkPreview(null);
    }
    
    if (!initialDataLoaded) {
        reset(formDataToSet); // Reset form with the determined data
        if (toastMessage) toast(toastMessage);
        setInitialDataLoaded(true); // Mark as loaded
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, reset, toast, initialDataLoaded, router]); // Removed companyProfile state from deps

  const watchedCompanyLogoFile = watch("companyLogoFile");
  const watchedWatermarkFile = watch("watermarkFile");

  useEffect(() => {
    const currentInvoiceId = searchParams.get('id');
    const existingData = currentInvoiceId ? getInvoiceData(currentInvoiceId) : null;
    const profileData = getCompanyProfile(); // Fetch fresh profile data

    if (watchedCompanyLogoFile && watchedCompanyLogoFile.length > 0) {
      const file = watchedCompanyLogoFile[0];
       if (file.size > 2 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Logo File Too Large", description: "Logo must be less than 2MB." });
        setValue('companyLogoFile', undefined, { shouldValidate: true });
        // Revert to existing logo if validation fails
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
          // If file read fails, clear from form and revert preview
          setValue('companyLogoFile', undefined, { shouldValidate: true });
          setCompanyLogoPreview(existingData?.companyLogoDataUrl || profileData?.companyLogoDataUrl || null);
        }
      });
    } else {
      // This block handles the case where the file input is cleared or was never set (e.g., on initial load for edit)
      // It ensures the preview shows the logo from localStorage or profile if no new file is staged.
      const currentLogoFileValue = getValues('companyLogoFile');
      if (!currentLogoFileValue || currentLogoFileValue.length === 0) {
          // No new file is staged. Show the existing logo.
          if (existingData?.companyLogoDataUrl) {
              setCompanyLogoPreview(existingData.companyLogoDataUrl);
          } else if (profileData?.companyLogoDataUrl) {
              setCompanyLogoPreview(profileData.companyLogoDataUrl);
          } else {
              setCompanyLogoPreview(null); // No logo anywhere
          }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedWatermarkFile, searchParams, setValue, toast, getValues]);


  async function onSubmit(data: InvoiceFormSchemaType) {
    setIsSubmitting(true);
    try {
      const invoiceIdToEdit = searchParams.get('id');
      const isDuplicating = searchParams.get('duplicate'); // Should have been cleared, but good to check
      const invoiceId = (invoiceIdToEdit && !isDuplicating) ? invoiceIdToEdit : `inv_${Date.now()}`;

      let companyLogoDataUrlToStore: string | null = companyLogoPreview;
      // Only update from file if a new file was actually selected and successfully previewed
      if (data.companyLogoFile && data.companyLogoFile.length > 0 && companyLogoPreview && companyLogoPreview.startsWith('data:image')) {
         // companyLogoPreview already holds the new Data URL
      } else if (!companyLogoPreview && data.companyLogoFile === undefined ) {
         // No preview and no file selected means no logo or logo was cleared.
         companyLogoDataUrlToStore = null;
      }
      // Otherwise, companyLogoPreview (from existing data or profile) is used.


      let watermarkDataUrlToStore: string | null = watermarkPreview;
      if (data.watermarkFile && data.watermarkFile.length > 0 && watermarkPreview && watermarkPreview.startsWith('data:image')) {
        // watermarkPreview already holds the new Data URL
      } else if (!watermarkPreview && data.watermarkFile === undefined) {
        watermarkDataUrlToStore = null;
      }
      // Otherwise, watermarkPreview (from existing data) is used.


      const itemsToStore: StoredLineItem[] = data.items.map(item => {
        return {
          ...item,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '', 
          itemStartDate: item.itemStartDate ? item.itemStartDate.toISOString() : undefined,
          itemEndDate: item.itemEndDate ? item.itemEndDate.toISOString() : undefined,
          itemStartTime: item.itemStartTime || undefined,
          itemEndTime: item.itemEndTime || undefined,
          discount: Number(item.discount) || 0,
        };
      });

      const finalSubTotal = calculatedSubTotal;
      const finalTotalFee = calculatedTotalFee;
      
      const currentProfileForStorage = getCompanyProfile();
      const currentCurrencyForStorage = data.dueDate // Check any field to ensure data is form data
        ? currentCurrency // Use current state if it's a new/edited form
        : (currentProfileForStorage?.currency || availableCurrencies[0]);


      const amountInWordsPlaceholder = `[Total ${currentCurrencyForStorage?.symbol || '₹'}${finalTotalFee.toFixed(2)} in words - Placeholder]`;

      const storedData: StoredInvoiceData = {
        id: invoiceId,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate.toISOString(),
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        companyName: data.companyName,
        companyLogoDataUrl: companyLogoDataUrlToStore,
        items: itemsToStore,
        subTotal: finalSubTotal,
        globalDiscountType: data.globalDiscountType,
        globalDiscountValue: data.globalDiscountValue,
        totalFee: finalTotalFee,
        currency: currentCurrencyForStorage,
        amountInWords: amountInWordsPlaceholder,
        invoiceNotes: data.invoiceNotes,
        termsAndConditions: data.termsAndConditions,
        watermarkDataUrl: watermarkDataUrlToStore,
        watermarkOpacity: data.watermarkOpacity ?? 0.05,
        themeColor: data.themeColor ?? 'default',
        fontTheme: data.fontTheme ?? 'default',
        templateStyle: data.templateStyle ?? 'classic',
      };

      saveInvoiceData(invoiceId, storedData);

      toast({
        title: `Invoice ${invoiceIdToEdit && !isDuplicating ? 'Updated' : 'Details Saved'}!`,
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
      setValue(`items.${itemIndex}.quantity`, selectedSavedItem.defaultQuantity ?? 1);
      setValue(`items.${itemIndex}.unit`, selectedSavedItem.defaultUnit ?? '');
      setValue(`items.${itemIndex}.itemStartDate`, undefined); // Reset dates when loading item
      setValue(`items.${itemIndex}.itemEndDate`, undefined);
      setValue(`items.${itemIndex}.itemStartTime`, '');
      setValue(`items.${itemIndex}.itemEndTime`, '');
      trigger(`items.${itemIndex}.description`);
      trigger(`items.${itemIndex}.rate`);
      trigger(`items.${itemIndex}.quantity`);
      trigger(`items.${itemIndex}.unit`);
    }
  };


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl my-8">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">
          {searchParams.get('id') && !searchParams.get('duplicate') ? "Edit Invoice" : "Create New Invoice"}
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">Fill in the details below to generate your invoice. All fields with an asterisk (*) are recommended.</CardDescription>
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
                        <FormLabel className="flex items-center">
                           <Hash className="mr-1 h-4 w-4 text-muted-foreground" /> Invoice Number *
                        </FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., INV-00123" {...field} />
                        </FormControl>
                        <FormDescription>A unique ID for this invoice. You can edit this.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Invoice Date *</FormLabel>
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
                 <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center"><CalendarClock className="mr-1 h-4 w-4 text-muted-foreground" /> Due Date (Optional)</FormLabel>
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
                                <span>Pick a due date</span>
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
                            disabled={(date) =>
                                form.getValues("invoiceDate") ? date < form.getValues("invoiceDate") : false
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>When the payment for this invoice is due.</FormDescription>
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
                    <FormLabel>Your Company Name *</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g., Acme Innovations Pvt. Ltd." {...field} />
                    </FormControl>
                    <FormDescription>Your company's name. Set a default in Application Settings.</FormDescription>
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
                      {formFieldValue && formFieldValue.length > 0 && <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{formFieldValue[0].name}</span>}
                       {companyLogoPreview && (!formFieldValue || formFieldValue.length === 0) && <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">Current logo active</span>}
                    </div>
                  </FormControl>
                   <FormDescription>
                    {(searchParams.get('id') || companyProfile?.companyLogoDataUrl) && companyLogoPreview && (!formFieldValue || formFieldValue.length === 0)
                      ? "Current logo (from profile or this invoice) will be used. Upload a new image to change it."
                      : "Upload a logo for the invoice. You can set a default logo in Application Settings."}
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
                    <FormLabel>Customer Name *</FormLabel>
                    {clients.length > 0 ? (
                      <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            const selectedClient = clients.find(c => c.name === value);
                            if (selectedClient) {
                                setValue('customerAddress', selectedClient.address || '');
                                setValue('customerEmail', selectedClient.email || '');
                                setValue('customerPhone', selectedClient.phone || '');
                            } else { 
                                setValue('customerAddress', '');
                                setValue('customerEmail', '');
                                setValue('customerPhone', '');
                            }
                        }} 
                        value={field.value || ""}
                       >
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
                      {clients.length > 0 ? "Select from saved clients or type a new name. Manage clients in Application Settings." : "Enter the customer's name. You can save clients in Application Settings for faster entry."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel className="flex items-center"><MapPin className="mr-1 h-4 w-4 text-muted-foreground" /> Client Address (Optional)</FormLabel>
                      <FormControl>
                      <Textarea placeholder="123 Tech Park, Info City" {...field} rows={2} value={field.value || ''}/>
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><Mail className="mr-1 h-4 w-4 text-muted-foreground" /> Client Email (Optional)</FormLabel>
                        <FormControl>
                        <Input type="email" placeholder="client@example.com" {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><Phone className="mr-1 h-4 w-4 text-muted-foreground" /> Client Phone (Optional)</FormLabel>
                        <FormControl>
                        <Input type="tel" placeholder="+91 1234567890" {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>


            <Separator className="my-6" />

            <div>
              <div className="flex justify-between items-center mb-1">
                <FormLabel className="text-xl font-semibold">Invoice Items *</FormLabel>
              </div>
              <FormDescription className="mb-4">
                Add items or services. For services with specific durations:
                <br />- Provide start/end dates &amp; times for **automatic hourly calculation** (Quantity becomes total hours, Rate is per hour, Unit is 'hours').
                <br />- Provide start/end dates (no times) for **automatic daily calculation** (Quantity becomes total days, Rate is per day, Unit is 'days').
                <br />- Otherwise, enter Quantity, Unit, and Rate manually for other types of items or services.
              </FormDescription>
              <div className="space-y-6 mt-4">
                {fields.map((item, index) => {
                  const itemIndex = index;

                  const itemStartDate = watch(`items.${itemIndex}.itemStartDate`);
                  const itemEndDate = watch(`items.${itemIndex}.itemEndDate`);
                  const itemStartTime = watch(`items.${itemIndex}.itemStartTime`);
                  const itemEndTime = watch(`items.${itemIndex}.itemEndTime`);

                  useEffect(() => {
                    let newQuantity: number | undefined = undefined;
                    let newUnit: string = getValues(`items.${itemIndex}.unit`) || '';
                    let quantityIsAutoCalculated = false;
                    let unitIsAutoCalculated = false;

                    if (itemStartDate && itemEndDate && itemStartTime && itemEndTime &&
                        isValid(itemStartDate) && isValid(itemEndDate) &&
                        /^\d{2}:\d{2}$/.test(itemStartTime) && /^\d{2}:\d{2}$/.test(itemEndTime)) {

                        const startH = parseInt(itemStartTime.split(':')[0], 10);
                        const startM = parseInt(itemStartTime.split(':')[1], 10);
                        const endH = parseInt(itemEndTime.split(':')[0], 10);
                        const endM = parseInt(itemEndTime.split(':')[1], 10);

                        if (startH >= 0 && startH <= 23 && startM >= 0 && startM <= 59 &&
                            endH >= 0 && endH <= 23 && endM >= 0 && endM <= 59) {

                            const startDateObj = new Date(itemStartDate);
                            startDateObj.setHours(startH, startM, 0, 0);

                            const endDateObj = new Date(itemEndDate);
                            endDateObj.setHours(endH, endM, 0, 0);

                            if (endDateObj.getTime() > startDateObj.getTime()) {
                                const diffMs = endDateObj.getTime() - startDateObj.getTime();
                                newQuantity = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
                                newUnit = 'hours';
                                quantityIsAutoCalculated = true;
                                unitIsAutoCalculated = true;
                            }
                        }
                    } else if (itemStartDate && itemEndDate &&
                               isValid(itemStartDate) && isValid(itemEndDate) &&
                               itemEndDate >= itemStartDate) {
                        newQuantity = differenceInCalendarDays(itemEndDate, itemStartDate) + 1;
                        newUnit = 'days';
                        quantityIsAutoCalculated = true;
                        unitIsAutoCalculated = true;
                    }

                    const currentFormQuantity = getValues(`items.${itemIndex}.quantity`);
                    if (quantityIsAutoCalculated && newQuantity !== undefined && newQuantity !== currentFormQuantity) {
                        setValue(`items.${itemIndex}.quantity`, newQuantity, { shouldValidate: true, shouldDirty: true });
                    }

                    const currentFormUnit = getValues(`items.${itemIndex}.unit`);
                    if (unitIsAutoCalculated && newUnit !== currentFormUnit) {
                        setValue(`items.${itemIndex}.unit`, newUnit, { shouldValidate: true, shouldDirty: true });
                    }
                  // eslint-disable-next-line react-hooks/exhaustive-deps
                  }, [itemStartDate, itemEndDate, itemStartTime, itemEndTime, setValue, getValues, itemIndex]);


                  let quantityLabel = "Quantity *";
                  let rateLabel = `Rate (${currentCurrency.symbol}) *`;
                  let isQuantityReadOnly = false;
                  let isUnitReadOnly = false;

                  if (itemStartDate && itemEndDate && itemStartTime && itemEndTime &&
                      isValid(itemStartDate) && isValid(itemEndDate) &&
                      /^\d{2}:\d{2}$/.test(itemStartTime) && /^\d{2}:\d{2}$/.test(itemEndTime)) {
                      const startH_render = parseInt(itemStartTime.split(':')[0], 10);
                      const startM_render = parseInt(itemStartTime.split(':')[1], 10);
                      const endH_render = parseInt(itemEndTime.split(':')[0], 10);
                      const endM_render = parseInt(itemEndTime.split(':')[1], 10);

                      if (startH_render >= 0 && startH_render <= 23 && startM_render >= 0 && startM_render <= 59 &&
                          endH_render >= 0 && endH_render <= 23 && endM_render >= 0 && endM_render <= 59) {
                          const startDateObj_render = new Date(itemStartDate);
                          startDateObj_render.setHours(startH_render, startM_render, 0, 0);
                          const endDateObj_render = new Date(itemEndDate);
                          endDateObj_render.setHours(endH_render, endM_render, 0, 0);

                          if (endDateObj_render.getTime() > startDateObj_render.getTime()) {
                              quantityLabel = "Hours (Auto)";
                              rateLabel = `Rate/Hour (${currentCurrency.symbol}) *`;
                              isQuantityReadOnly = true;
                              isUnitReadOnly = true;
                          }
                      }
                  } else if (itemStartDate && itemEndDate && isValid(itemStartDate) && isValid(itemEndDate) && itemEndDate >= itemStartDate) {
                      quantityLabel = "Days (Auto)";
                      rateLabel = `Rate/Day (${currentCurrency.symbol}) *`;
                      isQuantityReadOnly = true;
                      isUnitReadOnly = true;
                  }

                  const currentQuantity = getValues(`items.${itemIndex}.quantity`) || 0;
                  const currentRate = getValues(`items.${itemIndex}.rate`) || 0;
                  const currentDiscount = getValues(`items.${itemIndex}.discount`) || 0;
                  const itemSubtotal = (Number(currentQuantity) * Number(currentRate));
                  const itemAmount = (itemSubtotal * (1 - (Number(currentDiscount) / 100))).toFixed(2);


                  return (
                  <div key={item.id} className="p-4 border rounded-md shadow-sm space-y-4 bg-card">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-x-4 gap-y-2 items-baseline">
                      <div className="sm:col-span-4">
                        <FormField
                          control={control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Web Development, Daily Consulting" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {savedItems.length > 0 && (
                        <div className="sm:col-span-1">
                           <Label htmlFor={`load-item-${index}`} className="text-xs font-medium sm:hidden">Load Saved Item</Label>
                           <Select onValueChange={(value) => handleSavedItemSelect(value, index)} >
                            <SelectTrigger className="w-full mt-1 sm:mt-0" id={`load-item-${index}`} aria-label="Select saved item">
                                <ListCollapse className="h-4 w-4 mr-1 text-muted-foreground flex-shrink-0"/>
                                <SelectValue placeholder="Load item" />
                            </SelectTrigger>
                            <SelectContent>
                                {savedItems.map(si => (
                                    <SelectItem key={si.id} value={si.id}>{si.description} ({currentCurrency.symbol}{si.rate})</SelectItem>
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
                                    {field.value ? format(field.value, "PPP") : <span>Pick start date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                              </PopoverContent>
                            </Popover>
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
                                    {field.value ? format(field.value, "PPP") : <span>Pick end date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => itemStartDate ? date < itemStartDate : false} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {(itemStartDate || itemEndDate) && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={control}
                            name={`items.${index}.itemStartTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time (HH:MM) (Opt.)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input type="time" placeholder="HH:MM" {...field} value={field.value || ''} className="pl-8"/>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name={`items.${index}.itemEndTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time (HH:MM) (Opt.)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input type="time" placeholder="HH:MM" {...field} value={field.value || ''} className="pl-8"/>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                       </div>
                    )}


                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-baseline">
                       <FormField
                        control={control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{quantityLabel}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1"
                                {...field}
                                value={field.value ?? ''}
                                readOnly={isQuantityReadOnly}
                                onChange={e => {
                                  if (!isQuantityReadOnly) {
                                    const val = e.target.value;
                                    field.onChange(val === '' ? '' : parseFloat(val));
                                  }
                                }}
                                className={isQuantityReadOnly ? "bg-muted/50" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`items.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center"><Shapes className="mr-1 h-3 w-3 text-muted-foreground" />Unit (Opt.)</FormLabel>
                            <FormControl>
                                <Input
                                  placeholder="e.g. hrs, pcs"
                                  {...field}
                                  value={field.value || ''}
                                  className={`${isUnitReadOnly ? "bg-muted/50" : ""}`}
                                  readOnly={isUnitReadOnly}
                                  onChange={e => {
                                    if (!isUnitReadOnly) {
                                      field.onChange(e.target.value);
                                    }
                                  }}
                                />
                            </FormControl>
                            <FormDescription className="text-xs">e.g., hours, pcs, day. Auto-set if dates used.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`items.${index}.rate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{rateLabel}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="100.00"
                                {...field}
                                value={field.value ?? ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    field.onChange(val === '' ? '' : parseFloat(val));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`items.${index}.discount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount (%)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      const finalVal = isNaN(val) ? 0 : (val < 0 ? 0 : (val > 100 ? 100 : val));
                                      field.onChange(finalVal === 0 && e.target.value === '' ? '' : finalVal);
                                  }}
                                  className="pl-8"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="text-sm text-muted-foreground whitespace-nowrap pb-2">
                            Amount: {currentCurrency.symbol}{itemAmount}
                       </div>
                    </div>
                    {fields.length > 1 && (
                       <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove This Item
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
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
                </Button>
              </div>
            </div>

            <Separator className="my-6" />

            <div>
                <FormLabel className="text-xl font-semibold">Global Discount (Optional)</FormLabel>
                 <FormDescription className="mb-4">Apply a discount to the subtotal of all items. This is on top of any per-item discounts.</FormDescription>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mt-4">
                    <FormField
                        control={control}
                        name="globalDiscountType"
                        render={({ field }) => (
                            <FormItem className="space-y-3 md:col-span-1">
                                <FormLabel>Discount Type</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex flex-col space-y-1"
                                    >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="percentage" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Percentage (%)</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="fixed" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Fixed Amount ({currentCurrency.symbol})</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="globalDiscountValue"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Discount Value</FormLabel>
                                <FormControl>
                                     <div className="relative">
                                         {watch("globalDiscountType") === 'percentage' ?
                                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> :
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currentCurrency.symbol}</span>
                                         }
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            {...field}
                                            value={field.value ?? ''}
                                             onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                let finalVal = isNaN(val) ? 0 : (val < 0 ? 0 : val);
                                                if (watch("globalDiscountType") === 'percentage' && finalVal > 100) {
                                                    finalVal = 100;
                                                }
                                                field.onChange(finalVal === 0 && e.target.value === '' ? '' : finalVal);
                                            }}
                                            className="pl-8"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="text-right space-y-1">
                <h3 className="text-lg text-muted-foreground">Subtotal (All Items): <span className="font-semibold">{currentCurrency.symbol}{calculatedSubTotal.toFixed(2)}</span></h3>
                { (Number(watchedGlobalDiscountValue) || 0) > 0 &&
                  <h3 className="text-lg text-muted-foreground">
                    Global Discount:
                    <span className="font-semibold">
                       - {currentCurrency.symbol}{
                         watchedGlobalDiscountType === 'percentage'
                           ? (calculatedSubTotal * (Number(watchedGlobalDiscountValue) || 0) / 100).toFixed(2)
                           : (Number(watchedGlobalDiscountValue) || 0).toFixed(2)
                       }
                    </span>
                  </h3>
                }
                <h3 className="text-2xl font-bold">Total Amount Due: <span className="text-primary">{currentCurrency.symbol}{calculatedTotalFee.toFixed(2)}</span></h3>
            </div>


            <Separator />
            <CardTitle className="text-xl font-semibold">Optional Details &amp; Appearance</CardTitle>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="templateStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><LayoutTemplate className="mr-2 h-4 w-4"/> Invoice Template Style</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an invoice template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="classic">Classic - Traditional and professional</SelectItem>
                          <SelectItem value="modern">Modern - Sleek and contemporary</SelectItem>
                          <SelectItem value="compact">Compact - Minimalist and space-saving</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Choose a visual style for your invoice. Default from Settings.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                control={form.control}
                name="themeColor"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center"><Palette className="mr-2 h-4 w-4"/> Invoice Color Theme</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a color theme" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="default">Default Blue</SelectItem>
                        <SelectItem value="classic-blue">Classic Blue</SelectItem>
                        <SelectItem value="emerald-green">Emerald Green</SelectItem>
                        <SelectItem value="crimson-red">Crimson Red</SelectItem>
                        <SelectItem value="slate-gray">Slate Gray</SelectItem>
                        <SelectItem value="deep-purple">Deep Purple</SelectItem>
                        <SelectItem value="monochrome">Monochrome (B&amp;W)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormDescription>Choose a color palette for your invoice.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="fontTheme"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Type className="mr-2 h-4 w-4"/> Invoice Font Style</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a font style" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="default">Default Sans</SelectItem>
                            <SelectItem value="serif">Classic Serif</SelectItem>
                            <SelectItem value="mono">Modern Mono</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormDescription>Choose a font style for your invoice.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>


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
                      {formFieldValue && formFieldValue.length > 0 && <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{formFieldValue[0].name}</span>}
                       {watermarkPreview && (!formFieldValue || formFieldValue.length === 0) && <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">Current watermark active</span>}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {(searchParams.get('id') && watermarkPreview && (!formFieldValue || formFieldValue.length === 0))
                      ? "Current watermark (from this invoice) will be used. Upload a new image to change it."
                      : "Upload an image to be used as a faint background watermark."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watermarkPreview && (
              <>
                <div className="mt-2">
                  <FormLabel>Watermark Preview (Opacity applied)</FormLabel>
                  <div className="mt-1 p-2 border rounded-md aspect-video relative w-full max-w-xs bg-muted overflow-hidden">
                     <div className="absolute inset-0 flex items-center justify-center">
                        <img
                            src={watermarkPreview}
                            alt="Watermark preview"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                opacity: watchedWatermarkOpacity ?? 0.05,
                            }}
                            data-ai-hint="background pattern"
                        />
                    </div>
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
                          value={[ (field.value ?? generateDefaultFormValues(companyProfile).watermarkOpacity ?? 0.05) * 100 ]}
                          onValueChange={(value) => field.onChange(value[0] / 100)}
                          max={100}
                          step={1}
                          className="py-2"
                          aria-label="Watermark opacity"
                        />
                      </FormControl>
                       <FormDescription>Adjust how visible the watermark is on the invoice.</FormDescription>
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
                  <FormLabel className="flex items-center"><StickyNote className="mr-2 h-4 w-4"/>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Specific project details, thank you note, etc." {...field} rows={3} value={field.value || ''} />
                  </FormControl>
                   <FormDescription>Any additional notes specific to this invoice. You can set default notes in Application Settings.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><FileSignature className="mr-2 h-4 w-4"/>Terms &amp; Conditions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Payment terms, late fee policy, confidentiality clause..." {...field} rows={4} value={field.value || ''} />
                  </FormControl>
                   <FormDescription>Your standard terms and conditions. Set defaults in Application Settings.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={isSubmitting || !initialDataLoaded} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSubmitting ? "Processing..." : (searchParams.get('id') && !searchParams.get('duplicate') ? "Update & Preview Invoice" : "Save & Preview Invoice")}
                {!isSubmitting && <PartyPopper className="ml-2 h-5 w-5" />}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset Form
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all entries in the form and reset it to default values. Any unsaved changes will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetFormToDefaults} className="bg-destructive hover:bg-destructive/90">
                      Reset Form
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

