'use client'

import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, Timestamp, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Calendar, Clock, User, TrendingUp } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'

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
  // Approval fields
  timesheetApproved?: boolean
  timesheetApprovedBy?: string
  timesheetApprovedAt?: Date
}

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

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AttendanceAnalyticsContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState('all')
  const [selectedProgram, setSelectedProgram] = useState('all')
  // New state for approval filter
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState('all')
  // New states for date range filter
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  // Ref to hold the unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Check if user has access to attendance analytics
  const hasAccess = () => {
    if (!user?.role) return false
    return user.role === 'executive director' || user.role === 'board' || user.role === 'system admin'
  }

  // Redirect if user doesn't have access
  useEffect(() => {
    if (user && !hasAccess()) {
      router.push('/')
    }
  }, [user, router])

  // Cleanup function to unsubscribe from Firestore listeners
  useEffect(() => {
    // Cleanup function to unsubscribe when component unmounts
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  // If user doesn't have access, don't render anything
  if (!hasAccess()) {
    return null
  }

  useEffect(() => {
    fetchAttendanceData()
    fetchUsers()
    fetchPrograms()
    
    // Cleanup function for this effect
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [startDate, endDate])

  const fetchAttendanceData = async () => {
    try {
      // Clean up any existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      
      const q = query(
        collection(db, 'attendance'),
        orderBy('createdAt', 'desc')
      )
      
      unsubscribeRef.current = onSnapshot(q, (snapshot) => {
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
            // Approval fields
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
                }).catch((error: any) => {
                  console.error('Error auto-rejecting timesheet:', error);
                });
              }
            }
          }
          
          // Filter by date range - custom date range takes precedence
          if (startDate && endDate) {
            // Check if record date is within the selected range
            const recordDate = new Date(record.checkInTime);
            const start = new Date(startDate);
            let end = new Date(endDate);
            // Set end date to end of day
            end.setHours(23, 59, 59, 999);
            
            // Normalize dates to compare only the date part (not time)
            recordDate.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            
            if (recordDate >= start && recordDate <= end) {
              recordsData.push(record)
            }
          } else {
            // If no date range is selected, include all records
            recordsData.push(record)
          }
        })
        
        setAttendanceRecords(recordsData)
        setLoading(false)
      }, (error) => {
        console.error('Error in attendance snapshot listener:', error)
        setLoading(false)
      })
    } catch (error) {
      console.error('Error fetching attendance data:', error)
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'))
      const querySnapshot = await getDocs(q)
      const usersData: User[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        // Exclude System Admins, Executive Directors, and Board Members from the user list
        // Only include regular staff members
        if (data.role && 
            data.role !== 'system admin' && 
            data.role !== 'executive director' && 
            data.role !== 'board') {
          usersData.push({
            id: doc.id,
            name: data.name || data.displayName || 'Unknown User',
            email: data.email || '',
            role: data.role || 'unknown',
            status: data.status || 'Active'
          })
        }
      })
      
      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

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

  // Get program name by ID
  const getProgramName = (programId: string | undefined) => {
    if (!programId || programId === 'general-work') return 'General Work'
    const program = programs.find(p => p.id === programId)
    return program ? program.name : 'Unknown Program'
  }


  // Calculate statistics
  const calculateStats = () => {
    let filteredRecords = attendanceRecords
    
    // Filter by user
    if (selectedUser !== 'all') {
      filteredRecords = filteredRecords.filter(record => record.userId === selectedUser)
    }
    
    // Filter by program
    if (selectedProgram !== 'all') {
      filteredRecords = filteredRecords.filter(record => 
        record.programId === selectedProgram || 
        (selectedProgram === 'general-work' && !record.programId)
      )
    }
    
    // Filter by approval status
    if (selectedApprovalStatus !== 'all') {
      if (selectedApprovalStatus === 'approved') {
        filteredRecords = filteredRecords.filter(record => record.timesheetApproved === true)
      } else if (selectedApprovalStatus === 'pending') {
        filteredRecords = filteredRecords.filter(record => record.timesheetApproved === undefined || record.timesheetApproved === null)
      }
    }
      
    const totalHours = filteredRecords.reduce((sum, record) => sum + record.totalTime, 0) / 60
    const totalOvertime = filteredRecords.reduce((sum, record) => sum + record.overtime, 0) / 60
    const averageHours = filteredRecords.length > 0 ? totalHours / filteredRecords.length : 0
    
    // Calculate late arrivals (after 8:00 AM)
    const lateArrivalsRecords = filteredRecords.filter(record => {
      const checkInHour = record.checkInTime.getHours()
      const checkInMinute = record.checkInTime.getMinutes()
      return (checkInHour > 8) || (checkInHour === 8 && checkInMinute > 0)
    });
    
    const lateArrivals = lateArrivalsRecords.length;
    
    return {
      totalHours,
      totalOvertime,
      averageHours,
      lateArrivals,
      lateArrivalsRecords // Return the actual records for detailed view
    }
  }

  // Prepare data for charts
  const prepareChartData = () => {
    let filteredRecords = attendanceRecords
    
    // Filter by user
    if (selectedUser !== 'all') {
      filteredRecords = filteredRecords.filter(record => record.userId === selectedUser)
    }
    
    // Filter by program
    if (selectedProgram !== 'all') {
      filteredRecords = filteredRecords.filter(record => 
        record.programId === selectedProgram || 
        (selectedProgram === 'general-work' && !record.programId)
      )
    }
    
    // Filter by approval status
    if (selectedApprovalStatus !== 'all') {
      if (selectedApprovalStatus === 'approved') {
        filteredRecords = filteredRecords.filter(record => record.timesheetApproved === true)
      } else if (selectedApprovalStatus === 'pending') {
        filteredRecords = filteredRecords.filter(record => record.timesheetApproved === undefined || record.timesheetApproved === null)
      }
    }
      
    // Group by date for daily hours chart
    const dailyData: {date: string, hours: number}[] = []
    const roleData: {[key: string]: number} = {}
    const programData: {[key: string]: number} = {}
    
    filteredRecords.forEach(record => {
      const date = format(record.checkInTime, 'MMM dd')
      const existingEntry = dailyData.find(d => d.date === date)
      const hours = record.totalTime / 60
      
      if (existingEntry) {
        existingEntry.hours += hours
      } else {
        dailyData.push({ date, hours })
      }
      
      // Aggregate by role
      if (roleData[record.userRole]) {
        roleData[record.userRole] += hours
      } else {
        roleData[record.userRole] = hours
      }
      
      // Aggregate by program
      const programName = getProgramName(record.programId)
      if (programData[programName]) {
        programData[programName] += hours
      } else {
        programData[programName] = hours
      }
    })
    
    // Convert role data to chart format
    const roleChartData = Object.entries(roleData).map(([role, hours]) => ({
      name: role,
      value: parseFloat(hours.toFixed(1))
    }))
    
    // Convert program data to chart format
    const programChartData = Object.entries(programData).map(([program, hours]) => ({
      name: program,
      value: parseFloat(hours.toFixed(1))
    }))
    
    return { dailyData, roleChartData, programChartData }
  }

  // Function to handle date range filter reset
  const resetDateRange = () => {
    setStartDate('')
    setEndDate('')
  }

  // Function to reset all filters
  const resetAllFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedUser('all')
    setSelectedProgram('all')
    setSelectedApprovalStatus('all')
  }

  // Helper function to convert decimal hours to hours and minutes format
  const formatHoursWithMinutes = (decimalHours: number): string => {
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0 && minutes > 0) {
      return `${decimalHours.toFixed(1)} hrs (${minutes} min)`;
    } else if (minutes === 0) {
      return `${decimalHours.toFixed(1)} hrs`;
    } else {
      return `${decimalHours.toFixed(1)} hrs (${hours}h ${minutes}m)`;
    }
  };

  // Add this function to convert filtered data to CSV format
  const convertToCSV = (records: AttendanceRecord[]) => {
    const headers = [
      'User Name',
      'Role',
      'Program',
      'Date',
      'Check In Time',
      'Check Out Time',
      'Total Hours',
      'Overtime Hours',
      'Status',
      'Approval Status',
      'Approved/Rejected By',
      'Approval Date'
    ];
    
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.userName,
        record.userRole,
        getProgramName(record.programId),
        format(record.checkInTime, 'dd MMM, yyyy'),
        format(record.checkInTime, 'HH:mm'),
        record.checkOutTime ? format(record.checkOutTime, 'HH:mm') : 'N/A',
        formatHoursWithMinutes(record.totalTime / 60).replace(',', ''), // Remove comma for CSV
        formatHoursWithMinutes(record.overtime / 60).replace(',', ''), // Remove comma for CSV
        record.status.replace('-', ' '),
        record.timesheetApproved === true ? 'Approved' : 
        record.timesheetApproved === false ? 'Rejected' : 'Pending',
        record.timesheetApprovedBy || 'N/A',
        record.timesheetApprovedAt ? format(record.timesheetApprovedAt, 'MMM dd, yyyy HH:mm') : 'N/A'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');
    
    return csvContent;
  };

  // Add this function to download CSV file
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add this function to handle export
  const handleExport = () => {
    // Apply the same filters as used in the table
    let filteredRecords = attendanceRecords
      .filter(record => {
        // Apply date range filter to table as well
        if (startDate && endDate) {
          const recordDate = new Date(record.checkInTime);
          const start = new Date(startDate);
          let end = new Date(endDate);
          // Set end date to end of day
          end.setHours(23, 59, 59, 999);
          
          // Normalize dates to compare only the date part (not time)
          recordDate.setHours(0, 0, 0, 0);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          
          return recordDate >= start && recordDate <= end;
        }
        return true;
      })
      .filter(record => selectedUser === 'all' || record.userId === selectedUser)
      .filter(record => 
        selectedProgram === 'all' || 
        record.programId === selectedProgram || 
        (selectedProgram === 'general-work' && !record.programId)
      )
      .filter(record => {
        // Filter by approval status
        if (selectedApprovalStatus === 'all') return true
        if (selectedApprovalStatus === 'approved') {
          return record.timesheetApproved === true
        } else if (selectedApprovalStatus === 'pending') {
          return record.timesheetApproved !== true
        }
        return true
      });

    const csvContent = convertToCSV(filteredRecords);
    const filename = `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csvContent, filename);
  };

  const stats = calculateStats()
  const { dailyData, roleChartData, programChartData } = prepareChartData()

  // Function to determine if a record is a late arrival
  const isLateArrival = (record: AttendanceRecord) => {
    const checkInHour = record.checkInTime.getHours()
    const checkInMinute = record.checkInTime.getMinutes()
    return (checkInHour > 8) || (checkInHour === 8 && checkInMinute > 0)
  }

  // Get current records for pagination
  const getCurrentRecords = () => {
    // Apply all filters first
    let filteredRecords = attendanceRecords
      .filter(record => {
        // Apply date range filter
        if (startDate && endDate) {
          const recordDate = new Date(record.checkInTime);
          const start = new Date(startDate);
          let end = new Date(endDate);
          // Set end date to end of day
          end.setHours(23, 59, 59, 999);
          
          // Normalize dates to compare only the date part (not time)
          recordDate.setHours(0, 0, 0, 0);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          
          return recordDate >= start && recordDate <= end;
        }
        return true;
      })
      .filter(record => selectedUser === 'all' || record.userId === selectedUser)
      .filter(record => 
        selectedProgram === 'all' || 
        record.programId === selectedProgram || 
        (selectedProgram === 'general-work' && !record.programId)
      )
      .filter(record => {
        // Filter by approval status
        if (selectedApprovalStatus === 'all') return true
        if (selectedApprovalStatus === 'approved') {
          return record.timesheetApproved === true
        } else if (selectedApprovalStatus === 'pending') {
          return record.timesheetApproved !== true
        }
        return true
      });

    // Calculate pagination
    const indexOfLastRecord = currentPage * itemsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - itemsPerPage;
    return filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  };

  // Get total pages
  const getTotalPages = () => {
    // Apply all filters first
    let filteredRecords = attendanceRecords
      .filter(record => {
        // Apply date range filter
        if (startDate && endDate) {
          const recordDate = new Date(record.checkInTime);
          const start = new Date(startDate);
          let end = new Date(endDate);
          // Set end date to end of day
          end.setHours(23, 59, 59, 999);
          
          // Normalize dates to compare only the date part (not time)
          recordDate.setHours(0, 0, 0, 0);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          
          return recordDate >= start && recordDate <= end;
        }
        return true;
      })
      .filter(record => selectedUser === 'all' || record.userId === selectedUser)
      .filter(record => 
        selectedProgram === 'all' || 
        record.programId === selectedProgram || 
        (selectedProgram === 'general-work' && !record.programId)
      )
      .filter(record => {
        // Filter by approval status
        if (selectedApprovalStatus === 'all') return true
        if (selectedApprovalStatus === 'approved') {
          return record.timesheetApproved === true
        } else if (selectedApprovalStatus === 'pending') {
          return record.timesheetApproved !== true
        }
        return true
      });

    return Math.ceil(filteredRecords.length / itemsPerPage);
  };

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedUser, selectedProgram, selectedApprovalStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Attendance Analytics</h3>
          <p className="text-muted-foreground">Track employee attendance, hours worked, and overtime</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {/* Filter Section */}
          <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-lg p-4 shadow-sm">
            {/* Date Range Filters */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-foreground mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-border rounded-md px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-foreground mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-border rounded-md px-2 py-1 text-sm"
              />
            </div>
            {(startDate || endDate) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetDateRange}
                className="h-9 text-xs cursor-pointer"
              >
                Reset
              </Button>
            )}
            
            {/* User Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-foreground mb-1">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-40 font-medium border-border">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Program Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-foreground mb-1">Program</label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="w-40 font-medium border-border">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  <SelectItem value="general-work">General Work</SelectItem>
                  {programs.map(program => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Approval Status Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-foreground mb-1">Approval Status</label>
              <Select value={selectedApprovalStatus} onValueChange={setSelectedApprovalStatus}>
                <SelectTrigger className="w-40 font-medium border-border">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Export Button */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-foreground mb-1">Actions</label>
              <div className="flex gap-2">
                <Button 
                  onClick={handleExport}
                  className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                  variant="default"
                >
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetAllFilters}
                  className="h-9 text-xs cursor-pointer"
                >
                  Reset All
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHoursWithMinutes(stats.totalHours)}</div>
            <p className="text-xs text-muted-foreground">Total hours worked</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHoursWithMinutes(stats.totalOvertime)}</div>
            <p className="text-xs text-muted-foreground">Total overtime hours</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Per Day</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHoursWithMinutes(stats.averageHours)}</div>
            <p className="text-xs text-muted-foreground">Average hours per day</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lateArrivals}</div>
            <p className="text-xs text-muted-foreground">Arrived after 8:00 AM</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Daily Hours</CardTitle>
            <CardDescription>Hours worked per day</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${formatHoursWithMinutes(Number(value))}`, 'Hours']} />
                <Legend />
                <Bar dataKey="hours" name="Hours Worked" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Hours by Role</CardTitle>
            <CardDescription>Total hours worked by role</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {roleChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${formatHoursWithMinutes(Number(value))}`, 'Hours']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Program Hours Chart */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Hours by Program</CardTitle>
            <CardDescription>Total hours worked by program</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={programChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {programChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${formatHoursWithMinutes(Number(value))}`, 'Hours']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records Table */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">Attendance Records</CardTitle>
          <CardDescription>Detailed attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getCurrentRecords().map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.userName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{record.userRole}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getProgramName(record.programId)}</Badge>
                  </TableCell>
                  <TableCell>{format(record.checkInTime, 'MMM dd, yyyy')}</TableCell>
                  <TableCell className={isLateArrival(record) ? "font-medium text-red-600" : ""}>
                    {format(record.checkInTime, 'HH:mm')}
                  </TableCell>
                  <TableCell>
                    {record.checkOutTime ? format(record.checkOutTime, 'HH:mm') : 'N/A'}
                  </TableCell>
                  <TableCell>{formatHoursWithMinutes(record.totalTime / 60)}</TableCell>
                  <TableCell>
                    <Badge variant={record.overtime > 0 ? "default" : "secondary"}>
                      {formatHoursWithMinutes(record.overtime / 60)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      record.status === 'checked-out' ? "default" : 
                      record.status === 'checked-in' ? "secondary" : "outline"
                    }>
                      {record.status.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      record.timesheetApproved === true ? "default" : 
                      record.timesheetApproved === false ? "destructive" : "outline"
                    }>
                      {record.timesheetApproved === true ? "Approved" : 
                       record.timesheetApproved === false ? "Rejected" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {getTotalPages() > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {getTotalPages()}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="cursor-pointer"
                >
                  Previous
                </Button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                  // Calculate start page for pagination window
                  let startPage = Math.max(1, currentPage - 2);
                  if (startPage > getTotalPages() - 4) {
                    startPage = Math.max(1, getTotalPages() - 4);
                  }
                  
                  const page = startPage + i;
                  if (page > getTotalPages()) return null;
                  
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => paginate(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === getTotalPages()}
                  className="cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}