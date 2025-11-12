'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, CheckCircle, XCircle, FileText, Image as ImageIcon, Download } from 'lucide-react'
import { ApprovalPanel } from './approval-panel'
import { FinanceRequest, Liquidation, Receipt } from './finance-types'
import { formatRequestId, formatLiquidationId } from './finance-utils'
import { toast } from 'sonner'
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ReceiptViewer } from './receipt-viewer'
import { toAbsoluteUrl, encodeUrlPath } from '@/lib/url-utils'

interface Department {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

export function ExecutiveDirectorDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('approvals')
  const [requests, setRequests] = useState<FinanceRequest[]>([])
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [loading, setLoading] = useState(true)
  // Pagination states for history tab
  const [historyPage, setHistoryPage] = useState(1)
  const historyItemsPerPage = 10
  // Date filter states
  const [historyFromDate, setHistoryFromDate] = useState('')
  const [historyToDate, setHistoryToDate] = useState('')
  // View dialog states
  const [viewingItem, setViewingItem] = useState<{item: FinanceRequest | Liquidation, type: 'request' | 'liquidation'} | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  // Receipt viewer state
  const [viewingReceipt, setViewingReceipt] = useState<{
    fileUrl: string
    fileName: string
    fileType: string
    isOpen: boolean
  } | null>(null)
  // Departments and projects state
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  // Fetch departments and projects
  useEffect(() => {
    const fetchDepartmentsAndProjects = async () => {
      try {
        // Fetch departments
        const deptResponse = await fetch('/api/departments')
        if (deptResponse.ok) {
          const deptData = await deptResponse.json()
          setDepartments(deptData.departments || [])
        }

        // Fetch projects
        const projResponse = await fetch('/api/projects')
        if (projResponse.ok) {
          const projData = await projResponse.json()
          setProjects(projData.projects || [])
        }
      } catch (error) {
        console.error('Error fetching departments/projects:', error)
      }
    }

    fetchDepartmentsAndProjects()
  }, [])

  const getDepartmentName = (deptId: string) => {
    const department = departments.find(dept => dept.id === deptId)
    return department ? department.name : deptId
  }

  const getProjectName = (projId: string) => {
    const project = projects.find(proj => proj.id === projId)
    return project ? project.name : projId
  }

  // Fetch all requests and liquidations from Firebase
  useEffect(() => {
    setLoading(true)

    // Fetch all pending requests
    const requestsQuery = query(
      collection(db, 'financeRequests'),
      orderBy('createdAt', 'desc')
    )

    const requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate() || undefined
        } as FinanceRequest
      })
      setRequests(requestsData)
    })

    // Fetch all submitted liquidations
    const liquidationsQuery = query(
      collection(db, 'liquidations'),
      orderBy('createdAt', 'desc')
    )

    const liquidationsUnsubscribe = onSnapshot(liquidationsQuery, (snapshot) => {
      const liquidationsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          submittedAt: data.submittedAt?.toDate() || undefined,
          approvedAt: data.approvedAt?.toDate() || undefined,
          receipts: data.receipts?.map((receipt: any) => ({
            ...receipt,
            date: receipt.date?.toDate() || new Date(),
            // Ensure fileUrl property exists even if undefined
            fileUrl: receipt.fileUrl || undefined
          })) || []
        } as Liquidation
      })
      setLiquidations(liquidationsData)
      setLoading(false)
    })

    // Cleanup subscriptions
    return () => {
      requestsUnsubscribe()
      liquidationsUnsubscribe()
    }
  }, [])

  const handleApproveRequest = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'financeRequests', requestId)
      await updateDoc(requestRef, {
        status: 'approved',
        approvedBy: user?.displayName || 'Executive Director',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      toast.success('Request approved successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Failed to approve request', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      const requestRef = doc(db, 'financeRequests', requestId)
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: Timestamp.now()
      })
      toast.success('Request rejected', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject request', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleApproveLiquidation = async (liquidationId: string) => {
    try {
      const liquidationRef = doc(db, 'liquidations', liquidationId)
      await updateDoc(liquidationRef, {
        status: 'approved',
        approvedBy: user?.displayName || 'Executive Director',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      toast.success('Liquidation approved successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error approving liquidation:', error)
      toast.error('Failed to approve liquidation', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleRejectLiquidation = async (liquidationId: string, reason: string) => {
    try {
      const liquidationRef = doc(db, 'liquidations', liquidationId)
      await updateDoc(liquidationRef, {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: Timestamp.now()
      })
      toast.success('Liquidation rejected', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error rejecting liquidation:', error)
      toast.error('Failed to reject liquidation', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleViewDetails = (item: FinanceRequest | Liquidation, type: 'request' | 'liquidation') => {
    setViewingItem({item, type})
    setIsViewDialogOpen(true)
  }

  const handleViewReceipt = (fileUrl: string | undefined, fileName: string = 'receipt') => {
    if (!fileUrl || fileUrl.trim() === '') {
      toast.error('No receipt file available', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    // Ensure we have a valid URL
    let validFileUrl = fileUrl.trim()
    
    // If it's a relative path, make it absolute
    validFileUrl = toAbsoluteUrl(validFileUrl)
    
    // Encode the URL to handle special characters
    validFileUrl = encodeUrlPath(validFileUrl)
    
    // Determine file type from URL or extension
    let fileType = 'application/octet-stream'
    if (validFileUrl && typeof validFileUrl === 'string' && validFileUrl.endsWith && validFileUrl.endsWith('.pdf')) {
      fileType = 'application/pdf'
    } else if (validFileUrl && typeof validFileUrl === 'string' && validFileUrl.match && validFileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
      fileType = 'image/jpeg' // Default to jpeg, will be corrected by browser
    }
    
    setViewingReceipt({
      fileUrl: validFileUrl,
      fileName,
      fileType,
      isOpen: true
    })
  }

  const closeReceiptViewer = () => {
    setViewingReceipt(null)
  }

  const handleResetFilters = () => {
    setHistoryFromDate('')
    setHistoryToDate('')
    setHistoryPage(1)
  }

  // CSV Export function for history
  const exportHistoryToCSV = () => {
    // Combine requests and liquidations for history
    const historyItems = [
      ...requests.filter(r => r.status !== 'pending').map(item => ({ ...item, type: 'request' }))
      .map(item => ({ ...item, type: 'Request' })),
      ...liquidations.filter(l => l.status !== 'pending' && l.status !== 'submitted').map(item => ({ ...item, type: 'liquidation' }))
      .map(item => ({ ...item, type: 'Liquidation' }))
    ]
    
    // Apply date filters
    const filteredHistoryItems = historyItems.filter(item => {
      // Get the relevant date for filtering
      let itemDate: Date | undefined;
      
      if (item.type === 'Request') {
        const request = item as FinanceRequest;
        itemDate = request.approvedAt || request.updatedAt || request.createdAt;
      } else {
        const liquidation = item as Liquidation;
        itemDate = liquidation.approvedAt || liquidation.updatedAt || liquidation.createdAt;
      }
      
      // If no date available, exclude from results
      if (!itemDate) return false;
      
      const date = new Date(itemDate);
      
      // Apply from date filter
      if (historyFromDate && date < new Date(historyFromDate)) return false;
      
      // Apply to date filter (end of day)
      if (historyToDate) {
        const toDate = new Date(historyToDate);
        toDate.setHours(23, 59, 59, 999); // Set to end of the day
        if (date > toDate) return false;
      }
      
      return true;
    })

    // Sort by date (newest first)
    filteredHistoryItems.sort((a, b) => {
      const dateA = a.type === 'Request' 
        ? (a as FinanceRequest).approvedAt || (a as FinanceRequest).updatedAt || (a as FinanceRequest).createdAt
        : (a as Liquidation).approvedAt || (a as Liquidation).updatedAt || (a as Liquidation).createdAt
      const dateB = b.type === 'Request' 
        ? (b as FinanceRequest).approvedAt || (b as FinanceRequest).updatedAt || (b as FinanceRequest).createdAt
        : (b as Liquidation).approvedAt || (b as Liquidation).updatedAt || (b as Liquidation).createdAt
    
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0)
    })

    // Format data for CSV export
    const exportData = filteredHistoryItems.map(item => ({
      type: item.type,
      id: item.type === 'Request' ? formatRequestId(item.id) : formatLiquidationId(item.id),
      requester: item.requesterName,
      role: item.requesterRole,
      amount: item.amount,
      currency: item.currency || 'MWK',
      purpose: item.purpose,
      status: item.status,
      createdAt: item.createdAt instanceof Date 
        ? item.createdAt.toLocaleDateString('en-GB') 
        : new Date(item.createdAt).toLocaleDateString('en-GB'),
      updatedAt: item.updatedAt instanceof Date 
        ? item.updatedAt.toLocaleDateString('en-GB') 
        : new Date(item.updatedAt).toLocaleDateString('en-GB'),
      approvedAt: item.approvedAt ? (
        item.approvedAt instanceof Date 
          ? item.approvedAt.toLocaleDateString('en-GB') 
          : new Date(item.approvedAt).toLocaleDateString('en-GB')
      ) : 'N/A',
      approvedBy: item.approvedBy || 'N/A',
      rejectionReason: item.rejectionReason || 'N/A'
    }))

    // Create CSV content
    const headers = [
      'Type',
      'ID',
      'Requester',
      'Role',
      'Amount',
      'Currency',
      'Purpose',
      'Status',
      'Created At',
      'Updated At',
      'Approved At',
      'Approved By',
      'Rejection Reason'
    ]

    const csvContent = [
      headers.join(','),
      ...exportData.map(item => 
        headers.map(header => {
          // Fix the key mapping to properly access the fields
          let key: string;
          switch (header) {
            case 'Created At':
              key = 'createdAt';
              break;
            case 'Updated At':
              key = 'updatedAt';
              break;
            case 'Approved At':
              key = 'approvedAt';
              break;
            case 'Approved By':
              key = 'approvedBy';
              break;
            case 'Rejection Reason':
              key = 'rejectionReason';
              break;
            default:
              key = header.toLowerCase().replace(/ /g, '').replace(/-/g, '');
          }
          const value = item[key as keyof typeof item]
          // Escape commas and wrap in quotes if needed
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `approval_history_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length + 
                      liquidations.filter(l => l.status === 'submitted').length

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finance Management</h1>
          <p className="text-muted-foreground">Approve fund requests and liquidations</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg py-2 px-4">
            {pendingCount} Pending Approvals
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/20 border-border cursor-pointer">
          <TabsTrigger 
            value="approvals" 
            className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
          >
            Pending Approvals
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
          >
            Approval History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-4 pt-4">
          <ApprovalPanel
            requests={requests}
            liquidations={liquidations}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onApproveLiquidation={handleApproveLiquidation}
            onRejectLiquidation={handleRejectLiquidation}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Approval History</CardTitle>
                  <CardDescription>All approved and rejected requests</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="from-date" className="text-sm font-medium">From Date</Label>
                    <div className="flex gap-2">
                      <Input
                        id="from-date"
                        type="date"
                        value={historyFromDate}
                        onChange={(e) => setHistoryFromDate(e.target.value)}
                        className="w-[180px]"
                      />
                      {historyFromDate && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleResetFilters}
                          className="cursor-pointer"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="to-date" className="text-sm font-medium">To Date</Label>
                    <Input
                      id="to-date"
                      type="date"
                      value={historyToDate}
                      onChange={(e) => setHistoryToDate(e.target.value)}
                      className="w-[180px]"
                    />
                  </div>
                  <Button onClick={exportHistoryToCSV} variant="outline" size="sm" className="h-10 cursor-pointer">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Combine requests and liquidations for pagination
                      const historyItems = [
                        ...requests.filter(r => r.status !== 'pending').map(item => ({ ...item, type: 'request' })),
                        ...liquidations.filter(l => l.status !== 'pending' && l.status !== 'submitted').map(item => ({ ...item, type: 'liquidation' }))
                      ]
                      
                      // Apply date filters
                      const filteredHistoryItems = historyItems.filter(item => {
                        // Get the relevant date for filtering
                        let itemDate: Date | undefined;
                        
                        if (item.type === 'request') {
                          const request = item as FinanceRequest;
                          itemDate = request.approvedAt || request.updatedAt || request.createdAt;
                        } else {
                          const liquidation = item as Liquidation;
                          itemDate = liquidation.approvedAt || liquidation.updatedAt || liquidation.createdAt;
                        }
                        
                        // If no date available, exclude from results
                        if (!itemDate) return false;
                        
                        const date = new Date(itemDate);
                        
                        // Apply from date filter
                        if (historyFromDate && date < new Date(historyFromDate)) return false;
                        
                        // Apply to date filter (end of day)
                        if (historyToDate) {
                          const toDate = new Date(historyToDate);
                          toDate.setHours(23, 59, 59, 999); // Set to end of the day
                          if (date > toDate) return false;
                        }
                        
                        return true;
                      })
                      
                      // Sort by date (newest first)
                      filteredHistoryItems.sort((a, b) => {
                        const dateA = a.type === 'request' 
                          ? (a as FinanceRequest).approvedAt || (a as FinanceRequest).updatedAt 
                          : (a as Liquidation).approvedAt || (a as Liquidation).updatedAt
                        const dateB = b.type === 'request' 
                          ? (b as FinanceRequest).approvedAt || (b as FinanceRequest).updatedAt 
                          : (b as Liquidation).approvedAt || (b as Liquidation).updatedAt
                        
                        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0)
                      })
                      
                      // Pagination
                      const totalHistoryPages = Math.ceil(filteredHistoryItems.length / historyItemsPerPage)
                      const historyToDisplay = filteredHistoryItems.slice(
                        (historyPage - 1) * historyItemsPerPage,
                        historyPage * historyItemsPerPage
                      )
                      
                      return historyToDisplay.length > 0 ? (
                        historyToDisplay.map((item) => {
                          if (item.type === 'request') {
                            const request = item as FinanceRequest
                            return (
                              <TableRow key={`req-${request.id}`}>
                                <TableCell>Request</TableCell>
                                <TableCell className="font-medium">{formatRequestId(request.id)}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{request.requesterName}</p>
                                    <Badge variant="secondary" className="text-xs">
                                      {request.requesterRole}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>K{request.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={request.status === 'approved' ? 'default' : 'destructive'}
                                  >
                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {(request.approvedAt || request.updatedAt || request.createdAt)?.toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  }) || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleViewDetails(request, 'request')}
                                      className='cursor-pointer'
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          } else {
                            const liquidation = item as Liquidation
                            return (
                              <TableRow key={`liq-${liquidation.id}`}>
                                <TableCell>Liquidation</TableCell>
                                <TableCell className="font-medium">{formatLiquidationId(liquidation.id)}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{liquidation.requesterName}</p>
                                    <Badge variant="secondary" className="text-xs">
                                      {liquidation.requesterRole}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>K{liquidation.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={liquidation.status === 'approved' ? 'default' : 'destructive'}
                                  >
                                    {liquidation.status.split('-').map(word => 
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {(liquidation.approvedAt || liquidation.updatedAt || liquidation.createdAt)?.toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  }) || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleViewDetails(liquidation, 'liquidation')}
                                      className='cursor-pointer'
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          }
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                            No approval history found
                          </TableCell>
                        </TableRow>
                      )
                    })()}
                  </TableBody>
                </Table>
                
                {/* History Pagination */}
                {(() => {
                  // Get all history items
                  const historyItems = [
                    ...requests.filter(r => r.status !== 'pending').map(item => ({ ...item, type: 'request' })),
                    ...liquidations.filter(l => l.status !== 'pending' && l.status !== 'submitted').map(item => ({ ...item, type: 'liquidation' }))
                  ]
                  
                  // Apply date filters
                  const filteredHistoryItems = historyItems.filter(item => {
                    // Get the relevant date for filtering
                    let itemDate: Date | undefined;
                    
                    if (item.type === 'request') {
                      const request = item as FinanceRequest;
                      itemDate = request.approvedAt || request.updatedAt || request.createdAt;
                    } else {
                      const liquidation = item as Liquidation;
                      itemDate = liquidation.approvedAt || liquidation.updatedAt || liquidation.createdAt;
                    }
                    
                    // If no date available, exclude from results
                    if (!itemDate) return false;
                    
                    const date = new Date(itemDate);
                    
                    // Apply from date filter
                    if (historyFromDate && date < new Date(historyFromDate)) return false;
                    
                    // Apply to date filter (end of day)
                    if (historyToDate) {
                      const toDate = new Date(historyToDate);
                      toDate.setHours(23, 59, 59, 999); // Set to end of the day
                      if (date > toDate) return false;
                    }
                    
                    return true;
                  })
                  
                  const totalHistoryPages = Math.ceil(filteredHistoryItems.length / historyItemsPerPage)
                  
                  return totalHistoryPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {Math.min((historyPage - 1) * historyItemsPerPage + 1, filteredHistoryItems.length)} to {Math.min(historyPage * historyItemsPerPage, filteredHistoryItems.length)} of {filteredHistoryItems.length} entries
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                          disabled={historyPage === 1}
                          className="cursor-pointer"
                        >
                          Previous
                        </Button>
                        <div className="flex items-center px-2">
                          <span className="text-sm text-muted-foreground">
                            Page {historyPage} of {totalHistoryPages}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                          disabled={historyPage === totalHistoryPages}
                          className="cursor-pointer"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingItem?.type === 'request' ? 'Request Details' : 'Liquidation Details'}
            </DialogTitle>
            <DialogDescription>
              {viewingItem?.type === 'request' 
                ? `Request ID: ${viewingItem?.item ? formatRequestId(viewingItem.item.id) : ''}` 
                : `Liquidation ID: ${viewingItem?.item ? formatLiquidationId(viewingItem.item.id) : ''}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {viewingItem?.type === 'request' ? (
              // Request Details
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Requester</Label>
                    <p className="font-medium">{(viewingItem.item as FinanceRequest).requesterName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Role</Label>
                    <p className="font-medium">{(viewingItem.item as FinanceRequest).requesterRole}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Amount</Label>
                    <p className="font-medium">K{(viewingItem.item as FinanceRequest).amount.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Department</Label>
                    <p className="font-medium">
                      {((viewingItem?.item as FinanceRequest)?.department && typeof (viewingItem?.item as FinanceRequest)?.department === 'string') 
                        ? getDepartmentName((viewingItem?.item as FinanceRequest).department) 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Project</Label>
                    <p className="font-medium">
                      {((viewingItem?.item as FinanceRequest)?.project && typeof (viewingItem?.item as FinanceRequest)?.project === 'string') 
                        ? getProjectName((viewingItem?.item as FinanceRequest).project || '') 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Status</Label>
                    <Badge 
                      variant={(viewingItem.item as FinanceRequest).status === 'approved' ? 'default' : 'destructive'}
                    >
                      {(viewingItem.item as FinanceRequest).status.charAt(0).toUpperCase() + (viewingItem.item as FinanceRequest).status.slice(1)}
                    </Badge>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-semibold">Purpose</Label>
                    <p className="font-medium">{(viewingItem.item as FinanceRequest).purpose}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Created At</Label>
                    <p className="font-medium">
                      {(viewingItem.item as FinanceRequest).createdAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Last Updated</Label>
                    <p className="font-medium">
                      {(viewingItem.item as FinanceRequest).updatedAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  {(viewingItem.item as FinanceRequest).approvedAt && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Approved At</Label>
                      <p className="font-medium">
                        {(viewingItem.item as FinanceRequest).approvedAt?.toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) || 'N/A'}
                      </p>
                    </div>
                  )}
                  {(viewingItem.item as FinanceRequest).approvedBy && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Approved By</Label>
                      <p className="font-medium">{(viewingItem.item as FinanceRequest).approvedBy}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Liquidation Details
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Requester</Label>
                    <p className="font-medium">{(viewingItem?.item as Liquidation)?.requesterName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Role</Label>
                    <p className="font-medium">{(viewingItem?.item as Liquidation)?.requesterRole}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Request ID</Label>
                    <p className="font-medium">{formatRequestId((viewingItem?.item as Liquidation)?.requestId)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Total Amount</Label>
                    <p className="font-medium">K{(viewingItem?.item as Liquidation)?.amount.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Status</Label>
                    <Badge 
                      variant={(viewingItem?.item as Liquidation)?.status === 'approved' ? 'default' : 'destructive'}
                    >
                      {(viewingItem?.item as Liquidation)?.status.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Created At</Label>
                    <p className="font-medium">
                      {(viewingItem?.item as Liquidation)?.createdAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Last Updated</Label>
                    <p className="font-medium">
                      {(viewingItem?.item as Liquidation)?.updatedAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  {(viewingItem?.item as Liquidation)?.approvedAt && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Approved At</Label>
                      <p className="font-medium">
                        {(viewingItem?.item as Liquidation)?.approvedAt?.toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) || 'N/A'}
                      </p>
                    </div>
                  )}
                  {(viewingItem?.item as Liquidation)?.approvedBy && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Approved By</Label>
                      <p className="font-medium">{(viewingItem?.item as Liquidation)?.approvedBy}</p>
                    </div>
                  )}
                </div>

                {/* Receipts Section */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Receipts</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-left py-3">Name</TableHead>
                          <TableHead className="text-right py-3">Amount</TableHead>
                          <TableHead className="text-left py-3">Date</TableHead>
                          <TableHead className="text-left py-3">Description</TableHead>
                          <TableHead className="text-center py-3">File</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(viewingItem?.item as Liquidation)?.receipts?.map((receipt: Receipt, index: number) => (
                          <TableRow key={`${(viewingItem?.item as Liquidation)?.id}-${index}`} className="border-b last:border-b-0">
                            <TableCell className="py-3 font-medium">{receipt.name}</TableCell>
                            <TableCell className="py-3 text-right">K{receipt.amount.toFixed(2)}</TableCell>
                            <TableCell className="py-3">
                              {receipt.date instanceof Date 
                                ? receipt.date.toLocaleDateString('en-GB') 
                                : new Date(receipt.date).toLocaleDateString('en-GB')}
                            </TableCell>
                            <TableCell className="py-3">{receipt.description}</TableCell>
                            <TableCell className="py-3 text-center">
                              {receipt.fileUrl && receipt.fileUrl.trim() !== '' ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className='cursor-pointer'
                                    onClick={() => handleViewReceipt(receipt.fileUrl, receipt.name)}
                                  >
                                    {receipt.fileUrl && typeof receipt.fileUrl === 'string' && receipt.fileUrl.match && receipt.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                      <ImageIcon className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-blue-600" />
                                    )}
                                  </Button>
                                  <a 
                                    href={encodeUrlPath(toAbsoluteUrl(receipt.fileUrl))} 
                                    download={receipt.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cursor-pointer p-2 rounded hover:bg-muted"
                                  >
                                    <Download className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No file</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setIsViewDialogOpen(false)} className="cursor-pointer">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Viewer */}
      {viewingReceipt && (
        <ReceiptViewer
          fileUrl={viewingReceipt.fileUrl}
          fileName={viewingReceipt.fileName}
          fileType={viewingReceipt.fileType}
          isOpen={viewingReceipt.isOpen}
          onClose={closeReceiptViewer}
        />
      )}
    </div>
  )
}