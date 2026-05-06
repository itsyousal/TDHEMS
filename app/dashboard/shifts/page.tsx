
import { Metadata } from 'next';
import { ShiftCalendar } from "@/components/shifts/shift-calendar";
import { ShiftRosterManager } from "@/components/shifts/shift-roster-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
    title: 'Shift Management | Dough House',
    description: 'Manage employee shifts and rosters',
};

export default function ShiftsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Shift Management</h1>
                <p className="text-gray-500">
                    Plan, assign, and manage employee work schedules.
                </p>
            </div>

            <Tabs defaultValue="calendar" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="calendar">Schedule Calendar</TabsTrigger>
                    <TabsTrigger value="rosters">Shift Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="calendar" className="space-y-4">
                    <ShiftCalendar />
                </TabsContent>

                <TabsContent value="rosters">
                    <Card>
                        <CardHeader>
                            <CardTitle>Shift Templates Configuration</CardTitle>
                            <CardDescription>
                                Create and manage standard shift timings (e.g., Morning Shift, Night Shift) to streamline scheduling.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ShiftRosterManager />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
