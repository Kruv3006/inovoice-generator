
"use client";

import type { ElementRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { format, isValid, parse, parseISO } from "date-fns";
import { CalendarIcon, ImageUp, PartyPopper, Building, Hash, PlusCircle, Trash2, DollarSign } from "lucide-react";
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
import type { InvoiceFormSchemaType, StoredInvoiceData, LineItem } from "@/lib/invoice-types";
import { invoiceFormSchema } from "@/lib/invoice-types";
import { getInvoiceData, saveInvoiceData } from "@/lib/invoice-store";

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
  
  const watermarkFileRef = useRef<HTMLInputElement | null>(null);
  const companyLogoFileRef = useRef<HTMLInputElement | null>(null);

  const defaultItem: LineItem = { description: "", quantity: 1, rate: 0 };

  const defaultFormValues: Partial<InvoiceFormSchemaType> = {
    invoiceNumber: String(Date.now()).slice(-6),
    customerName: "",
    companyName: "",
    items: [defaultItem],
    startDate: new Date(),
    startTime: "09:00",
    endDate: new Date(),
    endTime: "17:00",
    invoiceNotes: "Thank you for your business! Payment is due within 30 days.",
    companyLogoFile: undefined,
    watermarkFile: undefined,
  };

  const form = useForm<InvoiceFormSchemaType>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultFormValues,
    mode: "onChange", // Important for useFieldArray and live calculations
  });

  const { watch, control, reset, setValue, trigger, getValues } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  useEffect(() => {
    if (watchedItems) {
      const total = watchedItems.reduce((sum, item) => {
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
        const rate = typeof item.rate === 'number' ? item.rate : 0;
        return sum + (quantity * rate);
      }, 0);
      setCalculatedTotalFee(total);
    }
  }, [watchedItems]);


  useEffect(() => {
    const invoiceIdToEdit = searchParams.get('id');
    if (invoiceIdToEdit && !initialDataLoaded) {
      const data = getInvoiceData(invoiceIdToEdit);
      if (data) {
        const formData: InvoiceFormSchemaType = {
          ...defaultFormValues, // Start with defaults
          ...data, // Override with loaded data
          invoiceNumber: data.invoiceNumber,
          startDate: data.startDate ? (data.startDate instanceof Date ? data.startDate : parseISO(data.startDate as unknown as string)) : new Date(),
          endDate: data.endDate ? (data.endDate instanceof Date ? data.endDate : parseISO(data.endDate as unknown as string)) : new Date(),
          items: data.items && data.items.length > 0 ? data.items : [defaultItem],
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
  }, [searchParams, reset, toast, initialDataLoaded, defaultFormValues]);

  const watchedCompanyLogoFile = watch("companyLogoFile");
  const watchedWatermarkFile = watch("watermarkFile");

  useEffect(() => {
    const currentInvoiceId = searchParams.get('id');
    const existingData = currentInvoiceId ? getInvoiceData(currentInvoiceId) : null;
  
    if (watchedCompanyLogoFile && watchedCompanyLogoFile.length > 0) {
      const file = watchedCompanyLogoFile[0];
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: "destructive", title: "File Too Large", description: "Company logo must be less than 2MB." });
        setValue('companyLogoFile', undefined, { shouldValidate: true });
        setCompanyLogoPreview(existingData?.companyLogoDataUrl || null);
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Company logo must be PNG, JPEG, or GIF." });
        setValue('companyLogoFile', undefined, { shouldValidate: true });
        setCompanyLogoPreview(existingData?.companyLogoDataUrl || null);
        return;
      }
      fileToDataUrl(file, toast).then(dataUrl => {
        setCompanyLogoPreview(dataUrl);
        if (!dataUrl) {
            setValue('companyLogoFile', undefined, { shouldValidate: true });
            setCompanyLogoPreview(existingData?.companyLogoDataUrl || null);
        }
      });
    } else {
        const currentLogoFileValue = form.getValues('companyLogoFile');
        if (existingData?.companyLogoDataUrl && (!currentLogoFileValue || currentLogoFileValue.length === 0)) {
             setCompanyLogoPreview(existingData.companyLogoDataUrl);
        } else if (!existingData && (!currentLogoFileValue || currentLogoFileValue.length === 0)) {
            setCompanyLogoPreview(null);
        }
    }
  }, [watchedCompanyLogoFile, searchParams, setValue, toast, trigger, form]);

  useEffect(() => {
    const currentInvoiceId = searchParams.get('id');
    const existingData = currentInvoiceId ? getInvoiceData(currentInvoiceId) : null;
  
    if (watchedWatermarkFile && watchedWatermarkFile.length > 0) {
      const file = watchedWatermarkFile[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: "File Too Large", description: "Watermark image must be less than 5MB." });
        setValue('watermarkFile', undefined, { shouldValidate: true }); 
        setWatermarkPreview(existingData?.watermarkDataUrl || null);
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Watermark must be PNG, JPEG, or GIF." });
        setValue('watermarkFile', undefined, { shouldValidate: true });
        setWatermarkPreview(existingData?.watermarkDataUrl || null);
        return;
      }
      fileToDataUrl(file, toast).then(dataUrl => {
        setWatermarkPreview(dataUrl); 
        if (!dataUrl) { 
            setValue('watermarkFile', undefined, { shouldValidate: true }); 
            setWatermarkPreview(existingData?.watermarkDataUrl || null);
        }
      });
    } else {
        const currentWatermarkFileValue = form.getValues('watermarkFile');
        if (existingData?.watermarkDataUrl && (!currentWatermarkFileValue || currentWatermarkFileValue.length === 0)) {
             setWatermarkPreview(existingData.watermarkDataUrl);
        } else if (!existingData && (!currentWatermarkFileValue || currentWatermarkFileValue.length === 0)) {
            setWatermarkPreview(null);
        }
    }
  }, [watchedWatermarkFile, searchParams, setValue, toast, trigger, form]);
  
  async function onSubmit(data: InvoiceFormSchemaType) {
    setIsSubmitting(true);
    try {
      const invoiceIdToEdit = searchParams.get('id');
      const existingInvoiceData = invoiceIdToEdit ? getInvoiceData(invoiceIdToEdit) : null;

      const invoiceId = existingInvoiceData?.id || `inv_${Date.now()}`;
      const invoiceNumber = data.invoiceNumber; 
      
      const currentDate = new Date();
      const invoiceDateToStore = existingInvoiceData?.invoiceDate || currentDate.toISOString();

      let companyLogoDataUrlToStore: string | null = companyLogoPreview;
      if (data.companyLogoFile && data.companyLogoFile.length > 0 && !companyLogoDataUrlToStore) {
        // If preview isn't set but file exists (e.g., error during preview gen but still submitted)
        companyLogoDataUrlToStore = await fileToDataUrl(data.companyLogoFile[0], toast);
      } else if (!data.companyLogoFile && existingInvoiceData?.companyLogoDataUrl && !companyLogoPreview) {
         // If no new file is selected and no preview is set (e.g. user cleared selection), but there was an existing logo
         // This case might need clarification: if a user clears a selection, should we remove the existing logo?
         // For now, if `companyLogoPreview` is null, it implies the logo should be removed or was never there.
      }


      let watermarkDataUrlToStore: string | null = watermarkPreview;
      if (data.watermarkFile && data.watermarkFile.length > 0 && !watermarkDataUrlToStore) {
        watermarkDataUrlToStore = await fileToDataUrl(data.watermarkFile[0], toast);
      }

      const totalFee = data.items.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        return sum + (quantity * rate);
      }, 0);
      
      const storedData: StoredInvoiceData = {
        id: invoiceId,
        invoiceNumber,
        invoiceDate: invoiceDateToStore,
        customerName: data.customerName,
        companyName: data.companyName,
        companyLogoDataUrl: companyLogoDataUrlToStore,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        items: data.items,
        totalFee: totalFee, // Store the calculated total fee
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

  const formatDateWithTime = (date?: Date, time?: string) => {
    if (!date || !time || !/^[0-2]\d:[0-5]\d$/.test(time)) return "Select date & time";
    const fullDate = parse(`${format(date, "yyyy-MM-dd")} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
    if (!isValid(fullDate)) return "Invalid date/time";
    return format(fullDate, "MMM d, yyyy hh:mm a");
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
                            <Input placeholder="e.g., INV-001" {...field} className="pl-8" />
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
            </div>

            <FormField
              control={control}
              name="companyLogoFile"
              render={({ field: { onChange, onBlur, name, value: formFieldValue, ref: fieldRef } }) => ( 
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Service Start Date</FormLabel>
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
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time (24h)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {watch("startDate") && watch("startTime") && <FormDescription className="text-sm text-muted-foreground">Selected Start: {formatDateWithTime(watch("startDate"), watch("startTime"))}</FormDescription>}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Service End Date</FormLabel>
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
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time (24h)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {watch("endDate") && watch("endTime") && <FormDescription className="text-sm text-muted-foreground">Selected End: {formatDateWithTime(watch("endDate"), watch("endTime"))}</FormDescription>}

            <Separator className="my-6" />
            
            <div>
              <FormLabel className="text-lg font-semibold">Invoice Items</FormLabel>
              <CardDescription>Add items or services provided.</CardDescription>
              <div className="space-y-4 mt-4">
                {fields.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-md shadow-sm space-y-3 bg-card">
                    <FormField
                      control={control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Web Development Services" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <FormField
                        control={control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="1" {...field} 
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                            <FormLabel>Rate (₹)</FormLabel>
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
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                            Amount: ₹{((Number(getValues(`items.${index}.quantity`)) || 0) * (Number(getValues(`items.${index}.rate`)) || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {fields.length > 1 && (
                       <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove Item
                      </Button>
                    )}
                  </div>
                ))}
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
              render={({ field: { onChange, onBlur, name, value: formFieldValue, ref: fieldRef } }) => ( 
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
                    <Textarea placeholder="e.g., Payment due in 30 days. Late fees may apply." {...field} rows={3} />
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
