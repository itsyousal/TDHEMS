
"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Plus, Users, Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
}

interface ShiftRoster {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
}

interface Location {
    id: string;
    name: string;
}

interface ShiftAssignment {
    id: string;
    employeeId: string;
    shiftId: string;
    locationId: string;
    assignedDate: string;
    shift: ShiftRoster;
    employee: Employee;
    location: Location;
}

export function ShiftCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [rosters, setRosters] = useState<ShiftRoster[]>([]);
    const [locations, setLocations] = useState<Location[]>([]); // We need a way to fetch locations, assuming hardcoded or fetched elsewhere for now.

    // For the assignment dialog
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [selectedShift, setSelectedShift] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    async function fetchData() {
        setLoading(true);
        try {
            // Parallel fetch for assignments, employees, rosters
            // Note: In a real app we might want to separate these or use a specialized hook/SWR
            const [assignRes, empRes, rostRes] = await Promise.all([
                fetch(`/api/shifts/assignments?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`),
                fetch(`/api/employees`),
                fetch(`/api/shifts/rosters`)
            ]);

            if (assignRes.ok) setAssignments(await assignRes.json());
            if (empRes.ok) setEmployees(await empRes.json());
            if (rostRes.ok) setRosters(await rostRes.json());

            // Temporary: Fetch locations. In a real scenario, this should be a proper API.
            // Assuming for now user has context or we can adapt.
            // Let's just mock one default location if we can't find an API easily or add a dedicated fetch if needed.
            // Checking known APIs... no dedicated 'locations' list API visible in previous steps, 
            // but `api/employees` might return org data?
            // Let's assume a default main location for now or fetch from a new endpoint if we had one.
            // Creating a dummy location for now as fallback or fetching from user's org if possible?
            // Actually, let's try to fetch user's locations if possible or just hardcode a placeholder until we build a location selector properly.
            // Better: Let's assume the user has at least one location. 
            // We'll use the first available location from any previous assignment or just a placeholder 'Main' if none.
            // Correct approach: Add a proper location fetch.
        } catch (error) {
            console.error(error);
            toast.error("Failed to load schedule data");
        } finally {
            setLoading(false);
        }
    }

    async function handleAssignShift() {
        if (!selectedDate || !selectedEmployee || !selectedShift) {
            toast.error("Please select employee and shift");
            return;
        }

        try {
            // Need a location ID. For now, we'll try to find one from the employee's record (if available) 
            // or just pick the first valid UUID we can find? 
            // REALITY CHECK: We need a valid Location ID. 
            // Let's cheat slightly and use the employee's org ID if location is not strictly enforced in FKs? 
            // WAIT, `Location` is a relation. We MUST have a valid ID.
            // Let's fetch locations properly first? 
            // Or... let's just use the first roster's ID? No.
            // Let's use the employee's default location?

            // QUICK FIX: Fetch locations on mount.
            // Since we don't have a direct `api/locations` route exposed in the context yet, 
            // we will create one quickly or assume we can get it from somewhere.
            // Re-reading `api/employees`... it returns employee data. 
            // Let's try to find a valid location ID from the employee list (e.g. `userOrgMap` or similar if available).
            // Actually, we can fetch locations from `/api/organization/locations` if it existed.
            // Let's assume we can get locations.

            // Let's fetch locations dynamically here for safety
            // We'll assume there is at least one location.
        } catch (e) {

        }

        // Implementation of Assign logic details...
        // ...
    }

    const previousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={previousWeek}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="font-semibold text-lg w-48 text-center">
                        {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                    </div>
                    <Button variant="outline" size="icon" onClick={nextWeek}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
                    <AssignShiftDialog
                        employees={employees}
                        rosters={rosters}
                        onAssign={fetchData}
                        selectedDate={selectedDate} // Optional: Pre-select date if clicked on a cell
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Calendar Header */}
                        <div className="grid grid-cols-8 border-b bg-gray-50">
                            <div className="p-4 font-medium text-gray-500 text-sm border-r">Employee</div>
                            {weekDays.map((day) => (
                                <div key={day.toString()} className={`p-4 text-center border-r last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`}>
                                    <div className="font-semibold text-gray-900">{format(day, "EEE")}</div>
                                    <div className="text-sm text-gray-500">{format(day, "d")}</div>
                                </div>
                            ))}
                        </div>

                        {/* Calendar Body */}
                        {loading ? (
                            <div className="p-12 text-center text-gray-400 flex justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No employees found.</div>
                        ) : (
                            <div className="divide-y">
                                {employees.map((emp) => (
                                    <div key={emp.id} className="grid grid-cols-8 hover:bg-gray-50/50 transition-colors group">
                                        <div className="p-3 border-r flex items-center gap-3 bg-white group-hover:bg-gray-50">
                                            <div className="h-8 w-8 rounded-full bg-dough-brown-100 flex items-center justify-center text-dough-brown-700 text-xs font-bold">
                                                {emp.firstName[0]}{emp.lastName[0]}
                                            </div>
                                            <div className="truncate">
                                                <div className="font-medium text-sm text-gray-900 truncate">{emp.firstName} {emp.lastName}</div>
                                                <div className="text-xs text-gray-500">{emp.employeeId}</div>
                                            </div>
                                        </div>
                                        {weekDays.map((day) => {
                                            const dayAssignments = assignments.filter(a =>
                                                a.employeeId === emp.id &&
                                                isSameDay(parseISO(a.assignedDate), day)
                                            );

                                            return (
                                                <div
                                                    key={day.toString()}
                                                    className="p-2 border-r last:border-r-0 min-h-[80px] relative transition-all hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => {
                                                        // In a real app, this could open a context menu or the assign dialog pre-filled
                                                        // For now, we'll just handle it via the main button or maybe a small + icon on hover
                                                    }}
                                                >
                                                    {dayAssignments.length > 0 ? dayAssignments.map((assignment) => (
                                                        <div key={assignment.id} className="mb-1 bg-blue-100 border border-blue-200 rounded p-1.5 text-xs group/item shadow-sm relative">
                                                            <div className="font-semibold text-blue-800">{assignment.shift.name}</div>
                                                            <div className="text-blue-600 mb-1">{assignment.shift.startTime} - {assignment.shift.endTime}</div>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                                <MapPin className="h-2 w-2" />
                                                                <span className="truncate max-w-[80px]">{assignment.location?.name || 'Main'}</span>
                                                            </div>

                                                            <button
                                                                className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-0.5"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm('Remove this shift?')) {
                                                                        fetch(`/api/shifts/assignments/${assignment.id}`, { method: 'DELETE' })
                                                                            .then(() => { toast.success('Shift removed'); fetchData(); });
                                                                    }
                                                                }}
                                                            >
                                                                <span className="sr-only">Remove</span>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                                                            </button>
                                                        </div>
                                                    )) : (
                                                        <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <AssignShiftDirectDialog
                                                                employee={emp}
                                                                date={day}
                                                                rosters={rosters}
                                                                onSuccess={fetchData}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function AssignShiftDialog({ employees, rosters, onAssign, selectedDate }: any) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form states
    const [empId, setEmpId] = useState("");
    const [shiftId, setShiftId] = useState("");
    const [date, setDate] = useState(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    const [locations, setLocations] = useState<any[]>([]);
    const [locationId, setLocationId] = useState("");

    // Fetch locations on open
    useEffect(() => {
        if (open) {
            // Mock fetch locations for now since we don't have a dedicated endpoint yet
            // In a real app we'd fetch from /api/locations
            fetch('/api/organization/locations').then(res => {
                if (res.ok) return res.json();
                return [];
            }).then(data => {
                if (data.length > 0) {
                    setLocations(data);
                    setLocationId(data[0].id);
                } else {
                    // Fallback to fetch from an employee's data if possible or just assume empty
                    // Without locations we can't create a shift
                    // Let's create a temporary location fetcher hack
                }
            }).catch(() => { });
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empId || !shiftId || !date || !locationId) {
            toast.error("All fields are required");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/shifts/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: empId,
                    shiftId,
                    locationId,
                    assignedDate: date
                }),
            });

            if (!res.ok) throw new Error("Failed to assign shift");

            toast.success("Shift assigned successfully");
            setOpen(false);
            onAssign();
        } catch (error) {
            console.error(error);
            toast.error("Failed to assign shift");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Shift
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Shift</DialogTitle>
                    <DialogDescription>Schedule a shift for an employee.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Employee</Label>
                        <Select value={empId} onValueChange={setEmpId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((e: any) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.firstName} {e.lastName} ({e.employeeId})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Shift Template</Label>
                        <Select value={shiftId} onValueChange={setShiftId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select shift" />
                            </SelectTrigger>
                            <SelectContent>
                                {rosters.map((r: any) => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.name} ({r.startTime} - {r.endTime})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Date</Label>
                        <div className="relative">
                            <input
                                type="date"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Location Selector (Assuming we built the API) */}
                    <LocationSelect value={locationId} onChange={setLocationId} />

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Assign
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Small helper for direct assignment from calendar cell
function AssignShiftDirectDialog({ employee, date, rosters, onSuccess }: any) {
    const [open, setOpen] = useState(false);
    const [shiftId, setShiftId] = useState("");
    const [locationId, setLocationId] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAssign = async () => {
        if (!shiftId || !locationId) {
            toast.error("Please select shift and location");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/shifts/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: employee.id,
                    shiftId,
                    locationId,
                    assignedDate: format(date, 'yyyy-MM-dd')
                }),
            });

            if (!res.ok) throw new Error("Failed");
            toast.success("Shift assigned");
            setOpen(false);
            onSuccess();
        } catch (error) {
            toast.error("Failed to assign");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-50 hover:opacity-100 hover:bg-dough-brown-100 text-dough-brown-600">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Shift</DialogTitle>
                    <DialogDescription>
                        {employee.firstName} {employee.lastName} • {format(date, 'MMM do')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Shift</Label>
                        <Select value={shiftId} onValueChange={setShiftId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose shift..." />
                            </SelectTrigger>
                            <SelectContent>
                                {rosters.map((r: any) => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.name} ({r.startTime} - {r.endTime})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <LocationSelect value={locationId} onChange={setLocationId} />
                </div>
                <DialogFooter>
                    <Button onClick={handleAssign} disabled={loading}>Assign</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Reusable Location Select Component
function LocationSelect({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [locations, setLocations] = useState<any[]>([]);

    useEffect(() => {
        // Fetch locations. Since we don't have this API endpoint confirmed, let's create it or use a known one.
        // Assuming we need to create it. For now, let's try to fetch from a generic endpoint we'll create next.
        fetch('/api/organization/locations').then(res => res.json()).then(data => {
            if (Array.isArray(data)) {
                setLocations(data);
                if (data.length > 0 && !value) onChange(data[0].id);
            }
        }).catch(err => console.error("Failed to fetch locations", err));
    }, []);

    return (
        <div className="space-y-2">
            <Label>Location</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                    {locations.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
