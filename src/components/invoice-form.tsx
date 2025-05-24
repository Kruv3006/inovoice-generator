"use client";

import type { ElementRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format, differenceInMilliseconds, isValid, parse, addDays, parseISO } from "date-fns";
import { CalendarIcon, ImageUp, PartyPopper } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceFormSchemaType, StoredInvoiceData } from "@/lib/invoice-types";
import { invoiceFormSchema } from "@/lib/invoice-types";
import { getInvoiceData, saveInvoiceData } from "@/lib/invoice-store";

const fileToDataUrl = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file) resolve(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

export function InvoiceForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [duration, setDuration] = useState<{ days: number; hours: number; error?: string } | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const watermarkFileRef = useRef<HTMLInputElement | null>(null);

  const defaultFormValues: Partial<InvoiceFormSchemaType> = {
    customerName: "",
    startTime: "09:00",
    endTime: "17:00",
    totalFee: undefined,
    invoiceNotes: "Thank you for your business! Payment is due within 30 days.",
    // companyName, companyAddress, clientAddress rely on Zod defaults
  };

  const form = useForm<InvoiceFormSchemaType>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultFormValues,
  });

  const { watch, control, reset, setValue } = form;
  const watchedStartDate = watch("startDate");
  const watchedStartTime = watch("startTime");
  const watchedEndDate = watch("endDate");
  const watchedEndTime = watch("endTime");
  const watchedWatermarkFile = watch("watermarkFile");

  useEffect(() => {
    const invoiceIdToEdit = searchParams.get('id');
    if (invoiceIdToEdit && !initialDataLoaded) {
      const data = getInvoiceData(invoiceIdToEdit);
      if (data) {
        const formData: Partial<InvoiceFormSchemaType> = {
          ...data,
          startDate: data.startDate ? (data.startDate instanceof Date ? data.startDate : parseISO(data.startDate as unknown as string)) : undefined,
          endDate: data.endDate ? (data.endDate instanceof Date ? data.endDate : parseISO(data.endDate as unknown as string)) : undefined,
          totalFee: data.totalFee, // Should be a number or undefined
           // watermarkFile cannot be pre-filled, user must re-select
          watermarkFile: undefined,
           // explicit company/client details from stored data, or let schema defaults apply
          companyName: data.companyName,
          companyAddress: data.companyAddress,
          clientAddress: data.clientAddress,
          invoiceNotes: data.invoiceNotes,
        };
        reset(formData);

        if (data.watermarkDataUrl) {
          setWatermarkPreview(data.watermarkDataUrl);
        }
        
        // Recalculate duration
        if (formData.startDate && data.startTime && formData.endDate && data.endTime) {
            const startDateObj = formData.startDate;
            const endDateObj = formData.endDate;

            const startFullDate = parse(`${format(startDateObj, "yyyy-MM-dd")} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const endFullDate = parse(`${format(endDateObj, "yyyy-MM-dd")} ${data.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

            if (isValid(startFullDate) && isValid(endFullDate) && endFullDate > startFullDate) {
                let diffMs = differenceInMilliseconds(endFullDate, startFullDate);
                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                diffMs -= days * (1000 * 60 * 60 * 24);
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                setDuration({ days, hours, error: undefined });
            } else {
                setDuration({ days: 0, hours: 0, error: "End date/time must be after start." });
            }
        } else {
            setDuration(null);
        }
      } else {
        toast({ title: "Edit Error", description: "Could not load invoice data for editing.", variant: "destructive" });
        reset(defaultFormValues);
        setWatermarkPreview(null);
        setDuration(null);
      }
      setInitialDataLoaded(true);
    } else if (!invoiceIdToEdit && !initialDataLoaded) {
      reset(defaultFormValues);
      setWatermarkPreview(null);
      setDuration(null);
      setInitialDataLoaded(true); 
    }
  }, [searchParams, reset, toast, initialDataLoaded, defaultFormValues]);


  useEffect(() => {
    if (watchedWatermarkFile && watchedWatermarkFile.length > 0) {
      const file = watchedWatermarkFile[0];
      fileToDataUrl(file).then(setWatermarkPreview);
    } else {
        // Logic for existing watermark on edit:
        // If editing an invoice (id in params) and no new file chosen,
        // we might want to keep the existing watermarkPreview if it was set from loaded data.
        // The current logic in the main useEffect already sets watermarkPreview from loaded data.
        // If a file is explicitly removed (e.target.files is null or empty), then clear.
        const invoiceIdToEdit = searchParams.get('id');
        const existingData = invoiceIdToEdit ? getInvoiceData(invoiceIdToEdit) : null;
        if (watchedWatermarkFile && watchedWatermarkFile.length === 0 && !existingData?.watermarkDataUrl) {
             setWatermarkPreview(null);
        } else if (watchedWatermarkFile && watchedWatermarkFile.length === 0 && existingData?.watermarkDataUrl && !watermarkPreview) {
            // This case might be redundant if the main useEffect already set it
            setWatermarkPreview(existingData.watermarkDataUrl);
        }
    }
  }, [watchedWatermarkFile, searchParams, watermarkPreview]);

  useEffect(() => {
    if (watchedStartDate && watchedStartTime && watchedEndDate && watchedEndTime &&
        /^[0-2]\d:[0-5]\d$/.test(watchedStartTime) && /^[0-2]\d:[0-5]\d$/.test(watchedEndTime) ) {
      
      const startFullDate = parse(`${format(watchedStartDate, "yyyy-MM-dd")} ${watchedStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const endFullDate = parse(`${format(watchedEndDate, "yyyy-MM-dd")} ${watchedEndTime}`, 'yyyy-MM-dd HH:mm', new Date());

      if (!isValid(startFullDate) || !isValid(endFullDate)) {
        setDuration({days: 0, hours: 0, error: "Invalid date or time format."});
        return;
      }

      if (endFullDate <= startFullDate) {
        setDuration({ days: 0, hours: 0, error: "End date/time must be after start." });
        return;
      }

      let diff = differenceInMilliseconds(endFullDate, startFullDate);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * (1000 * 60 * 60 * 24);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      setDuration({ days, hours, error: undefined });
    } else {
      setDuration(null);
    }
  }, [watchedStartDate, watchedStartTime, watchedEndDate, watchedEndTime]);
  
  async function onSubmit(data: InvoiceFormSchemaType) {
    setIsSubmitting(true);
    try {
      const invoiceIdToEdit = searchParams.get('id');
      const existingInvoiceData = invoiceIdToEdit ? getInvoiceData(invoiceIdToEdit) : null;

      const invoiceId = existingInvoiceData?.id || `inv_${Date.now()}`;
      const invoiceNumber = existingInvoiceData?.invoiceNumber || `INV-${String(Date.now()).slice(-6)}`;
      
      const currentDate = new Date();
      const invoiceDateToStore = existingInvoiceData?.invoiceDate || currentDate.toISOString();
      const dueDate = addDays(parseISO(invoiceDateToStore), 30);


      let watermarkDataUrlToStore: string | null = watermarkPreview; 
      if (data.watermarkFile && data.watermarkFile.length > 0) { 
        watermarkDataUrlToStore = await fileToDataUrl(data.watermarkFile[0]);
      } else if (existingInvoiceData?.watermarkDataUrl) {
        // If no new file is uploaded during edit, retain existing watermark
        watermarkDataUrlToStore = existingInvoiceData.watermarkDataUrl;
      } else {
        // No new file and no existing watermark
        watermarkDataUrlToStore = null;
      }
      
      const storedData: StoredInvoiceData = {
        ...data, // contains customerName, dates, times, totalFee, invoiceNotes from form
        id: invoiceId,
        invoiceNumber,
        invoiceDate: invoiceDateToStore,
        dueDate: dueDate.toISOString(),
        watermarkDataUrl: watermarkDataUrlToStore,
        duration: duration && !duration.error ? {days: duration.days, hours: duration.hours} : undefined,
        // companyName, companyAddress, clientAddress will use Zod defaults if not in 'data'
        // or explicitly set from loaded data if that was the design (currently relying on schema defaults)
        companyName: data.companyName || invoiceFormSchema.shape.companyName.default(),
        companyAddress: data.companyAddress || invoiceFormSchema.shape.companyAddress.default(),
        clientAddress: data.clientAddress || invoiceFormSchema.shape.clientAddress.default(),
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
             <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
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
            {watchedStartDate && watchedStartTime && <FormDescription className="text-sm text-muted-foreground">Selected Start: {formatDateWithTime(watchedStartDate, watchedStartTime)}</FormDescription>}


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
            {watchedEndDate && watchedEndTime && <FormDescription className="text-sm text-muted-foreground">Selected End: {formatDateWithTime(watchedEndDate, watchedEndTime)}</FormDescription>}


            {duration && (
              <div className={cn("p-3 rounded-md", duration.error ? "bg-destructive/10" : "bg-secondary")}>
                <p className={cn("font-medium", duration.error ? "text-destructive" : "text-foreground")}>
                  Calculated Duration: 
                  {duration.error ? <span> {duration.error}</span> : ` ${duration.days} days and ${duration.hours} hours`}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="totalFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Fee (e.g., USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 150.00"
                      {...field} // Spread field to pass name, onBlur, ref
                      // Override value to ensure it's always a string for the native input
                      value={(field.value === undefined || field.value === null) ? '' : String(field.value)}
                      // Override onChange to handle string-to-number/undefined conversion for react-hook-form
                      onChange={e => {
                        const stringValue = e.target.value;
                        field.onChange(stringValue === '' ? undefined : parseFloat(stringValue));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="watermarkFile"
              render={({ field: { onChange, onBlur, name, value: formFieldValue /* Renamed to avoid conflict */ } }) => ( 
                <FormItem>
                  <FormLabel>Custom Watermark (Optional, PNG/JPEG/GIF, &lt;5MB)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                       <Button type="button" variant="outline" onClick={() => watermarkFileRef.current?.click()}>
                        <ImageUp className="mr-2 h-4 w-4" /> {watermarkPreview ? "Change Image" : "Upload Image"}
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
                            onChange(files); // Update RHF state
                            if (files && files.length > 0) {
                                fileToDataUrl(files[0]).then(setWatermarkPreview);
                            } else {
                                // If file input is cleared (no file selected)
                                // Check if we are editing and there was an original watermark
                                const invoiceIdToEdit = searchParams.get('id');
                                const existingData = invoiceIdToEdit ? getInvoiceData(invoiceIdToEdit) : null;
                                if (existingData && existingData.watermarkDataUrl) {
                                    // Revert to existing watermark preview if user clears selection during edit
                                    setWatermarkPreview(existingData.watermarkDataUrl);
                                } else {
                                    // Otherwise, clear preview
                                    setWatermarkPreview(null);
                                }
                            }
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
                  <Image src={watermarkPreview} alt="Watermark preview" layout="fill" objectFit="contain" data-ai-hint="logo design"/>
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
