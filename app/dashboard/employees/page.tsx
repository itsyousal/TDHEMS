'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    Search,
    Users,
    Loader2,
    UserPlus,
    Filter,
    RefreshCw,
    Eye,
    Edit,
    Trash2,
    Mail,
    Phone,
    Calendar,
    Building,
    Briefcase,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Shield,
    KeyRound,
    X,
    MoreHorizontal,
    UserCheck,
    UserX,
    Download,
} from 'lucide-react';
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog';
import { ChangePasswordDialog } from '@/components/employees/change-password-dialog';
import { AccessManagementDialog } from '@/components/employees/access-management-dialog';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================
interface Employee {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    department: string | null;
    designation: string | null;
    status: string;
    joinDate: string;
    exitDate: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    salary: number | null;
    emergencyContact: string | null;
    user?: {
        id: string;
        isActive: boolean;
        lastLogin: string | null;
        userRoles?: { role: { slug: string; name: string } }[];
    } | null;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'on_leave' | 'terminated';
type DepartmentFilter = 'all' | string;

// ============================================================================
// Utility Functions
// ============================================================================
function getStatusBadge(status: string) {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
        active: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
        inactive: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
        on_leave: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
        terminated: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
        <Badge className={`${config.bg} ${config.text} hover:${config.bg} font-medium`}>
            <Icon className="h-3 w-3 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Badge>
    );
}

function formatDate(date: string | null) {
    if (!date) return '—';
    try {
        return format(new Date(date), 'MMM d, yyyy');
    } catch {
        return '—';
    }
}

// ============================================================================
// Employee Detail Modal Component
// ============================================================================
function EmployeeDetailModal({
    employee,
    isOpen,
    onClose,
    onEdit,
    onRefresh,
}: {
    employee: Employee | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (emp: Employee) => void;
    onRefresh: () => void;
}) {
    if (!employee) return null;

    const fullName = `${employee.firstName} ${employee.lastName}`;
    const initials = `${employee.firstName[0]}${employee.lastName[0]}`;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">
                        Employee Details
                    </DialogTitle>
                    <DialogDescription>
                        View and manage employee information
                    </DialogDescription>
                </DialogHeader>

                {/* Employee Header */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="h-16 w-16 rounded-full bg-dough-brown-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-dough-brown-600">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">{fullName}</h3>
                        <p className="text-sm text-gray-500">{employee.designation || 'No title assigned'}</p>
                        <p className="text-sm text-gray-400">ID: {employee.employeeId}</p>
                        <div className="mt-2 flex items-center gap-2">
                            {getStatusBadge(employee.status)}
                            {employee.user && (
                                <Badge
                                    variant="outline"
                                    className={
                                        employee.user.isActive
                                            ? 'text-green-600 border-green-200'
                                            : 'text-red-600 border-red-200'
                                    }
                                >
                                    {employee.user.isActive ? 'Account Active' : 'Account Inactive'}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 border-b pb-2">Contact Information</h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{employee.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">{employee.phone || 'Not provided'}</span>
                            </div>
                            {employee.address && (
                                <div className="flex items-start gap-3 text-sm">
                                    <Building className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <span className="text-gray-600">
                                        {employee.address}
                                        {employee.city && `, ${employee.city}`}
                                        {employee.state && `, ${employee.state}`}
                                        {employee.postalCode && ` ${employee.postalCode}`}
                                    </span>
                                </div>
                            )}
                            {employee.emergencyContact && (
                                <div className="flex items-center gap-3 text-sm">
                                    <AlertCircle className="h-4 w-4 text-red-400" />
                                    <span className="text-gray-600">
                                        Emergency: {employee.emergencyContact}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Employment Details */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 border-b pb-2">Employment Details</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Department</span>
                                <span className="font-medium text-gray-900">
                                    {employee.department || '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Designation</span>
                                <span className="font-medium text-gray-900">
                                    {employee.designation || '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Join Date</span>
                                <span className="font-medium text-gray-900">
                                    {formatDate(employee.joinDate)}
                                </span>
                            </div>
                            {employee.exitDate && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Exit Date</span>
                                    <span className="font-medium text-gray-900">
                                        {formatDate(employee.exitDate)}
                                    </span>
                                </div>
                            )}
                            {employee.user?.userRoles?.[0] && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">System Role</span>
                                    <Badge variant="secondary">
                                        {employee.user.userRoles[0].role.name}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <DialogFooter className="mt-6 gap-2 flex-wrap">
                    <div className="flex gap-2">
                        <AccessManagementDialog
                            employeeId={employee.id}
                            employeeName={fullName}
                            currentRole={employee.user?.userRoles?.[0]?.role.slug}
                            onSuccess={onRefresh}
                        />
                        <ChangePasswordDialog
                            employeeId={employee.id}
                            employeeName={fullName}
                        />
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// Edit Employee Modal Component
// ============================================================================
function EditEmployeeModal({
    employee,
    isOpen,
    onClose,
    onSave,
    isLoading,
}: {
    employee: Employee | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Employee>) => Promise<void>;
    isLoading: boolean;
}) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        department: '',
        designation: '',
        status: 'active',
    });

    useEffect(() => {
        if (employee) {
            setFormData({
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                phone: employee.phone || '',
                department: employee.department || '',
                designation: employee.designation || '',
                status: employee.status || 'active',
            });
        }
    }, [employee]);

    if (!employee) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">
                        Edit Employee
                    </DialogTitle>
                    <DialogDescription>
                        Update employee information
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+91 9876543210"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                placeholder="e.g., Production"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="designation">Designation</Label>
                            <Input
                                id="designation"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                placeholder="e.g., Baker"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="on_leave">On Leave</SelectItem>
                                <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="secondary" disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// Terminate Employee Confirmation Modal
// ============================================================================
function TerminateConfirmModal({
    employee,
    isOpen,
    onClose,
    onConfirm,
    isLoading,
}: {
    employee: Employee | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
}) {
    if (!employee) return null;

    const fullName = `${employee.firstName} ${employee.lastName}`;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Terminate Employee
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be easily undone. The employee&apos;s status will be set to terminated
                        and their system account will be deactivated.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200 my-4">
                    <p className="text-sm text-red-700">
                        You are about to terminate <strong>{fullName}</strong> (ID: {employee.employeeId}).
                    </p>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirm Termination
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// Stats Summary Component
// ============================================================================
function StatsSummary({ employees }: { employees: Employee[] }) {
    const stats = useMemo(() => {
        const active = employees.filter((e) => e.status === 'active').length;
        const inactive = employees.filter((e) => e.status === 'inactive').length;
        const onLeave = employees.filter((e) => e.status === 'on_leave').length;
        const terminated = employees.filter((e) => e.status === 'terminated').length;
        const withAccounts = employees.filter((e) => e.user).length;

        return { total: employees.length, active, inactive, onLeave, terminated, withAccounts };
    }, [employees]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-500">Total</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-gray-500">Active</span>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-gray-500">On Leave</span>
                </div>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.onLeave}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-500">Inactive</span>
                </div>
                <p className="text-2xl font-bold text-gray-600 mt-1">{stats.inactive}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-gray-500">Terminated</span>
                </div>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.terminated}</p>
            </div>
            <div className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-gray-500">With Accounts</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.withAccounts}</p>
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================
export default function EmployeesPage() {
    const { data: session, status: authStatus } = useSession();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>('all');

    // Modal states
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            redirect('/auth/login');
        }
    }, [authStatus]);

    // Fetch employees
    const fetchEmployees = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch('/api/employees');

            if (!res.ok) {
                if (res.status === 403) {
                    setError('Permission Denied: You do not have access to manage employees.');
                    return;
                }
                throw new Error('Failed to fetch employees');
            }

            const data = await res.json();
            setEmployees(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load employee data. Please try again.');
            toast.error('Failed to load employees');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authStatus === 'authenticated') {
            fetchEmployees();
        }
    }, [authStatus, fetchEmployees]);

    // Get unique departments for filter
    const departments = useMemo(() => {
        const depts = new Set<string>();
        employees.forEach((emp) => {
            if (emp.department) depts.add(emp.department);
        });
        return Array.from(depts).sort();
    }, [employees]);

    // Filter employees
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            // Search filter
            const searchMatch =
                emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (emp.department?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (emp.designation?.toLowerCase() || '').includes(searchQuery.toLowerCase());

            // Status filter
            const statusMatch = statusFilter === 'all' || emp.status === statusFilter;

            // Department filter
            const deptMatch = departmentFilter === 'all' || emp.department === departmentFilter;

            return searchMatch && statusMatch && deptMatch;
        });
    }, [employees, searchQuery, statusFilter, departmentFilter]);

    // Handle edit save
    const handleEditSave = async (data: Partial<Employee>) => {
        if (!selectedEmployee) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update employee');
            }

            toast.success('Employee updated successfully');
            setIsEditModalOpen(false);
            setSelectedEmployee(null);
            fetchEmployees();
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Failed to update employee');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle terminate
    const handleTerminate = async () => {
        if (!selectedEmployee) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to terminate employee');
            }

            toast.success('Employee terminated successfully');
            setIsTerminateModalOpen(false);
            setSelectedEmployee(null);
            fetchEmployees();
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Failed to terminate employee');
        } finally {
            setIsSaving(false);
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setDepartmentFilter('all');
    };

    const hasActiveFilters = searchQuery || statusFilter !== 'all' || departmentFilter !== 'all';

    // Loading state
    if (authStatus === 'loading') {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-dough-brown-500" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="bg-red-50 text-red-600 p-6 rounded-lg border border-red-200 max-w-md text-center">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg">Access Denied</h3>
                    <p className="mt-2 text-sm">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={fetchEmployees}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
                    <p className="text-gray-500 mt-1">
                        Manage employee records, roles, and system access
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchEmployees}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <AddEmployeeDialog onSuccess={fetchEmployees} />
                </div>
            </div>

            {/* Stats Summary */}
            <StatsSummary employees={employees} />

            {/* Filters */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Filter className="h-5 w-5 text-gray-500" />
                            Filters
                        </CardTitle>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                                <X className="h-4 w-4 mr-1" />
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by name, email, ID, department..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="on_leave">On Leave</SelectItem>
                                    <SelectItem value="terminated">Terminated</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Employees Table */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                        Employees ({filteredEmployees.length}
                        {hasActiveFilters && ` of ${employees.length}`})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-dough-brown-500" />
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No employees found</p>
                            <p className="text-gray-400 text-sm mt-1">
                                {hasActiveFilters
                                    ? 'Try adjusting your filters'
                                    : 'Add your first employee to get started'}
                            </p>
                            {hasActiveFilters && (
                                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="font-semibold text-gray-700">Employee</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Department</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Designation</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Join Date</TableHead>
                                        <TableHead className="font-semibold text-gray-700">Account</TableHead>
                                        <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEmployees.map((employee) => (
                                        <TableRow key={employee.id} className="hover:bg-gray-50 group">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-dough-brown-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-semibold text-dough-brown-600">
                                                            {employee.firstName[0]}
                                                            {employee.lastName[0]}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">
                                                            {employee.firstName} {employee.lastName}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {employee.email}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            ID: {employee.employeeId}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-700">
                                                {employee.department || (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-gray-700">
                                                {employee.designation || (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(employee.status)}</TableCell>
                                            <TableCell className="text-gray-600 text-sm">
                                                {formatDate(employee.joinDate)}
                                            </TableCell>
                                            <TableCell>
                                                {employee.user ? (
                                                    <div className="space-y-1">
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                employee.user.isActive
                                                                    ? 'text-green-600 border-green-200'
                                                                    : 'text-red-600 border-red-200'
                                                            }
                                                        >
                                                            {employee.user.isActive ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        {employee.user.userRoles?.[0] && (
                                                            <p className="text-xs text-gray-500">
                                                                {employee.user.userRoles[0].role.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No account</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        title="View Details"
                                                        onClick={() => {
                                                            setSelectedEmployee(employee);
                                                            setIsDetailModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        title="Edit"
                                                        onClick={() => {
                                                            setSelectedEmployee(employee);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                    {employee.status !== 'terminated' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            title="Terminate"
                                                            onClick={() => {
                                                                setSelectedEmployee(employee);
                                                                setIsTerminateModalOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <EmployeeDetailModal
                employee={selectedEmployee}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedEmployee(null);
                }}
                onEdit={(emp) => {
                    setIsDetailModalOpen(false);
                    setSelectedEmployee(emp);
                    setIsEditModalOpen(true);
                }}
                onRefresh={fetchEmployees}
            />

            <EditEmployeeModal
                employee={selectedEmployee}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedEmployee(null);
                }}
                onSave={handleEditSave}
                isLoading={isSaving}
            />

            <TerminateConfirmModal
                employee={selectedEmployee}
                isOpen={isTerminateModalOpen}
                onClose={() => {
                    setIsTerminateModalOpen(false);
                    setSelectedEmployee(null);
                }}
                onConfirm={handleTerminate}
                isLoading={isSaving}
            />
        </div>
    );
}
