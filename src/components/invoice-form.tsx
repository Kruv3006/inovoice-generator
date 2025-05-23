
"use client";

import type { ElementRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format, differenceInMilliseconds, isValid, parse, addDays } from "date-fns";
import { CalendarIcon, ImageUp, PartyPopper } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
import { saveInvoiceData } from "@/lib/invoice-store";

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
  const [duration, setDuration] = useState<{ days: number; hours: number; error?: string } | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const watermarkFileRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<InvoiceFormSchemaType>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerName: "",
      startTime: "09:00",
      endTime: "17:00",
      totalFee: undefined,
      companyName: "Your Company LLC",
      companyAddress: "123 Main St, Anytown, USA",
      clientAddress: "456 Client Ave, Otherville, USA",
      invoiceNotes: "Thank you for your business! Payment is due within 30 days.",
    },
  });

  const { watch, control } = form;
  const watchedStartDate = watch("startDate");
  const watchedStartTime = watch("startTime");
  const watchedEndDate = watch("endDate");
  const watchedEndTime = watch("endTime");
  const watchedWatermarkFile = watch("watermarkFile");

  useEffect(() => {
    if (watchedWatermarkFile && watchedWatermarkFile.length > 0) {
      const file = watchedWatermarkFile[0];
      // Validation is now primarily handled by Zod schema
      fileToDataUrl(file).then(setWatermarkPreview);
    } else {
      setWatermarkPreview(null);
    }
  }, [watchedWatermarkFile]);

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
      const invoiceId = `inv_${Date.now()}`;
      const invoiceNumber = `INV-${String(Date.now()).slice(-6)}`;
      const currentDate = new Date();
      const dueDate = addDays(currentDate, 30);

      let watermarkDataUrl: string | null = null;
      if (data.watermarkFile && data.watermarkFile.length > 0) {
        watermarkDataUrl = await fileToDataUrl(data.watermarkFile[0]);
      }
      
      const storedData: StoredInvoiceData = {
        ...data,
        id: invoiceId,
        invoiceNumber,
        invoiceDate: currentDate.toISOString(),
        dueDate: dueDate.toISOString(),
        watermarkDataUrl,
        duration: duration && !duration.error ? {days: duration.days, hours: duration.hours} : undefined,
      };

      saveInvoiceData(invoiceId, storedData);

      toast({
        title: "Invoice Details Saved!",
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
      setIsSubmitting(false);
    }
    // setIsSubmitting will be false on successful navigation or caught error
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
        <CardTitle className="text-3xl font-bold text-center text-primary">Create New Invoice</CardTitle>
        <CardDescription className="text-center text-muted-foreground">Fill in the details below to generate your invoice.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Company Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., 123 Business Rd, Suite 100, City, Country" {...field} rows={2}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <FormField
              control={form.control}
              name="clientAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 456 Client St, Apt B, City, Country" {...field} rows={2} />
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
                    <Input type="number" step="0.01" placeholder="e.g., 150.00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="watermarkFile"
              render={({ field: { onChange, onBlur, name } }) => ( // removed ref as it's handled by Zod with custom FileList
                <FormItem>
                  <FormLabel>Custom Watermark (Optional, PNG/JPEG/GIF, &lt;5MB)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                       <Button type="button" variant="outline" onClick={() => watermarkFileRef.current?.click()}>
                        <ImageUp className="mr-2 h-4 w-4" /> Upload Image
                      </Button>
                      <Input
                        type="file"
                        accept="image/png, image/jpeg, image/gif"
                        className="hidden"
                        ref={watermarkFileRef} // local ref for click trigger
                        name={name}
                        onBlur={onBlur}
                        onChange={(e) => onChange(e.target.files)}
                      />
                      {watchedWatermarkFile && watchedWatermarkFile.length > 0 && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{watchedWatermarkFile[0].name}</span>}
                    </div>
                  </FormControl>
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
            
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting ? "Processing..." : "Preview Invoice"}
              {!isSubmitting && <PartyPopper className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
