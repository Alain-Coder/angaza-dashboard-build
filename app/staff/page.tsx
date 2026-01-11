'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { Users, Eye, Edit, CheckCircle, XCircle, Save, X, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, onSnapshot, getDocs, updateDoc, doc, Timestamp, getDoc, addDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MedicalInfo {
  existingConditions?: string
  allergies?: string
  medicalNotes?: string
}

interface NextOfKin {
  fullName: string
  relationship: string
  phoneNumber: string
  email?: string
  address?: string
}

interface EmergencyContact {
  fullName: string
  relationship: string
  phoneNumber: string
}

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  department?: string
  position?: string
  status: string
  phoneNumber?: string
  address?: string
  dateOfBirth?: Date
  hireDate?: Date
  medicalInfo?: MedicalInfo
  nextOfKin?: NextOfKin
  emergencyContact?: EmergencyContact
  isSystemUser?: boolean // New field to distinguish system users from non-system staff
}

interface Department {
  id: string
  name: string
  code: string
  description?: string
}

// Add Program interface
interface Program {
  id: string
  name: string
  description: string
  projectId: string
  projectName: string
  budget: number
  startDate: Date
  endDate: Date
  progress: number
  staffCount: number
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'at-risk'
  createdAt: Date
  updatedAt: Date
  assignedUsers?: string[]
}

interface AttendanceRecord {
  id: string
  userId: string
  userName: string
  userRole: string
  checkInTime: Date
  checkOutTime: Date | null
  status: string
  currentStatus: string
  breaks: {
    type: string
    startTime: Date
    endTime: Date | null
  }[]
  totalTime: number // in minutes
  overtime: number // in minutes
  createdAt: Date
  programId?: string
  timesheetApproved?: boolean
  timesheetApprovedBy?: string
  timesheetApprovedAt?: Date
}

interface TimesheetRecord {
  id: string
  userId: string
  userName: string
  userRole: string
  date: Date
  hoursWorked: number
  overtime: number
  programId?: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: Date
  checkInTime: Date
  checkOutTime: Date | null
  breaks?: {
    type: string
    startTime: Date
    endTime: Date | null
    duration: number // in minutes
  }[]
}

// Type guard for Firebase Timestamp
const isTimestamp = (obj: any): obj is { toDate: () => Date } => {
  return obj && typeof obj === 'object' && 'toDate' in obj && typeof (obj as any).toDate === 'function';
};

// Helper function to convert decimal hours to hours and minutes format
const formatHoursWithMinutes = (decimalHours: number): string => {
  // Handle negative values
  if (decimalHours < 0) {
    return "0.0 hrs";
  }
  
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0 && minutes > 0) {
    return decimalHours.toFixed(1) + " hrs (" + minutes + " min)";
  } else if (minutes === 0) {
    return decimalHours.toFixed(1) + " hrs";
  } else {
    return decimalHours.toFixed(1) + " hrs (" + hours + "h " + minutes + "m)";
  }
};

// Helper function to determine if a timesheet record has a late arrival
const isLateArrival = (record: TimesheetRecord) => {
  const checkInHour = record.checkInTime.getHours();
  const checkInMinute = record.checkInTime.getMinutes();
  // Late arrival is after 8:00 AM
  return (checkInHour > 8) || (checkInHour === 8 && checkInMinute > 5);
};

// Helper function to get program name by ID
const getProgramName = (programId: string | undefined, programs: Program[]) => {
  if (!programId || programId === 'general-work') return 'General Work'
  const program = programs.find(p => p.id === programId)
  return program ? program.name : 'Unknown Program'
};

export default function StaffPage() {
  const { user } = useAuth()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [timesheetRecords, setTimesheetRecords] = useState<TimesheetRecord[]>([])
  const [programs, setPrograms] = useState<Program[]>([]) // Add programs state
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('timesheets') // Default to timesheets for all users
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null)
  const [viewingStaffTimesheets, setViewingStaffTimesheets] = useState<TimesheetRecord[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false) // New state for create dialog
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    status: 'Active',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    hireDate: '',
    existingConditions: '',
    allergies: '',
    medicalNotes: '',
    nextOfKinFullName: '',
    nextOfKinRelationship: '',
    nextOfKinPhoneNumber: '',
    nextOfKinEmail: '',
    nextOfKinAddress: '',
    emergencyContactFullName: '',
    emergencyContactRelationship: '',
    emergencyContactPhoneNumber: ''
  })
  
  // New state for create form
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    status: 'Active',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    hireDate: '',
    role: 'employee', // Default role for non-system users
    existingConditions: '',
    allergies: '',
    medicalNotes: '',
    nextOfKinFullName: '',
    nextOfKinRelationship: '',
    nextOfKinPhoneNumber: '',
    nextOfKinEmail: '',
    nextOfKinAddress: '',
    emergencyContactFullName: '',
    emergencyContactRelationship: '',
    emergencyContactPhoneNumber: ''
  })
  
  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTimesheetPage, setCurrentTimesheetPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Date filtering state for timesheets
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Staff member search for timesheets
  const [timesheetStaffSearch, setTimesheetStaffSearch] = useState('')
  const [viewingTimesheet, setViewingTimesheet] = useState<TimesheetRecord | null>(null)
  const [isViewTimesheetDialogOpen, setIsViewTimesheetDialogOpen] = useState(false)

  // Check user role for access control
  const getUserRoleName = () => {
    if (!user?.role) return "User"
    
    const roleMap: Record<string, string> = {
      "system admin": "System Admin",
      "board": "Board Member",
      "executive director": "Executive Director",
      "finance lead": "Finance Lead",
      "programs lead": "Programs Lead",
      "project officer": "Project Officer",
      "office assistant": "Office Assistant",
    }
    
    return roleMap[user.role] || "User"
  }

  const roleName = getUserRoleName()

  // Check if user has access to this page
  const hasAccess = () => {
    // Finance Lead, Executive Directors, and Board Members have access
    // Other roles have access as defined in the original implementation
    if (roleName === "Finance Lead" || roleName === "Executive Director" || roleName === "Board Member") {
      return true
    }
    
    const allowedRoles = [
      "Finance Lead",
      "Programs Lead",
      "Project Officer",
      "Office Assistant",
      "Admin Officer",
      "Community Outreach Officer",
      "Monitoring & Evaluation Lead"
    ]
    return allowedRoles.includes(roleName)
  }

  // Check if user can approve timesheets
  const canApproveTimesheets = () => {
    return roleName === "Executive Director" || roleName === "Finance Lead"
  }

  // Check if user can only view (Board Member)
  const isViewOnly = () => {
    return roleName === "Board Member"
  }

  // Check if user can edit staff information
  const canEditStaff = () => {
    return roleName === "System Admin" || roleName === "Executive Director"|| roleName === "Finance Lead"
  }

  // Check if user can see attendance analytics
  const canSeeAttendanceAnalytics = () => {
    return roleName === "Executive Director" || roleName === "Board Member"
  }

  // Check if user should only see timesheets (non-admin users)
  const shouldOnlySeeTimesheets = () => {
    // Non-admin users (not Board Member, Executive Director, or Finance Lead) should only see timesheets
    return !(roleName === "Board Member" || roleName === "Executive Director" || roleName === "Finance Lead")
  }

  // Check if user can see staff members tab
  const canSeeStaffMembersTab = () => {
    // Only System Admin, Executive Director, and Finance Lead can see staff members tab
    return roleName === "System Admin" || roleName === "Executive Director" || roleName === "Finance Lead"
  }

  // Check if user can create staff members
  const canCreateStaff = () => {
    return roleName === "System Admin" || roleName === "Executive Director" || roleName === "Finance Lead"
  }

  // Helper function to determine if a timesheet record has a late arrival
  const isLateArrival = (record: TimesheetRecord) => {
    const checkInHour = record.checkInTime.getHours();
    const checkInMinute = record.checkInTime.getMinutes();
    // Late arrival is after 8:00 AM
    return (checkInHour > 8) || (checkInHour === 8 && checkInMinute > 5);
  };

  // Filter staff members based on search term
  const filteredStaffMembers = staffMembers.filter(staff => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      staff.name.toLowerCase().includes(term) ||
      staff.email.toLowerCase().includes(term) ||
      staff.role.toLowerCase().includes(term) ||
      (staff.department && staff.department.toLowerCase().includes(term)) ||
      (staff.position && staff.position.toLowerCase().includes(term))
    )
  })

  // Filter timesheet records based on user role, date range, and staff search
  const filteredTimesheetRecords = timesheetRecords.filter(record => {
    // Filter by user role
    const roleFilter = shouldOnlySeeTimesheets() ? record.userId === user?.uid : true
    
    // Filter by date range
    let dateFilter = true
    if (startDate && endDate) {
      const recordDate = new Date(record.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Include the entire end date
      dateFilter = recordDate >= start && recordDate <= end
    } else if (startDate) {
      const recordDate = new Date(record.date)
      const start = new Date(startDate)
      dateFilter = recordDate >= start
    } else if (endDate) {
      const recordDate = new Date(record.date)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Include the entire end date
      dateFilter = recordDate <= end
    }
    
    // Filter by staff member search (only for admins who can see all timesheets)
    let staffFilter = true
    if (!shouldOnlySeeTimesheets() && timesheetStaffSearch) {
      const term = timesheetStaffSearch.toLowerCase()
      staffFilter = record.userName.toLowerCase().includes(term)
    }
    
    return roleFilter && dateFilter && staffFilter
  })

  // Pagination logic for staff members
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentStaffMembers = filteredStaffMembers.slice(startIndex, endIndex)

  // Pagination logic for timesheets
  const timesheetStartIndex = (currentTimesheetPage - 1) * itemsPerPage
  const timesheetEndIndex = timesheetStartIndex + itemsPerPage
  const currentTimesheetRecords = filteredTimesheetRecords.slice(timesheetStartIndex, timesheetEndIndex)

  // Fetch departments
  useEffect(() => {
    if (!user?.uid || !hasAccess()) return

    const fetchDepartments = async () => {
      try {
        const q = query(collection(db, 'departments'), orderBy('name'))
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const departmentsData: Department[] = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            departmentsData.push({
              id: doc.id,
              name: data.name,
              code: data.code,
              description: data.description
            })
          })
          setDepartments(departmentsData)
        })
        
        return () => unsubscribe()
      } catch (error) {
        console.error('Error fetching departments:', error)
      }
    }

    fetchDepartments()
  }, [user?.uid])

  // Fetch programs
  useEffect(() => {
    if (!user?.uid || !hasAccess()) return

    const fetchPrograms = async () => {
      try {
        const q = query(
          collection(db, 'programs'),
          orderBy('createdAt', 'desc')
        )
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const programsData: Program[] = []
          
          snapshot.forEach((doc) => {
            const data = doc.data()
            programsData.push({
              id: doc.id,
              ...data,
              startDate: data.startDate?.toDate() || new Date(),
              endDate: data.endDate?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              assignedUsers: data.assignedUsers || []
            } as Program)
          })
          
          setPrograms(programsData)
        })
        
        return () => unsubscribe()
      } catch (error) {
        console.error('Error fetching programs:', error)
      }
    }

    fetchPrograms()
  }, [user?.uid])

  // Fetch staff members from both collections
  useEffect(() => {
    if (!user?.uid || !hasAccess() || !canSeeStaffMembersTab()) return

    const fetchStaffMembers = async () => {
      try {
        setLoading(true);
        
        // Fetch system users (from users collection)
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        const staffData: StaffMember[] = [];
        
        // Process system users
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          // Exclude system admins from staff list
          if (data.role && data.role !== 'system admin') {
            staffData.push({
              id: doc.id,
              name: data.name || data.displayName || 'Unknown User',
              email: data.email || '',
              role: data.role || 'No Role',
              department: data.department || '',
              position: data.position || '',
              status: data.status || 'Active',
              phoneNumber: data.phoneNumber || '',
              address: data.address || '',
              dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate() : undefined,
              hireDate: data.hireDate?.toDate ? data.hireDate.toDate() : undefined,
              medicalInfo: data.medicalInfo || undefined,
              nextOfKin: data.nextOfKin || undefined,
              emergencyContact: data.emergencyContact || undefined,
              isSystemUser: true // Mark as system user
            });
          }
        });
        
        // Fetch non-system staff (from staff collection)
        const staffQuery = query(collection(db, 'staff'));
        const staffSnapshot = await getDocs(staffQuery);
        
        // Process non-system staff
        staffSnapshot.forEach((doc) => {
          const data = doc.data();
          staffData.push({
            id: doc.id,
            name: data.name || 'Unknown Staff',
            email: data.email || '',
            role: data.role || 'No Role',
            department: data.department || '',
            position: data.position || '',
            status: data.status || 'Active',
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
            dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate() : undefined,
            hireDate: data.hireDate?.toDate ? data.hireDate.toDate() : undefined,
            medicalInfo: data.medicalInfo || undefined,
            nextOfKin: data.nextOfKin || undefined,
            emergencyContact: data.emergencyContact || undefined,
            isSystemUser: false // Mark as non-system staff
          });
        });
        
        setStaffMembers(staffData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching staff members:', error);
        setLoading(false);
      }
    };

    fetchStaffMembers();
  }, [user?.uid]);

  // Fetch attendance records for timesheets
  useEffect(() => {
    if (!user?.uid || !hasAccess()) return

    console.log('Fetching attendance records...');

    const fetchAttendanceRecords = async () => {
      try {
        // For Executive Director and System Admin, show all records
        // For Board Members, show all records
        // For others, show only their own records
        let q
        if (roleName === "Executive Director" || roleName === "Finance Lead" || roleName === "Board Member") {
          q = query(collection(db, 'attendance'), orderBy('createdAt', 'desc'))
        } else {
          q = query(
            collection(db, 'attendance'), 
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          )
        }
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const recordsData: AttendanceRecord[] = []
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data()
            const record: AttendanceRecord = {
              id: docSnapshot.id,
              userId: data.userId,
              userName: data.userName,
              userRole: data.userRole,
              checkInTime: data.checkInTime?.toDate() || new Date(),
              checkOutTime: data.checkOutTime?.toDate() || null,
              status: data.status,
              currentStatus: data.currentStatus,
              breaks: data.breaks || [],
              totalTime: data.totalTime || 0,
              overtime: data.overtime || 0,
              createdAt: data.createdAt?.toDate() || new Date(),
              programId: data.programId,
              timesheetApproved: data.timesheetApproved,
              timesheetApprovedBy: data.timesheetApprovedBy,
              timesheetApprovedAt: data.timesheetApprovedAt?.toDate()
            }
            
            // Automatically reject timesheets that checkout after midnight
            if (record.checkOutTime && record.timesheetApproved !== false) {
              const checkInDate = new Date(record.checkInTime);
              const checkOutDate = new Date(record.checkOutTime);
              
              // More precise date comparison - check if dates are truly different
              const checkInDateString = checkInDate.toDateString();
              const checkOutDateString = checkOutDate.toDateString();
              
              // Check if checkout date is different from checkin date (crosses midnight)
              if (checkInDateString !== checkOutDateString) {
                // Additional checks to prevent false positives:
                
                // 1. Calculate total time worked
                const timeDifferenceInMinutes = Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60));
                
                // 2. Only auto-reject if:
                // - The total time is significant (more than 1 hour)
                // - The total time is not extremely long (less than 16 hours to prevent false positives)
                if (timeDifferenceInMinutes > 60 && timeDifferenceInMinutes < 960) {
                  // Update the database to reject this timesheet
                  updateDoc(doc(db, 'attendance', docSnapshot.id), {
                    timesheetApproved: false,
                    timesheetApprovedBy: 'System (Auto-rejected - Checkout after midnight)',
                    timesheetApprovedAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                  }).catch(error => {
                    console.error('Error auto-rejecting timesheet:', error);
                  });
                }
              }
            }

            recordsData.push(record)
          })
          setAttendanceRecords(recordsData)
        })
        
        return () => unsubscribe()
      } catch (error) {
        console.error('Error fetching attendance records:', error)
      }
    }

    fetchAttendanceRecords()
  }, [user?.uid, roleName])

  // Convert attendance records to timesheet records
  useEffect(() => {
    const timesheetData: TimesheetRecord[] = attendanceRecords
      .filter(record => record.checkOutTime !== null) // Only completed shifts
      .map(record => {
        // Determine status: rejected, approved, or pending
        let status: 'pending' | 'approved' | 'rejected' = 'pending';
        
        // If explicitly rejected
        if (record.timesheetApproved === false) {
          status = 'rejected';
        } 
        // If approved
        else if (record.timesheetApproved === true) {
          status = 'approved';
        }
        // If neither approved nor rejected (undefined), it's pending by default
        
        // Process breaks data to include duration
        const breaksData = (record.breaks || []).map(breakItem => {
          let duration = 0;
          
          // Safely convert start time
          let startTime: Date | null = null;
          if (breakItem.startTime) {
            try {
              if (isTimestamp(breakItem.startTime)) {
                startTime = (breakItem.startTime as { toDate: () => Date }).toDate();
              } else if (typeof breakItem.startTime === 'string') {
                startTime = new Date(breakItem.startTime);
              } else if (breakItem.startTime instanceof Date) {
                startTime = breakItem.startTime;
              }
            } catch (e) {
              console.warn('Invalid start time for break:', breakItem.startTime);
            }
          }
          
          // Safely convert end time
          let endTime: Date | null = null;
          if (breakItem.endTime) {
            try {
              if (isTimestamp(breakItem.endTime)) {
                endTime = (breakItem.endTime as { toDate: () => Date }).toDate();
              } else if (typeof breakItem.endTime === 'string') {
                endTime = new Date(breakItem.endTime);
              } else if (breakItem.endTime instanceof Date) {
                endTime = breakItem.endTime;
              }
            } catch (e) {
              console.warn('Invalid end time for break:', breakItem.endTime);
            }
          }
          
          // Calculate duration only if both times are valid
          if (startTime && endTime) {
            duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // Duration in minutes
          }
          
          return {
            type: breakItem.type || 'break',
            startTime: startTime || new Date(),
            endTime: endTime,
            duration: duration
          };
        });
        
        return {
          id: record.id,
          userId: record.userId,
          userName: record.userName,
          userRole: record.userRole,
          date: record.checkInTime,
          hoursWorked: record.totalTime / 60, // Convert minutes to hours
          overtime: record.overtime / 60, // Convert minutes to hours
          programId: record.programId,
          status: status,
          approvedBy: record.timesheetApprovedBy,
          approvedAt: record.timesheetApprovedAt,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          breaks: breaksData
        };
      })
    
    setTimesheetRecords(timesheetData)
  }, [attendanceRecords])

  // Open edit dialog
  const openEditDialog = (staff: StaffMember) => {
    if (!canEditStaff()) {
      toast.error("You don't have permission to edit staff information")
      return
    }
    
    setEditingStaff(staff)
    setEditForm({
      name: staff.name,
      email: staff.email,
      department: staff.department || '',
      position: staff.position || '',
      status: staff.status || 'Active',
      phoneNumber: staff.phoneNumber || '',
      address: staff.address || '',
      dateOfBirth: staff.dateOfBirth ? format(staff.dateOfBirth, 'yyyy-MM-dd') : '',
      hireDate: staff.hireDate ? format(staff.hireDate, 'yyyy-MM-dd') : '',
      existingConditions: staff.medicalInfo?.existingConditions || '',
      allergies: staff.medicalInfo?.allergies || '',
      medicalNotes: staff.medicalInfo?.medicalNotes || '',
      nextOfKinFullName: staff.nextOfKin?.fullName || '',
      nextOfKinRelationship: staff.nextOfKin?.relationship || '',
      nextOfKinPhoneNumber: staff.nextOfKin?.phoneNumber || '',
      nextOfKinEmail: staff.nextOfKin?.email || '',
      nextOfKinAddress: staff.nextOfKin?.address || '',
      emergencyContactFullName: staff.emergencyContact?.fullName || '',
      emergencyContactRelationship: staff.emergencyContact?.relationship || '',
      emergencyContactPhoneNumber: staff.emergencyContact?.phoneNumber || ''
    })
    setIsEditDialogOpen(true)
  }

  // Close edit dialog
  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingStaff(null)
  }

  // Save edited staff information
  const saveEditedStaff = async () => {
    if (!editingStaff) return

    try {
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        department: editForm.department,
        position: editForm.position,
        status: editForm.status,
        phoneNumber: editForm.phoneNumber,
        address: editForm.address,
        updatedAt: Timestamp.now()
      }

      // Add date fields if they exist
      if (editForm.dateOfBirth) {
        updateData.dateOfBirth = Timestamp.fromDate(new Date(editForm.dateOfBirth))
      }
      
      if (editForm.hireDate) {
        updateData.hireDate = Timestamp.fromDate(new Date(editForm.hireDate))
      }
      
      // Add medical information if any field is filled
      if (editForm.existingConditions || editForm.allergies || editForm.medicalNotes) {
        updateData.medicalInfo = {
          existingConditions: editForm.existingConditions || '',
          allergies: editForm.allergies || '',
          medicalNotes: editForm.medicalNotes || ''
        };
      }
      
      // Add next of kin information if any field is filled
      if (editForm.nextOfKinFullName || editForm.nextOfKinRelationship || editForm.nextOfKinPhoneNumber) {
        updateData.nextOfKin = {
          fullName: editForm.nextOfKinFullName || '',
          relationship: editForm.nextOfKinRelationship || '',
          phoneNumber: editForm.nextOfKinPhoneNumber || '',
          email: editForm.nextOfKinEmail || '',
          address: editForm.nextOfKinAddress || ''
        };
      }
      
      // Add emergency contact information if any field is filled
      if (editForm.emergencyContactFullName || editForm.emergencyContactRelationship || editForm.emergencyContactPhoneNumber) {
        updateData.emergencyContact = {
          fullName: editForm.emergencyContactFullName || '',
          relationship: editForm.emergencyContactRelationship || '',
          phoneNumber: editForm.emergencyContactPhoneNumber || ''
        };
      }

      await updateDoc(doc(db, 'users', editingStaff.id), updateData)
      
      // Log audit event for system user staff edits
      if (editingStaff.isSystemUser && user) {
        const { logAuditEvent } = useAuth();
        await logAuditEvent(
          'Staff Updated',
          `Updated staff member: ${editForm.name}`,
          user?.uid,
          user?.displayName || user?.email || 'Unknown User'
        );
      }
      
      toast.success("Staff information updated successfully", {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      closeEditDialog()
    } catch (error) {
      console.error('Error updating staff information:', error)
      toast.error("Failed to update staff information", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  // Open view dialog
  const openViewDialog = async (staff: StaffMember) => {
    setViewingStaff(staff)
    
    // Fetch timesheets for this specific staff member
    try {
      const timesheets = timesheetRecords.filter(record => record.userId === staff.id)
      setViewingStaffTimesheets(timesheets)
    } catch (error) {
      console.error('Error fetching staff timesheets:', error)
      setViewingStaffTimesheets([])
    }
    
    setIsViewDialogOpen(true)
  }

  // Close view dialog
  const closeViewDialog = () => {
    setIsViewDialogOpen(false)
    setViewingStaff(null)
    setViewingStaffTimesheets([])
  }

  // Open create dialog
  const openCreateDialog = () => {
    if (!canCreateStaff()) {
      toast.error("You don't have permission to create staff members")
      return
    }
    
    // Reset form
    setCreateForm({
      name: '',
      email: '',
      department: '',
      position: '',
      status: 'Active',
      phoneNumber: '',
      address: '',
      dateOfBirth: '',
      hireDate: '',
      role: 'employee',
      existingConditions: '',
      allergies: '',
      medicalNotes: '',
      nextOfKinFullName: '',
      nextOfKinRelationship: '',
      nextOfKinPhoneNumber: '',
      nextOfKinEmail: '',
      nextOfKinAddress: '',
      emergencyContactFullName: '',
      emergencyContactRelationship: '',
      emergencyContactPhoneNumber: ''
    })
    setIsCreateDialogOpen(true)
  }

  // Close create dialog
  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false)
  }

  // Create new staff member (non-system user)
  const createNewStaff = async () => {
    try {
      // Validate required fields
      if (!createForm.name) {
        toast.error("Name is required")
        return
      }

      const staffData: any = {
        name: createForm.name,
        email: createForm.email,
        department: createForm.department,
        position: createForm.position,
        status: createForm.status,
        phoneNumber: createForm.phoneNumber,
        address: createForm.address,
        isSystemUser: false, // Mark as non-system user
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Add date fields if they exist
      if (createForm.dateOfBirth) {
        staffData.dateOfBirth = Timestamp.fromDate(new Date(createForm.dateOfBirth));
      }
      
      if (createForm.hireDate) {
        staffData.hireDate = Timestamp.fromDate(new Date(createForm.hireDate));
      }
      
      // Add medical information if any field is filled
      if (createForm.existingConditions || createForm.allergies || createForm.medicalNotes) {
        staffData.medicalInfo = {
          existingConditions: createForm.existingConditions || '',
          allergies: createForm.allergies || '',
          medicalNotes: createForm.medicalNotes || ''
        };
      }
      
      // Add next of kin information if any field is filled
      if (createForm.nextOfKinFullName || createForm.nextOfKinRelationship || createForm.nextOfKinPhoneNumber) {
        staffData.nextOfKin = {
          fullName: createForm.nextOfKinFullName || '',
          relationship: createForm.nextOfKinRelationship || '',
          phoneNumber: createForm.nextOfKinPhoneNumber || '',
          email: createForm.nextOfKinEmail || '',
          address: createForm.nextOfKinAddress || ''
        };
      }
      
      // Add emergency contact information if any field is filled
      if (createForm.emergencyContactFullName || createForm.emergencyContactRelationship || createForm.emergencyContactPhoneNumber) {
        staffData.emergencyContact = {
          fullName: createForm.emergencyContactFullName || '',
          relationship: createForm.emergencyContactRelationship || '',
          phoneNumber: createForm.emergencyContactPhoneNumber || ''
        };
      }

      // Add to staff collection for non-system users
      await addDoc(collection(db, 'staff'), staffData);
      
      toast.success("Staff member created successfully", {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      });
      closeCreateDialog();
    } catch (error) {
      console.error('Error creating staff member:', error);
      toast.error("Failed to create staff member", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
    }
  }

  // Approve timesheet
  const approveTimesheet = async (timesheetId: string) => {
    if (!canApproveTimesheets()) {
      toast.error("You don't have permission to approve timesheets", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      await updateDoc(doc(db, 'attendance', timesheetId), {
        timesheetApproved: true,
        timesheetApprovedBy: user?.displayName || user?.email || 'Unknown User',
        timesheetApprovedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      toast.success("Timesheet approved successfully", {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error approving timesheet:', error)
      toast.error("Failed to approve timesheet", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  // Reject timesheet
  const rejectTimesheet = async (timesheetId: string) => {
    if (!canApproveTimesheets()) {
      toast.error("You don't have permission to reject timesheets", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      await updateDoc(doc(db, 'attendance', timesheetId), {
        timesheetApproved: false,
        timesheetApprovedBy: user?.displayName || user?.email || 'Unknown User',
        timesheetApprovedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      toast.success("Timesheet rejected", {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error rejecting timesheet:', error)
      toast.error("Failed to reject timesheet", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  // Update timesheet approval status (for correcting mistakes)
  const updateTimesheetStatus = async (timesheetId: string, newStatus: boolean | null, statusText: string) => {
    if (!canApproveTimesheets()) {
      toast.error("You don't have permission to update timesheet status", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      const updateData: any = {
        updatedAt: Timestamp.now()
      };

      // Set the approval status based on the new status
      if (newStatus === true) {
        // Approve
        updateData.timesheetApproved = true;
        updateData.timesheetApprovedBy = user?.displayName || user?.email || 'Unknown User';
        updateData.timesheetApprovedAt = Timestamp.now();
      } else if (newStatus === false) {
        // Reject
        updateData.timesheetApproved = false;
        updateData.timesheetApprovedBy = user?.displayName || user?.email || 'Unknown User';
        updateData.timesheetApprovedAt = Timestamp.now();
      } else {
        // Reset to pending (null/undefined)
        updateData.timesheetApproved = null;
        updateData.timesheetApprovedBy = null;
        updateData.timesheetApprovedAt = null;
      }

      await updateDoc(doc(db, 'attendance', timesheetId), updateData);
      
      toast.success(`Timesheet status updated to ${statusText}`, {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      });
    } catch (error) {
      console.error('Error updating timesheet status:', error);
      toast.error("Failed to update timesheet status", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
    }
  };

  // Open view timesheet dialog
  const openViewTimesheetDialog = (timesheet: TimesheetRecord) => {
    setViewingTimesheet(timesheet)
    setIsViewTimesheetDialogOpen(true)
  }

  // Close view timesheet dialog
  const closeViewTimesheetDialog = () => {
    setIsViewTimesheetDialogOpen(false)
    setViewingTimesheet(null)
  }

  // Reset date filters
  const resetDateFilters = () => {
    setStartDate('')
    setEndDate('')
  }

  // Reset staff search filter
  const resetStaffSearch = () => {
    setTimesheetStaffSearch('')
  }

  // State for the update status dialog
  const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] = useState(false);
  const [timesheetToUpdate, setTimesheetToUpdate] = useState<TimesheetRecord | null>(null);
  const [newStatus, setNewStatus] = useState<string>('pending');

  // Open update status dialog
  const openUpdateStatusDialog = (timesheet: TimesheetRecord) => {
    setTimesheetToUpdate(timesheet);
    // Set the current status as the default selection
    if (timesheet.status === 'approved') {
      setNewStatus('approved');
    } else if (timesheet.status === 'rejected') {
      setNewStatus('rejected');
    } else {
      setNewStatus('pending');
    }
    setIsUpdateStatusDialogOpen(true);
  };

  // Close update status dialog
  const closeUpdateStatusDialog = () => {
    setIsUpdateStatusDialogOpen(false);
    setTimesheetToUpdate(null);
    setNewStatus('pending');
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!timesheetToUpdate) return;

    let statusValue: boolean | null = null;
    let statusText = 'pending';
    
    if (newStatus === 'approved') {
      statusValue = true;
      statusText = 'approved';
    } else if (newStatus === 'rejected') {
      statusValue = false;
      statusText = 'rejected';
    }

    await updateTimesheetStatus(timesheetToUpdate.id, statusValue, statusText);
    closeUpdateStatusDialog();
  };

  if (!hasAccess()) {
    return (
      <ProtectedRoute>
        <RoleBasedLayout>
          <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="text-center p-8 max-w-md">
              <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
              <p className="text-muted-foreground mb-6">
                You don't have permission to view the staff management page.
              </p>
            </div>
          </div>
        </RoleBasedLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {shouldOnlySeeTimesheets() ? "My Timesheets" : "Staff Management"}
              </h1>
              <p className="text-muted-foreground">
                {shouldOnlySeeTimesheets() 
                  ? "View your timesheets" 
                  : "Manage staff members and timesheets"}
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/20 border-border">
              {canSeeStaffMembersTab() && (
                <TabsTrigger 
                  value="staff" 
                  className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
                >
                  Staff Members
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="timesheets" 
                className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
              >
                {shouldOnlySeeTimesheets() ? "My Timesheets" : "Timesheets"}
              </TabsTrigger>
            </TabsList>

            {canSeeStaffMembersTab() && (
              <TabsContent value="staff" className="space-y-4 pt-4">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search staff by name, email, role..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="max-w-sm"
                    />
                  </div>
                  {canCreateStaff() && (
                    <Button onClick={openCreateDialog} className="flex items-center cursor-pointer">
                      <Plus className="w-4 h-4 mr-2 " />
                      Add Staff Member
                    </Button>
                  )}
                </div>

                {/* Staff Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStaffMembers.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium text-foreground">{staff.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {staff.role.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {/* Show department name instead of ID */}
                          {departments.find(d => d.id === staff.department)?.name || staff.department || 'No Department'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {staff.position || 'Not assigned'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              staff.status === 'Active' 
                                ? "bg-green-100 text-green-800 font-medium" 
                                : "bg-red-100 text-red-800 font-medium"
                            }
                          >
                            {staff.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              staff.isSystemUser 
                                ? "border-blue-500 text-blue-500" 
                                : "border-gray-500 text-gray-500"
                            }
                          >
                            {staff.isSystemUser ? "System User" : "Staff Only"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={() => openViewDialog(staff)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(canEditStaff()) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => openEditDialog(staff)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredStaffMembers.length)} of {filteredStaffMembers.length} staff members
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="cursor-pointer"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage * itemsPerPage >= filteredStaffMembers.length}
                      className="cursor-pointer"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="timesheets" className="space-y-4 pt-4">
              {/* Filters for Timesheets */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="start-date" className="text-sm font-medium">From Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-sm font-medium">To Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                {!shouldOnlySeeTimesheets() && (
                  <div>
                    <Label htmlFor="staff-search" className="text-sm font-medium">Staff Member</Label>
                    <div className="relative">
                      <Input
                        id="staff-search"
                        placeholder="Search staff..."
                        value={timesheetStaffSearch}
                        onChange={(e) => setTimesheetStaffSearch(e.target.value)}
                        className="w-full pr-8"
                      />
                      {timesheetStaffSearch && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-2 text-muted-foreground hover:text-foreground"
                          onClick={resetStaffSearch}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={resetDateFilters}
                    className="w-full"
                  >
                    Reset Dates
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-foreground">
                  {shouldOnlySeeTimesheets() ? "My Timesheet Records" : "Timesheet Approvals"}
                </h4>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-muted-foreground">
                    {filteredTimesheetRecords.filter(t => t.status === 'pending').length} Pending
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {filteredTimesheetRecords.filter(isLateArrival).length} Late Arrivals
                  </Badge>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    {!shouldOnlySeeTimesheets() && <TableHead>Staff Member</TableHead>}
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTimesheetRecords.map((timesheet) => (
                    <TableRow key={timesheet.id}>
                      {!shouldOnlySeeTimesheets() && (
                        <TableCell className="font-medium text-foreground">{timesheet.userName}</TableCell>
                      )}
                      <TableCell className={isLateArrival(timesheet) ? "font-medium text-red-600" : "text-muted-foreground"}>
                        {format(timesheet.checkInTime, 'MMM dd, yyyy HH:mm')}
                        {isLateArrival(timesheet) && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                            Late
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {timesheet.checkOutTime ? format(timesheet.checkOutTime, 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatHoursWithMinutes(timesheet.hoursWorked)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatHoursWithMinutes(timesheet.overtime)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getProgramName(timesheet.programId, programs)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            timesheet.status === 'approved' ? 'default' : 
                            timesheet.status === 'pending' ? 'outline' : 'destructive'
                          }
                        >
                          {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => openViewTimesheetDialog(timesheet)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canApproveTimesheets() && timesheet.status === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700 cursor-pointer"
                                onClick={() => approveTimesheet(timesheet.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 cursor-pointer"
                                onClick={() => rejectTimesheet(timesheet.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {canApproveTimesheets() && timesheet.status !== 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 cursor-pointer"
                              onClick={() => openUpdateStatusDialog(timesheet)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination for Timesheets */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {timesheetStartIndex + 1}-{Math.min(timesheetEndIndex, filteredTimesheetRecords.length)} of {filteredTimesheetRecords.length} timesheet records
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentTimesheetPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentTimesheetPage === 1}
                    className="cursor-pointer"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentTimesheetPage(prev => prev + 1)}
                    disabled={currentTimesheetPage * itemsPerPage >= filteredTimesheetRecords.length}
                    className="cursor-pointer"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Staff Information</DialogTitle>
              <DialogDescription>
                Update staff member details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <div className="col-span-3">
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <div className="col-span-3">
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">
                  Department
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={editForm.department} 
                    onValueChange={(value) => setEditForm({...editForm, department: value})}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="position" className="text-right">
                  Position
                </Label>
                <div className="col-span-3">
                  <Input
                    id="position"
                    value={editForm.position}
                    onChange={(e) => setEditForm({...editForm, position: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phoneNumber" className="text-right">
                  Phone
                </Label>
                <div className="col-span-3">
                  <Input
                    id="phoneNumber"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dateOfBirth" className="text-right">
                  D.O.B
                </Label>
                <div className="col-span-3">
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hireDate" className="text-right">
                  Hire Date
                </Label>
                <div className="col-span-3">
                  <Input
                    id="hireDate"
                    type="date"
                    value={editForm.hireDate}
                    onChange={(e) => setEditForm({...editForm, hireDate: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={editForm.status} 
                    onValueChange={(value) => setEditForm({...editForm, status: value})}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
                      
              {/* Medical Information Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Medical Information</h3>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="existingConditions" className="text-right">
                    Conditions
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="existingConditions"
                      value={editForm.existingConditions}
                      onChange={(e) => setEditForm({...editForm, existingConditions: e.target.value})}
                      className="w-full"
                      placeholder="List any existing medical conditions"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="allergies" className="text-right">
                    Allergies
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="allergies"
                      value={editForm.allergies}
                      onChange={(e) => setEditForm({...editForm, allergies: e.target.value})}
                      className="w-full"
                      placeholder="List any allergies"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="medicalNotes" className="text-right">
                    Notes
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="medicalNotes"
                      value={editForm.medicalNotes}
                      onChange={(e) => setEditForm({...editForm, medicalNotes: e.target.value})}
                      className="w-full"
                      placeholder="Any additional medical notes"
                    />
                  </div>
                </div>
              </div>
                      
              {/* Next of Kin Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Next of Kin</h3>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="nextOfKinFullName" className="text-right">
                    Full Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="nextOfKinFullName"
                      value={editForm.nextOfKinFullName}
                      onChange={(e) => setEditForm({...editForm, nextOfKinFullName: e.target.value})}
                      className="w-full"
                      placeholder="Full name of next of kin"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="nextOfKinRelationship" className="text-right">
                    Relationship
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="nextOfKinRelationship"
                      value={editForm.nextOfKinRelationship}
                      onChange={(e) => setEditForm({...editForm, nextOfKinRelationship: e.target.value})}
                      className="w-full"
                      placeholder="Relationship to staff member"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="nextOfKinPhoneNumber" className="text-right">
                    Phone
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="nextOfKinPhoneNumber"
                      value={editForm.nextOfKinPhoneNumber}
                      onChange={(e) => setEditForm({...editForm, nextOfKinPhoneNumber: e.target.value})}
                      className="w-full"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="nextOfKinEmail" className="text-right">
                    Email
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="nextOfKinEmail"
                      value={editForm.nextOfKinEmail}
                      onChange={(e) => setEditForm({...editForm, nextOfKinEmail: e.target.value})}
                      className="w-full"
                      placeholder="Email (optional)"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nextOfKinAddress" className="text-right">
                    Address
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="nextOfKinAddress"
                      value={editForm.nextOfKinAddress}
                      onChange={(e) => setEditForm({...editForm, nextOfKinAddress: e.target.value})}
                      className="w-full"
                      placeholder="Address (optional)"
                    />
                  </div>
                </div>
              </div>
                      
              {/* Emergency Contact Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Emergency Contact</h3>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="emergencyContactFullName" className="text-right">
                    Full Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="emergencyContactFullName"
                      value={editForm.emergencyContactFullName}
                      onChange={(e) => setEditForm({...editForm, emergencyContactFullName: e.target.value})}
                      className="w-full"
                      placeholder="Full name of emergency contact"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="emergencyContactRelationship" className="text-right">
                    Relationship
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="emergencyContactRelationship"
                      value={editForm.emergencyContactRelationship}
                      onChange={(e) => setEditForm({...editForm, emergencyContactRelationship: e.target.value})}
                      className="w-full"
                      placeholder="Relationship to staff member"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="emergencyContactPhoneNumber" className="text-right">
                    Phone
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="emergencyContactPhoneNumber"
                      value={editForm.emergencyContactPhoneNumber}
                      onChange={(e) => setEditForm({...editForm, emergencyContactPhoneNumber: e.target.value})}
                      className="w-full"
                      placeholder="Phone number (primary)"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeEditDialog} className="cursor-pointer hover:text-foreground">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={saveEditedStaff} className="cursor-pointer">
                <Save className="w-4 h-4 mr-2 " />
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Staff Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a record for a staff member who may not be a system user
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-name" className="text-right">
                  Name *
                </Label>
                <div className="col-span-3">
                  <Input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    className="w-full"
                    placeholder="Full name"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-email" className="text-right">
                  Email
                </Label>
                <div className="col-span-3">
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full"
                    placeholder="Email address"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-department" className="text-right">
                  Department
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={createForm.department} 
                    onValueChange={(value) => setCreateForm({...createForm, department: value})}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-position" className="text-right">
                  Position
                </Label>
                <div className="col-span-3">
                  <Input
                    id="create-position"
                    value={createForm.position}
                    onChange={(e) => setCreateForm({...createForm, position: e.target.value})}
                    className="w-full"
                    placeholder="Job position"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-phoneNumber" className="text-right">
                  Phone
                </Label>
                <div className="col-span-3">
                  <Input
                    id="create-phoneNumber"
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm({...createForm, phoneNumber: e.target.value})}
                    className="w-full"
                    placeholder="Phone number"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-address" className="text-right">
                  Address
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="create-address"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({...createForm, address: e.target.value})}
                    className="w-full"
                    placeholder="Home address"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-dateOfBirth" className="text-right">
                  D.O.B
                </Label>
                <div className="col-span-3">
                  <Input
                    id="create-dateOfBirth"
                    type="date"
                    value={createForm.dateOfBirth}
                    onChange={(e) => setCreateForm({...createForm, dateOfBirth: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-hireDate" className="text-right">
                  Hire Date
                </Label>
                <div className="col-span-3">
                  <Input
                    id="create-hireDate"
                    type="date"
                    value={createForm.hireDate}
                    onChange={(e) => setCreateForm({...createForm, hireDate: e.target.value})}
                    className="w-full"
                  />
                </div>
              </div>
                      
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={createForm.status} 
                    onValueChange={(value) => setCreateForm({...createForm, status: value})}
                  >
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
                      
              {/* Medical Information Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Medical Information</h3>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="create-existingConditions" className="text-right">
                    Conditions
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="create-existingConditions"
                      value={createForm.existingConditions}
                      onChange={(e) => setCreateForm({...createForm, existingConditions: e.target.value})}
                      className="w-full"
                      placeholder="List any existing medical conditions"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="create-allergies" className="text-right">
                    Allergies
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="create-allergies"
                      value={createForm.allergies}
                      onChange={(e) => setCreateForm({...createForm, allergies: e.target.value})}
                      className="w-full"
                      placeholder="List any allergies"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="create-medicalNotes" className="text-right">
                    Notes
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="create-medicalNotes"
                      value={createForm.medicalNotes}
                      onChange={(e) => setCreateForm({...createForm, medicalNotes: e.target.value})}
                      className="w-full"
                      placeholder="Any additional medical notes"
                    />
                  </div>
                </div>
              </div>
                      
              {/* Next of Kin Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Next of Kin</h3>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="create-nextOfKinFullName" className="text-right">
                    Full Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="create-nextOfKinFullName"
                      value={createForm.nextOfKinFullName}
                      onChange={(e) => setCreateForm({...createForm, nextOfKinFullName: e.target.value})}
                      className="w-full"
                      placeholder="Full name of next of kin"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="create-nextOfKinRelationship" className="text-right">
                    Relationship
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="create-nextOfKinRelationship"
                      value={createForm.nextOfKinRelationship}
                      onChange={(e) => setCreateForm({...createForm, nextOfKinRelationship: e.target.value})}
                      className="w-full"
                      placeholder="Relationship to staff member"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="create-nextOfKinPhoneNumber" className="text-right">
                    Phone
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="create-nextOfKinPhoneNumber"
                      value={createForm.nextOfKinPhoneNumber}
                      onChange={(e) => setCreateForm({...createForm, nextOfKinPhoneNumber: e.target.value})}
                      className="w-full"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="create-nextOfKinEmail" className="text-right">
                    Email
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="create-nextOfKinEmail"
                      value={createForm.nextOfKinEmail}
                      onChange={(e) => setCreateForm({...createForm, nextOfKinEmail: e.target.value})}
                      className="w-full"
                      placeholder="Email (optional)"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="create-nextOfKinAddress" className="text-right">
                    Address
                  </Label>
                  <div className="col-span-3">
                    <Textarea
                      id="create-nextOfKinAddress"
                      value={createForm.nextOfKinAddress}
                      onChange={(e) => setCreateForm({...createForm, nextOfKinAddress: e.target.value})}
                      className="w-full"
                      placeholder="Address (optional)"
                    />
                  </div>
                </div>
              </div>
                      
              {/* Emergency Contact Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Emergency Contact</h3>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="create-emergencyContactFullName" className="text-right">
                    Full Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="create-emergencyContactFullName"
                      value={createForm.emergencyContactFullName}
                      onChange={(e) => setCreateForm({...createForm, emergencyContactFullName: e.target.value})}
                      className="w-full"
                      placeholder="Full name of emergency contact"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4 mb-4">
                  <Label htmlFor="create-emergencyContactRelationship" className="text-right">
                    Relationship
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="create-emergencyContactRelationship"
                      value={createForm.emergencyContactRelationship}
                      onChange={(e) => setCreateForm({...createForm, emergencyContactRelationship: e.target.value})}
                      className="w-full"
                      placeholder="Relationship to staff member"
                    />
                  </div>
                </div>
                        
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="create-emergencyContactPhoneNumber" className="text-right">
                    Phone
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="create-emergencyContactPhoneNumber"
                      value={createForm.emergencyContactPhoneNumber}
                      onChange={(e) => setCreateForm({...createForm, emergencyContactPhoneNumber: e.target.value})}
                      className="w-full"
                      placeholder="Phone number (primary)"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeCreateDialog} className="cursor-pointer">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={createNewStaff} className="cursor-pointer">
                <Plus className="w-4 h-4 mr-2" />
                Create Staff
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Staff Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Staff Details</DialogTitle>
              <DialogDescription>
                View staff information
              </DialogDescription>
            </DialogHeader>
            {viewingStaff && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="text-foreground">{viewingStaff.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-foreground">{viewingStaff.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-foreground">{viewingStaff.phoneNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="text-foreground">{viewingStaff.address || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">D.O.B</p>
                        <p className="text-foreground">
                          {viewingStaff.dateOfBirth ? format(viewingStaff.dateOfBirth, 'MMM dd, yyyy') : 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                          
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Work Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Role</p>
                        <p className="text-foreground">
                          {viewingStaff.role.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="text-foreground">
                          {departments.find(d => d.id === viewingStaff.department)?.name || viewingStaff.department || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Position</p>
                        <p className="text-foreground">{viewingStaff.position || 'Not assigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hire Date</p>
                        <p className="text-foreground">
                          {viewingStaff.hireDate ? format(viewingStaff.hireDate, 'MMM dd, yyyy') : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge 
                          className={
                            viewingStaff.status === 'Active' 
                              ? "bg-green-100 text-green-800 font-medium" 
                              : "bg-red-100 text-red-800 font-medium"
                          }
                        >
                          {viewingStaff.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <Badge 
                          variant="outline"
                          className={
                            viewingStaff.isSystemUser 
                              ? "border-blue-500 text-blue-500" 
                              : "border-gray-500 text-gray-500"
                          }
                        >
                          {viewingStaff.isSystemUser ? "System User" : "Staff Only"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                        
                {/* Medical Information Section */}
                {(viewingStaff.medicalInfo?.existingConditions || viewingStaff.medicalInfo?.allergies || viewingStaff.medicalInfo?.medicalNotes) && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-2">Medical Information</h3>
                    <div className="space-y-2">
                      {viewingStaff.medicalInfo.existingConditions && (
                        <div>
                          <p className="text-sm text-muted-foreground">Existing Conditions</p>
                          <p className="text-foreground">{viewingStaff.medicalInfo.existingConditions}</p>
                        </div>
                      )}
                      {viewingStaff.medicalInfo.allergies && (
                        <div>
                          <p className="text-sm text-muted-foreground">Allergies</p>
                          <p className="text-foreground">{viewingStaff.medicalInfo.allergies}</p>
                        </div>
                      )}
                      {viewingStaff.medicalInfo.medicalNotes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Medical Notes</p>
                          <p className="text-foreground">{viewingStaff.medicalInfo.medicalNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                        
                {/* Next of Kin Section */}
                {viewingStaff.nextOfKin && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-2">Next of Kin</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="text-foreground">{viewingStaff.nextOfKin.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Relationship</p>
                        <p className="text-foreground">{viewingStaff.nextOfKin.relationship}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone Number</p>
                        <p className="text-foreground">{viewingStaff.nextOfKin.phoneNumber}</p>
                      </div>
                      {viewingStaff.nextOfKin.email && (
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="text-foreground">{viewingStaff.nextOfKin.email}</p>
                        </div>
                      )}
                      {viewingStaff.nextOfKin.address && (
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="text-foreground">{viewingStaff.nextOfKin.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                        
                {/* Emergency Contact Section */}
                {viewingStaff.emergencyContact && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-2">Emergency Contact</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="text-foreground">{viewingStaff.emergencyContact.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Relationship</p>
                        <p className="text-foreground">{viewingStaff.emergencyContact.relationship}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone Number</p>
                        <p className="text-foreground">{viewingStaff.emergencyContact.phoneNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Timesheet Dialog */}
        <Dialog open={isViewTimesheetDialogOpen} onOpenChange={setIsViewTimesheetDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Timesheet Details</DialogTitle>
              <DialogDescription>
                View detailed information about this timesheet record
              </DialogDescription>
            </DialogHeader>
            {viewingTimesheet && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Work Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Staff Member</p>
                        <p className="text-foreground">{viewingTimesheet.userName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Check In</p>
                        <p className="text-foreground">{format(viewingTimesheet.checkInTime, 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Check Out</p>
                        <p className="text-foreground">
                          {viewingTimesheet.checkOutTime ? format(viewingTimesheet.checkOutTime, 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Project</p>
                        <p className="text-foreground">{getProgramName(viewingTimesheet.programId, programs)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Hours</p>
                        <p className="text-foreground">{formatHoursWithMinutes(viewingTimesheet.hoursWorked)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Overtime</p>
                        <p className="text-foreground">{formatHoursWithMinutes(viewingTimesheet.overtime)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Status Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge 
                          variant={
                            viewingTimesheet.status === 'approved' ? 'default' : 
                            viewingTimesheet.status === 'pending' ? 'outline' : 'destructive'
                          }
                        >
                          {viewingTimesheet.status.charAt(0).toUpperCase() + viewingTimesheet.status.slice(1)}
                        </Badge>
                      </div>
                      {viewingTimesheet.status !== 'pending' && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Approved/Rejected By</p>
                            <p className="text-foreground">{viewingTimesheet.approvedBy || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Action Date</p>
                            <p className="text-foreground">
                              {viewingTimesheet.approvedAt ? format(viewingTimesheet.approvedAt, 'MMMM d, yyyy HH:mm') : 'N/A'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Break Information</h3>
                  {viewingTimesheet.breaks && viewingTimesheet.breaks.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingTimesheet.breaks.map((breakItem, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-foreground">
                              {breakItem.type === 'lunch' ? 'Lunch Break' : 'Regular Break'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(breakItem.startTime, 'HH:mm')}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {breakItem.endTime ? format(breakItem.endTime, 'HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {breakItem.duration > 0 ? `${breakItem.duration} minutes` : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No breaks recorded for this timesheet</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Timesheet Status Dialog */}
        <Dialog open={isUpdateStatusDialogOpen} onOpenChange={setIsUpdateStatusDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Update Timesheet Status</DialogTitle>
              <DialogDescription>
                Change the approval status of this timesheet if set by mistake
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {timesheetToUpdate && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="staff-name" className="text-right">
                      Staff
                    </Label>
                    <div className="col-span-3">
                      <p className="text-foreground font-medium">{timesheetToUpdate.userName}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="timesheet-date" className="text-right">
                      Date
                    </Label>
                    <div className="col-span-3">
                      <p className="text-foreground">{format(timesheetToUpdate.date, 'MMMM d, yyyy')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="current-status" className="text-right">
                      Current Status
                    </Label>
                    <div className="col-span-3">
                      <Badge 
                        variant={
                          timesheetToUpdate.status === 'approved' ? 'default' : 
                          timesheetToUpdate.status === 'pending' ? 'outline' : 'destructive'
                        }
                      >
                        {timesheetToUpdate.status.charAt(0).toUpperCase() + timesheetToUpdate.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-status" className="text-right">
                      New Status
                    </Label>
                    <div className="col-span-3">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeUpdateStatusDialog} className="cursor-pointer">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleStatusUpdate} className="cursor-pointer">
                <Save className="w-4 h-4 mr-2" />
                Update Status
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </RoleBasedLayout>
    </ProtectedRoute>
  )
}