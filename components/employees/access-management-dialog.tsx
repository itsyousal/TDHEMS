'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
    role: z.enum(['admin', 'manager', 'employee']),
});

interface AccessManagementDialogProps {
    employeeId: string;
    employeeName: string;
    currentRole?: string;
    onSuccess?: () => void;
}

export function AccessManagementDialog({
    employeeId,
    employeeName,
    currentRole = 'employee',
    onSuccess
}: AccessManagementDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            role: (currentRole as 'admin' | 'manager' | 'employee') || 'employee',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}/access`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: values.role }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update access');
            }

            toast.success('Access updated successfully');
            setOpen(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Shield className="mr-2 h-4 w-4" />
                    Manage Access
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white text-gray-900">
                <DialogHeader>
                    <DialogTitle>Manage Access for {employeeName}</DialogTitle>
                    <DialogDescription>
                        Assign a system role to this employee. This determines their permissions and access levels.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>System Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="employee">Employee (Standard Access)</SelectItem>
                                            <SelectItem value="manager">Manager (Department Access)</SelectItem>
                                            <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Admins have full access to all settings and data. Managers can view their department's data.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={() => setOpen(false)} type="button">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} variant="secondary">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Access
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
