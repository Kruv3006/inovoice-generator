
"use client";

import type { ElementRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { format, isValid, parse, parseISO, differenceInCalendarDays } from "date-fns";
import { CalendarIcon, ImageUp, PartyPopper, Building, Hash, PlusCircle, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceFormSchemaType, StoredInvoiceData, LineItem, StoredLineItem } from "@/lib/invoice-types";
import { invoiceFormSchema } from "@/lib/invoice-types";
import { getInvoiceData, saveInvoiceData } from "@/lib/invoice-store";

const fileToDataUrl = (file: File, toastFn: ReturnType<typeof useToast>['toast']): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file) {
        resolve(null);
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // Max 5MB
      toastFn({ variant: "destructive", title: "File Too Large", description: "File must be less than 5MB." });
      resolve(null);
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      toastFn({ variant: "destructive", title: "Invalid File Type", description: "File must be PNG, JPEG, or GIF." });
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
    invoiceNotes: "Thank you for your business! Payment is due within 30 days.",
    companyLogoFile: undefined,
    watermarkFile: undefined,
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

  useEffect(() => {
    if (watchedItems) {
      let total = 0;
      watchedItems.forEach((item, index) => {
        let quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;

        if (item.itemStartDate && item.itemEndDate && isValid(item.itemStartDate) && isValid(item.itemEndDate) && item.itemEndDate >= item.itemStartDate) {
          const days = differenceInCalendarDays(item.itemEndDate, item.itemStartDate) + 1;
          quantity = days;
          // Note: We don't directly call setValue for quantity here if it's derived,
          // instead, ensure the calculation for total uses this derived quantity.
          // However, if quantity field IS NOT read-only and is used for calculation,
          // then `setValue(`items.${index}.quantity`, days, { shouldValidate: true });` might be needed.
          // For now, we just use `days` in the `total` calculation directly.
        }
        total += quantity * rate;
      });
      setCalculatedTotalFee(total);
    }
  }, [watchedItems, setValue]);


  useEffect(() => {
    const invoiceIdToEdit = searchParams.get('id');
    if (invoiceIdToEdit && !initialDataLoaded) {
      const data = getInvoiceData(invoiceIdToEdit);
      if (data) {
        const formItems = data.items?.map(item => ({
          ...item,
          itemStartDate: item.itemStartDate ? parseISO(item.itemStartDate) : undefined,
          itemEndDate: item.itemEndDate ? parseISO(item.itemEndDate) : undefined,
          quantity: Number(item.quantity) || 0, // ensure numeric
          rate: Number(item.rate) || 0, // ensure numeric
        })) || [defaultItem];

        const formData: InvoiceFormSchemaType = {
          ...defaultFormValues,
          ...data,
          invoiceDate: data.invoiceDate ? (parseISO(data.invoiceDate) instanceof Date && !isNaN(parseISO(data.invoiceDate).valueOf()) ? parseISO(data.invoiceDate) : new Date()) : new Date(),
          items: formItems.length > 0 ? formItems : [defaultItem],
          companyLogoFile: undefined, 
          watermarkFile: undefined,
        };
        reset(formData);

        if (data.watermarkDataUrl) setWatermarkPreview(data.watermarkDataUrl);
        if (data.companyLogoDataUrl) setCompanyLogoPreview(data.companyLogoDataUrl);
        
      } else {
        toast({ title: "Edit Error", description: "Could not load invoice data for editing.", variant: "destructive" });
        reset(defaultFormValues);
        setWatermarkPreview(null);
        setCompanyLogoPreview(null);
      }
      setInitialDataLoaded(true);
    } else if (!invoiceIdToEdit && !initialDataLoaded) {
      reset(defaultFormValues);
      setWatermarkPreview(null);
      setCompanyLogoPreview(null);
      setInitialDataLoaded(true); 
    }
  }, [searchParams, reset, toast, initialDataLoaded, defaultFormValues, defaultItem]);

  const watchedCompanyLogoFile = watch("companyLogoFile");
  const watchedWatermarkFile = watch("watermarkFile");

  useEffect(() => {
    const currentInvoiceId = searchParams.get('id');
    const existingData = currentInvoiceId ? getInvoiceData(currentInvoiceId) : null;
  
    if (watchedCompanyLogoFile && watchedCompanyLogoFile.length > 0) {
      const file = watchedCompanyLogoFile[0];
      fileToDataUrl(file, toast).then(dataUrl => {
        if (dataUrl) {
          setCompanyLogoPreview(dataUrl);
        } else { // fileToDataUrl handles toast for errors
          setValue('companyLogoFile', undefined, { shouldValidate: true });
          setCompanyLogoPreview(existingData?.companyLogoDataUrl || null);
        }
      });
    } else {
      const currentLogoFileValue = getValues('companyLogoFile');
      if (existingData?.companyLogoDataUrl && (!currentLogoFileValue || currentLogoFileValue.length === 0)) {
        setCompanyLogoPreview(existingData.companyLogoDataUrl);
      } else if (!existingData && (!currentLogoFileValue || currentLogoFileValue.length === 0)) {
        setCompanyLogoPreview(null);
      }
    }
  }, [watchedCompanyLogoFile, searchParams, setValue, toast, getValues]);

  useEffect(() => {
    const currentInvoiceId = searchParams.get('id');
    const existingData = currentInvoiceId ? getInvoiceData(currentInvoiceId) : null;
  
    if (watchedWatermarkFile && watchedWatermarkFile.length > 0) {
      const file = watchedWatermarkFile[0];
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
      } else if (!existingData && (!currentWatermarkFileValue || currentWatermarkFileValue.length === 0)) {
        setWatermarkPreview(null);
      }
    }
  }, [watchedWatermarkFile, searchParams, setValue, toast, getValues]);
  
  async function onSubmit(data: InvoiceFormSchemaType) {
    setIsSubmitting(true);
    try {
      const invoiceIdToEdit = searchParams.get('id');
      const existingInvoiceData = invoiceIdToEdit ? getInvoiceData(invoiceIdToEdit) : null;

      const invoiceId = existingInvoiceData?.id || `inv_${Date.now()}`;
      
      let companyLogoDataUrlToStore: string | null = companyLogoPreview;
      if (data.companyLogoFile && data.companyLogoFile.length > 0 && companyLogoPreview) { // only use preview if it's set
         // companyLogoDataUrlToStore is already set to companyLogoPreview
      } else if (!data.companyLogoFile && existingInvoiceData?.companyLogoDataUrl) {
         companyLogoDataUrlToStore = existingInvoiceData.companyLogoDataUrl;
      } else {
         companyLogoDataUrlToStore = null;
      }

      let watermarkDataUrlToStore: string | null = watermarkPreview;
      if (data.watermarkFile && data.watermarkFile.length > 0 && watermarkPreview) {
        // watermarkDataUrlToStore is already set to watermarkPreview
      } else if (!data.watermarkFile && existingInvoiceData?.watermarkDataUrl) {
        watermarkDataUrlToStore = existingInvoiceData.watermarkDataUrl;
      } else {
        watermarkDataUrlToStore = null;
      }
      
      const itemsToStore: StoredLineItem[] = data.items.map(item => {
        let quantity = Number(item.quantity) || 0;
        if (item.itemStartDate && item.itemEndDate && isValid(item.itemStartDate) && isValid(item.itemEndDate) && item.itemEndDate >= item.itemStartDate) {
            quantity = differenceInCalendarDays(item.itemEndDate, item.itemStartDate) + 1;
        }
        return {
          ...item,
          quantity, // Store the possibly recalculated quantity
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Your Company Name</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g., Acme Innovations Pvt. Ltd." {...field} />
                    </FormControl>
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
                    {searchParams.get('id') && companyLogoPreview && (!formFieldValue || formFieldValue.length === 0) 
                      ? "Current logo will be used unless a new image is uploaded." 
                      : "Upload a logo to display on the invoice."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {companyLogoPreview && (
              <div className="mt-2">
                <FormLabel>Logo Preview</FormLabel>
                <div className="mt-1 p-2 border rounded-md aspect-square relative w-24 h-24 bg-muted overflow-hidden">
                  <Image src={companyLogoPreview} alt="Company logo preview" layout="fill" objectFit="contain" data-ai-hint="company logo"/>
                </div>
              </div>
            )}

             <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Priya Sharma" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <Separator className="my-6" />
            
            <div>
              <FormLabel className="text-lg font-semibold">Invoice Items</FormLabel>
              <CardDescription>Add items or services provided. For services with a duration, provide start/end dates and a per-day rate.</CardDescription>
              <div className="space-y-6 mt-4">
                {fields.map((item, index) => {
                  const itemStartDate = watch(`items.${index}.itemStartDate`);
                  const itemEndDate = watch(`items.${index}.itemEndDate`);
                  const itemRate = watch(`items.${index}.rate`);
                  let calculatedDays = 0;
                  let quantityIsCalculated = false;

                  if (itemStartDate && itemEndDate && isValid(itemStartDate) && isValid(itemEndDate) && itemEndDate >= itemStartDate) {
                    calculatedDays = differenceInCalendarDays(itemEndDate, itemStartDate) + 1;
                    quantityIsCalculated = true;
                    if (getValues(`items.${index}.quantity`) !== calculatedDays) {
                        // setValue(`items.${index}.quantity`, calculatedDays, { shouldValidate: true, shouldDirty: true });
                        // This direct setValue inside render can cause issues. Instead, rely on the totalFee calculation.
                        // The quantity field can show the calculated days visually.
                    }
                  }
                  
                  const currentQuantity = quantityIsCalculated ? calculatedDays : (getValues(`items.${index}.quantity`) || 0);
                  const currentRate = getValues(`items.${index}.rate`) || 0;
                  const itemAmount = (Number(currentQuantity) * Number(currentRate)).toFixed(2);

                  return (
                  <div key={item.id} className="p-4 border rounded-md shadow-sm space-y-4 bg-card">
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
                                value={quantityIsCalculated ? calculatedDays : field.value}
                                readOnly={quantityIsCalculated}
                                onChange={e => {
                                  if (!quantityIsCalculated) {
                                    field.onChange(parseFloat(e.target.value) || 0)
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
                                placeholder="100.00" {...field} 
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                      ? "Current watermark will be used unless a new image is uploaded." 
                      : "Upload a new image to set or change the watermark."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watermarkPreview && (
              <div className="mt-2">
                <FormLabel>Watermark Preview</FormLabel>
                <div className="mt-1 p-2 border rounded-md aspect-video relative w-full max-w-xs bg-muted overflow-hidden">
                  <Image src={watermarkPreview} alt="Watermark preview" layout="fill" objectFit="contain" data-ai-hint="design pattern"/>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="invoiceNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes/Terms</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Payment terms, project details, etc." {...field} rows={3} />
                  </FormControl>
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
