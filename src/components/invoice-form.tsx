
"use client";

import type { ElementRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format, differenceInMilliseconds, isValid, parse } from "date-fns";
import { CalendarIcon, Download, ImageUp, Loader2 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { generatePdf, generateDoc, generateJpeg } from "@/lib/invoice-generator";

const invoiceFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").regex(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces."),
  startDate: z.date({ required_error: "Start date is required." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Valid 24-hour time (HH:MM) is required."),
  endDate: z.date({ required_error: "End date is required." }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Valid 24-hour time (HH:MM) is required."),
  totalFee: z.preprocess(
    (val) => parseFloat(String(val).replace(/[^0-9.-]+/g, "")), // Sanitize input
    z.number({ invalid_type_error: "Total fee must be a number." })
     .positive({ message: "Total fee must be a positive amount." })
     .max(1000000000, "Total fee seems too large.")
  ),
  watermarkFile: z.custom<FileList>((val) => val instanceof FileList, "Please upload a file").optional(),
}).refine(data => {
  if (data.startDate && data.startTime && data.endDate && data.endTime) {
    const startFullDate = parse(`${format(data.startDate, "yyyy-MM-dd")} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const endFullDate = parse(`${format(data.endDate, "yyyy-MM-dd")} ${data.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
    return endFullDate > startFullDate;
  }
  return true;
}, {
  message: "End date & time must be after start date & time.",
  path: ["endDate"], 
});

export type InvoiceFormSchemaType = z.infer<typeof invoiceFormSchema>;

export function InvoiceForm() {
  const { toast } = useToast();
  const [duration, setDuration] = useState<{ days: number; hours: number; error?: string } | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const watermarkFileRef = useRef<HTMLInputElement | null>(null);


  const form = useForm<InvoiceFormSchemaType>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerName: "",
      startTime: "09:00",
      endTime: "17:00",
      totalFee: undefined,
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
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: "destructive", title: "File too large", description: "Watermark image must be less than 5MB." });
        setWatermarkPreview(null);
        if (watermarkFileRef.current) {
          watermarkFileRef.current.value = ""; 
        }
        form.setValue("watermarkFile", undefined);
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a PNG, JPEG, or GIF image." });
        setWatermarkPreview(null);
        if (watermarkFileRef.current) {
          watermarkFileRef.current.value = "";
        }
        form.setValue("watermarkFile", undefined);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setWatermarkPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setWatermarkPreview(null);
    }
  }, [watchedWatermarkFile, toast, form]);

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
      setDuration({ days, hours });
    } else {
      setDuration(null);
    }
  }, [watchedStartDate, watchedStartTime, watchedEndDate, watchedEndTime]);
  
  async function onSubmit(data: InvoiceFormSchemaType) {
    setIsGenerating(true);
    try {
      toast({
        title: "Invoice Generation",
        description: "Processing your request...",
      });
      // For generation functions, we pass watermarkPreview which is a base64 data URL
      // This is a simplification; ideally, file object or more robust handling is needed for server-side.
      // For client-side generation (like with html2canvas), data URL is fine.
      
      // Here we pick one as an example, or you can have specific buttons call specific generators
      // For this example, let's assume a "Generate All" or specific buttons are handled outside this onSubmit
      // This onSubmit is more for form validation feedback, actual generation will be triggered by specific buttons.
      console.log("Form data is valid:", data);
      // Actual generation will be triggered by specific buttons, example shown in JSX below.
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsGenerating(false); // Ensure this is reset
    }
  }

  const handleGenerate = async (generator: (data: InvoiceFormSchemaType, watermark?: string) => Promise<void>) => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please correct the errors in the form."});
      return;
    }
    setIsGenerating(true);
    try {
      await generator(form.getValues(), watermarkPreview || undefined);
    } catch (e) {
       toast({ variant: "destructive", title: "Generation Error", description: "Could not generate the file."});
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDateWithTime = (date?: Date, time?: string) => {
    if (!date || !time || !/^[0-2]\d:[0-5]\d$/.test(time)) return "Select date & time";
    const fullDate = parse(`${format(date, "yyyy-MM-dd")} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
    if (!isValid(fullDate)) return "Invalid date/time";
    return format(fullDate, "MMM d, yyyy hh:mm a");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary">Create New Invoice</CardTitle>
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
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
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
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
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
              <div className="p-3 bg-secondary rounded-md">
                <p className="font-medium text-foreground">
                  Calculated Duration: 
                  {duration.error ? <span className="text-destructive"> {duration.error}</span> : ` ${duration.days} days and ${duration.hours} hours`}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="totalFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Fee</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 150.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || '')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="watermarkFile"
              render={({ field: { onChange, onBlur, name, ref } }) => (
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
                        ref={(e) => {
                          ref(e); // react-hook-form ref
                          watermarkFileRef.current = e; // local ref
                        }}
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
            
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button type="button" onClick={() => handleGenerate(generatePdf)} disabled={isGenerating} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download PDF
              </Button>
              <Button type="button" onClick={() => handleGenerate(generateDoc)} disabled={isGenerating} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download DOC
              </Button>
              <Button type="button" onClick={() => handleGenerate(generateJpeg)} disabled={isGenerating} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download JPEG
              </Button>
            </div>
            {/* Hidden submit button for form validation on enter, if desired, but explicit generate buttons are better UX */}
            {/* <Button type="submit" className="hidden">Validate</Button> */}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

