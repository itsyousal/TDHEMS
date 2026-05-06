
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, Edit2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const rosterSchema = z.object({
    name: z.string().min(1, "Name is required"),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    breakDuration: z.coerce.number().min(0, "Break duration must be positive"),
});

type RosterFormValues = z.infer<typeof rosterSchema>;

interface ShiftRoster {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakDuration: number;
}

export function ShiftRosterManager() {
    const [rosters, setRosters] = useState<ShiftRoster[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRoster, setEditingRoster] = useState<ShiftRoster | null>(null);

    const form = useForm<RosterFormValues>({
        // @ts-ignore - Resolver type mismatch with zod coerce
        resolver: zodResolver(rosterSchema),
        defaultValues: {
            name: "",
            startTime: "09:00",
            endTime: "17:00",
            breakDuration: 30,
        },
    });

    useEffect(() => {
        fetchRosters();
    }, []);

    useEffect(() => {
        if (editingRoster) {
            form.reset({
                name: editingRoster.name,
                startTime: editingRoster.startTime,
                endTime: editingRoster.endTime,
                breakDuration: editingRoster.breakDuration,
            });
        } else {
            form.reset({
                name: "",
                startTime: "09:00",
                endTime: "17:00",
                breakDuration: 30,
            });
        }
    }, [editingRoster, form]);

    async function fetchRosters() {
        try {
            setLoading(true);
            const res = await fetch("/api/shifts/rosters");
            if (!res.ok) throw new Error("Failed to fetch rosters");
            const data = await res.json();
            setRosters(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load shift rosters");
        } finally {
            setLoading(false);
        }
    }

    async function onSubmit(data: RosterFormValues) {
        try {
            const url = editingRoster
                ? `/api/shifts/rosters/${editingRoster.id}`
                : "/api/shifts/rosters";

            const method = editingRoster ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Failed to save roster");

            toast.success(editingRoster ? "Roster updated" : "Roster created");
            fetchRosters();
            setIsDialogOpen(false);
            setEditingRoster(null);
            form.reset();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save roster");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure? This will delete the roster template.")) return;

        try {
            const res = await fetch(`/api/shifts/rosters/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete roster");

            toast.success("Roster deleted");
            fetchRosters();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete roster");
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Shift Templates</h3>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingRoster(null);
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setEditingRoster(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingRoster ? "Edit Template" : "Create Shift Template"}</DialogTitle>
                            <DialogDescription>
                                Define standard shift times to easily assign to employees.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                                <FormField
                                    control={form.control as any}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Shift Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Morning Shift" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control as any}
                                        name="startTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Start Time</FormLabel>
                                                <FormControl>
                                                    <Input type="time" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="endTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>End Time</FormLabel>
                                                <FormControl>
                                                    <Input type="time" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control as any}
                                    name="breakDuration"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Break Duration (minutes)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit">Save Template</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
            ) : rosters.length === 0 ? (
                <div className="text-center p-8 border rounded-lg bg-gray-50 text-gray-500 text-sm">
                    No shift templates created yet.
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Break</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rosters.map((roster) => (
                                <TableRow key={roster.id}>
                                    <TableCell className="font-medium">{roster.name}</TableCell>
                                    <TableCell>{roster.startTime} - {roster.endTime}</TableCell>
                                    <TableCell>{roster.breakDuration}m</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditingRoster(roster);
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(roster.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
